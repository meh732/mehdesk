// Real-time WebRTC Peer Connection & Signaling Client for meh desk
export interface SignalingMessage {
  type: string;
  [key: string]: any;
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
  private onConnectionStatusCallback: ((status: string, details?: any) => void) | null = null;
  private onIncomingRequestCallback: ((request: any) => void) | null = null;
  private localStream: MediaStream | null = null;

  constructor(localId: string) {
    this.localId = localId.replace(/\s+/g, '');
    this.initWebSocket();
  }

  public updateLocalId(newId: string) {
    this.localId = newId.replace(/\s+/g, '');
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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.ws?.send(JSON.stringify({
          type: 'register',
          id: this.localId,
          alias: localStorage.getItem('mehdesk_alias') || `${this.localId}@desk`,
          isHost: this.isHost,
          unattendedPassword: localStorage.getItem('mehdesk_password') || ''
        }));
        this.onConnectionStatusCallback?.('connected_to_signaling');
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleSignalingMessage(msg);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.onConnectionStatusCallback?.('disconnected_from_signaling');
        setTimeout(() => this.initWebSocket(), 3000);
      };

      this.ws.onerror = (err) => {
        console.warn('WS signaling error:', err);
      };
    } catch (err) {
      console.error('WebSocket connection failed:', err);
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
        { urls: 'stun:stun.services.mozilla.com' }
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
      this.dataChannel = event.channel;
      this.setupDataChannelEvents();
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC Connection state changed:', pc.connectionState);
      this.onConnectionStatusCallback?.(pc.connectionState);
    };

    return pc;
  }

  private setupDataChannelEvents() {
    if (!this.dataChannel) return;
    this.dataChannel.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        this.onDataMessageCallback?.(parsed);
      } catch (e) {
        this.onDataMessageCallback?.(event.data);
      }
    };
  }

  private iceCandidatesQueue: RTCIceCandidateInit[] = [];

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
      case 'incoming_connection':
      case 'incoming_connection_request': {
        this.onIncomingRequestCallback?.({
          fromId: msg.fromId || msg.senderId,
          requesterName: msg.fromAlias || msg.requesterName || `Client (${msg.fromId || msg.senderId})`,
          requesterDevice: msg.fromDevice || msg.requesterDevice || 'Remote Client',
          requiresPassword: msg.requiresPassword,
          providedPassword: msg.providedPassword
        });
        break;
      }

      case 'connection_result': {
        if (msg.accepted) {
          this.onConnectionStatusCallback?.('accepted');
          // Start WebRTC negotiation as Viewer
          await this.createOffer();
        } else {
          this.onConnectionStatusCallback?.('rejected', msg.reason || 'درخواست اتصال توسط کاربر رد شد');
        }
        break;
      }

      case 'connect_error': {
        this.onConnectionStatusCallback?.('rejected', msg.message);
        break;
      }

      case 'signal_offer': {
        this.targetId = msg.senderId;
        this.peerConnection = this.createPeerConnection();

        if (this.localStream) {
          this.localStream.getTracks().forEach(track => {
            this.peerConnection?.addTrack(track, this.localStream!);
          });
        }

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.offer));
        await this.flushIceCandidatesQueue();
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.sendSignal({
          type: 'signal_answer',
          targetId: msg.senderId,
          answer: answer
        });
        break;
      }

      case 'signal_answer': {
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

      case 'remote_input':
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
    this.targetId = targetId.replace(/\s+/g, '');
    this.isHost = false;

    this.sendSignal({
      type: 'request_connect',
      fromId: this.localId,
      toId: this.targetId,
      requesterName: localStorage.getItem('mehdesk_alias') || `Client (${this.localId})`,
      requesterDevice: navigator.userAgent.includes('Mobile') ? 'Mobile Web' : 'Desktop Browser',
      providedPassword: password
    });
  }

  public respondToRequest(requesterId: string, accepted: boolean, permissions: any) {
    this.targetId = requesterId;
    this.sendSignal({
      type: 'connect_response',
      hostId: this.localId,
      toId: requesterId,
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
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type: 'remote_input', ...eventData }));
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN && this.targetId) {
      this.sendSignal({
        type: 'remote_input',
        targetId: this.targetId,
        ...eventData
      });
    }
  }

  public sendSignal(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ senderId: this.localId, ...data }));
    }
  }

  public onRemoteStream(cb: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = cb;
  }

  public onDataMessage(cb: (data: any) => void) {
    this.onDataMessageCallback = cb;
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
