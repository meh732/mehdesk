// Real-time WebRTC Peer Connection & Signaling Client for meh desk
export interface SignalingMessage {
  type: string;
  [key: string]: any;
}

export function normalizeDeskId(id: string | null | undefined): string {
  if (!id) return "";
  return id
    .toString()
    .trim()
    .replace(/[\u06F0-\u06F9]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728)) // Persian ۰-۹
    .replace(/[\u0660-\u0669]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584)) // Arabic ٠-٩
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export class WebRtcClient {
  private ws: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localId: string;
  private targetId: string | null = null;
  private isHost: boolean = false;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onDataMessageCallback: ((data: any) => void) | null = null;
  private onRemoteInputCallback: ((input: any) => void) | null = null;
  private onConnectionStatusCallback: ((status: string, details?: any) => void) | null = null;
  private onIncomingRequestCallback: ((request: any) => void) | null = null;
  private onAgentStatusCallback: ((status: { id: string; active: boolean }) => void) | null = null;
  private localStream: MediaStream | null = null;
  private pingTimer: any = null;
  private reconnectTimer: any = null;
  private pendingSignalsQueue: any[] = [];
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];

  constructor(localId: string) {
    this.localId = normalizeDeskId(localId);
    this.initWebSocket();
  }

  public updateLocalId(newId: string) {
    this.localId = normalizeDeskId(newId);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'register',
        id: this.localId,
        alias: localStorage.getItem('mehdesk_alias') || `${this.localId}@desk`,
        isHost: this.isHost
      }));
    }
  }

  private initWebSocket() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      console.log(`[WebRTC] Connecting to signaling server at: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebRTC] Signaling WebSocket open. Registering ID:', this.localId);
        this.ws?.send(JSON.stringify({
          type: 'register',
          id: this.localId,
          alias: localStorage.getItem('mehdesk_alias') || `${this.localId}@desk`,
          isHost: this.isHost,
          unattendedPassword: localStorage.getItem('mehdesk_password') || '',
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screen: `${window.screen.width}x${window.screen.height}`
          }
        }));
        this.onConnectionStatusCallback?.('connected_to_signaling');

        // Flush any pending signals
        while (this.pendingSignalsQueue.length > 0) {
          const item = this.pendingSignalsQueue.shift();
          this.sendSignal(item);
        }

        // Start 10s keepalive ping
        this.pingTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 10000);
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pong') return;
          console.log(`[WebRTC] Received WS message: ${msg.type}`, msg);
          this.handleSignalingMessage(msg);
        } catch (e) {
          console.error('[WebRTC] WS message parse error:', e);
        }
      };

      this.ws.onclose = (ev) => {
        console.warn('[WebRTC] Signaling WebSocket closed code:', ev.code, ev.reason);
        if (this.pingTimer) {
          clearInterval(this.pingTimer);
          this.pingTimer = null;
        }
        this.onConnectionStatusCallback?.('disconnected_from_signaling');
        this.reconnectTimer = setTimeout(() => this.initWebSocket(), 2000);
      };

      this.ws.onerror = (err) => {
        console.warn('[WebRTC] WS signaling socket error:', err);
      };
    } catch (err) {
      console.error('[WebRTC] WebSocket connection setup failed:', err);
    }
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.nextcloud.com:443' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && this.targetId) {
        this.sendSignal({
          type: 'signal_ice',
          targetId: this.targetId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('WebRTC ontrack received:', event);
      if (event.streams && event.streams[0]) {
        this.onRemoteStreamCallback?.(event.streams[0]);
      } else if (event.track) {
        const stream = new MediaStream([event.track]);
        this.onRemoteStreamCallback?.(stream);
      }
    };

    pc.ondatachannel = (event) => {
      console.log('WebRTC ondatachannel received:', event.channel.label);
      this.dataChannel = event.channel;
      this.setupDataChannelEvents();
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC Connection state changed:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        this.onConnectionStatusCallback?.('connected');
      } else if (pc.connectionState === 'failed') {
        console.warn('WebRTC connection failed, attempting ICE restart...');
        try {
          pc.restartIce();
        } catch (e) {
          console.warn('Restart ICE failed:', e);
        }
        this.onConnectionStatusCallback?.('connecting', 'تلاش مجدد جهت عبور از فایروال و اتصال مستقیم...');
      } else if (pc.connectionState === 'disconnected') {
        this.onConnectionStatusCallback?.('connecting', 'اتصال موقتاً قطع شد، در حال اتصال مجدد...');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('WebRTC ICE Connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        try {
          pc.restartIce();
        } catch (e) {
          console.warn('Restart ICE on iceConnectionState failed:', e);
        }
      }
    };

    return pc;
  }

  private setupDataChannelEvents() {
    if (!this.dataChannel) return;
    this.dataChannel.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'remote_input') {
          this.onRemoteInputCallback?.(parsed);
        }
        this.onDataMessageCallback?.(parsed);
      } catch (e) {
        this.onDataMessageCallback?.(event.data);
      }
    };
  }

  private async flushIceCandidatesQueue() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.iceCandidatesQueue.length > 0) {
      const candidate = this.iceCandidatesQueue.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Error adding queued ICE candidate:', e);
        }
      }
    }
  }

  private async handleSignalingMessage(msg: any) {
    switch (msg.type) {
      case 'registered': {
        this.onConnectionStatusCallback?.('registered', msg);
        break;
      }

      case 'incoming_connection':
      case 'incoming_connection_request': {
        console.log('[WebRTC] Dispatching incoming request to UI dialog:', msg);
        this.onIncomingRequestCallback?.({
          fromId: msg.fromId || msg.senderId || msg.rawFromId,
          rawFromId: msg.rawFromId || msg.fromId,
          requesterName: msg.fromAlias || msg.requesterName || `Client (${msg.fromId || msg.senderId})`,
          requesterDevice: msg.fromDevice || msg.requesterDevice || 'Remote Client',
          requiresPassword: msg.requiresPassword,
          providedPassword: msg.providedPassword
        });
        break;
      }

      case 'connection_result': {
        console.log('[WebRTC] Connection result received:', msg);
        if (msg.accepted) {
          this.onConnectionStatusCallback?.('accepted', msg.permissions);
          // Start WebRTC negotiation as Viewer
          await this.createOffer();
        } else {
          this.onConnectionStatusCallback?.('rejected', msg.reason || 'درخواست اتصال توسط کاربر مقصد رد شد');
        }
        break;
      }

      case 'connect_error': {
        console.warn('[WebRTC] Connection error from server:', msg.message);
        this.onConnectionStatusCallback?.('error', msg.message);
        break;
      }

      case 'agent_status': {
        this.onAgentStatusCallback?.({
          id: msg.id,
          active: !!msg.active
        });
        break;
      }

      case 'signal_offer': {
        console.log('[WebRTC] Received offer from host/peer:', msg.senderId);
        this.targetId = normalizeDeskId(msg.senderId);
        if (!this.peerConnection || this.peerConnection.connectionState === 'closed') {
          this.peerConnection = this.createPeerConnection();
        }

        if (this.localStream) {
          const senders = this.peerConnection.getSenders();
          this.localStream.getTracks().forEach(track => {
            const sender = senders.find(s => s.track?.kind === track.kind);
            if (sender) {
              sender.replaceTrack(track);
            } else {
              this.peerConnection?.addTrack(track, this.localStream!);
            }
          });
        }

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.offer));
        await this.flushIceCandidatesQueue();
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.sendSignal({
          type: 'signal_answer',
          targetId: this.targetId,
          answer: answer
        });
        break;
      }

      case 'signal_answer': {
        console.log('[WebRTC] Received answer from peer');
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.answer));
          await this.flushIceCandidatesQueue();
        }
        break;
      }

      case 'signal_ice': {
        if (msg.candidate) {
          if (this.peerConnection && this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch (e) {
              console.warn('Error adding ICE candidate:', e);
            }
          } else {
            this.iceCandidatesQueue.push(msg.candidate);
          }
        }
        break;
      }

      case 'remote_input': {
        this.onRemoteInputCallback?.(msg);
        this.onDataMessageCallback?.(msg);
        break;
      }

      case 'clipboard_sync':
      case 'file_meta':
      case 'file_chunk':
      case 'chat_message': {
        this.onDataMessageCallback?.(msg);
        break;
      }
    }
  }

  public async connectToHost(targetId: string, password?: string) {
    this.targetId = normalizeDeskId(targetId);
    this.isHost = false;

    console.log(`[WebRTC] Sending connection request to target: ${this.targetId}`);
    this.sendSignal({
      type: 'connect_request',
      fromId: this.localId,
      toId: this.targetId,
      targetId: this.targetId,
      requesterName: localStorage.getItem('mehdesk_alias') || `Client (${this.localId})`,
      requesterDevice: navigator.userAgent.includes('Mobile') ? 'Mobile Web' : 'Desktop Browser',
      providedPassword: password
    });
  }

  public respondToRequest(requesterId: string, accepted: boolean, permissions?: any) {
    const cleanRequester = normalizeDeskId(requesterId);
    this.targetId = cleanRequester;
    console.log(`[WebRTC] Responding to request from ${cleanRequester}: accepted=${accepted}`);
    this.sendSignal({
      type: 'connect_response',
      hostId: this.localId,
      toId: cleanRequester,
      targetId: cleanRequester,
      accepted,
      permissions
    });
  }

  public async setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    this.isHost = !!stream;

    if (this.peerConnection && stream) {
      const senders = this.peerConnection.getSenders();
      stream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          this.peerConnection?.addTrack(track, stream);
        }
      });

      // If already connected or negotiation needed, send updated offer
      if (this.targetId && this.peerConnection.signalingState === 'stable') {
        try {
          const offer = await this.peerConnection.createOffer();
          await this.peerConnection.setLocalDescription(offer);
          this.sendSignal({
            type: 'signal_offer',
            targetId: this.targetId,
            offer: offer
          });
        } catch (err) {
          console.warn('[WebRTC] Renegotiation offer failed:', err);
        }
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'register',
        id: this.localId,
        alias: localStorage.getItem('mehdesk_alias') || `${this.localId}@desk`,
        isHost: this.isHost
      }));
    }
  }

  private async createOffer() {
    this.peerConnection = this.createPeerConnection();
    
    // Add transceivers for receiving video and audio
    try {
      this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
      this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });
    } catch (e) {
      console.warn('Transceiver setup fallback:', e);
    }

    // Create DataChannel
    this.dataChannel = this.peerConnection.createDataChannel('mehdesk_data', { ordered: true });
    this.setupDataChannelEvents();

    const offer = await this.peerConnection.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true
    });
    await this.peerConnection.setLocalDescription(offer);

    this.sendSignal({
      type: 'signal_offer',
      targetId: this.targetId,
      offer: offer
    });
  }

  public sendInputEvent(eventData: any) {
    const payload = { type: 'remote_input', ...eventData };
    // Send via DataChannel for low-latency browser-side cursor rendering
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(payload));
      } catch (e) {
        // DataChannel send error fallback
      }
    }
    // Also send via WebSocket signaling so server forwards to Native OS Input Agent (PowerShell / Linux)
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.targetId) {
      this.sendSignal({
        targetId: this.targetId,
        ...payload
      });
    }
  }

  public onAgentStatus(cb: (status: { id: string; active: boolean }) => void) {
    this.onAgentStatusCallback = cb;
  }

  public queryAgentStatus(targetHostId?: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'agent_status_query',
        id: normalizeDeskId(targetHostId || this.localId)
      }));
    }
  }

  public sendSignal(data: any) {
    const packet = { senderId: this.localId, ...data };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(packet));
    } else {
      console.log('[WebRTC] Queueing signal while socket connecting:', data.type);
      this.pendingSignalsQueue.push(packet);
    }
  }

  public onRemoteStream(cb: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = cb;
  }

  public onDataMessage(cb: (data: any) => void) {
    this.onDataMessageCallback = cb;
  }

  public onRemoteInput(cb: (input: any) => void) {
    this.onRemoteInputCallback = cb;
  }

  public onConnectionStatus(cb: (status: string, details?: any) => void) {
    this.onConnectionStatusCallback = cb;
  }

  public onIncomingRequest(cb: (request: any) => void) {
    this.onIncomingRequestCallback = cb;
  }

  public disconnect() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    this.targetId = null;
  }
}
