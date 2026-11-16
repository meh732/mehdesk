// Real-time WebRTC Peer Connection, DataChannel & Signaling Client for meh desk
import { apiUrl, getWebSocketUrl, isTauriRuntime, invokeTauri } from './serverConfig';

export interface SignalingMessage {
  type: string;
  [key: string]: any;
}

export interface RealSessionStats {
  fps: number;
  latencyMs: number;
  bitrateKbps: number;
  packetLoss: number;
  codec: string;
  resolution: string;
}

export function normalizeDeskId(id: string | null | undefined): string {
  if (!id) return '';
  return id
    .toString()
    .trim()
    .replace(/[\u06F0-\u06F9]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
    .replace(/[\u0660-\u0669]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584))
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

export class WebRtcClient {
  private ws: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localId: string;
  private targetId: string | null = null;
  private isHost: boolean = false;
  private localStream: MediaStream | null = null;
  private remoteMediaStream: MediaStream | null = null;
  private activeMode: 'desktop' | 'file' | 'terminal' = 'desktop';

  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onDataMessageCallback: ((data: any) => void) | null = null;
  private onRemoteInputCallback: ((input: any) => void) | null = null;
  private onConnectionStatusCallback: ((status: string, details?: any) => void) | null = null;
  private onIncomingRequestCallback: ((request: any) => void) | null = null;
  private onPasswordRequiredCallback: ((info: { targetId: string; alias?: string; mode?: string }) => void) | null = null;
  private onSessionEndCallback: ((info: { senderId?: string; reason?: string }) => void) | null = null;
  private onAgentStatusCallback: ((status: { id: string; active: boolean }) => void) | null = null;

  private pingTimer: any = null;
  private reconnectTimer: any = null;
  private pendingSignalsQueue: any[] = [];
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];
  private cachedIceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ];
  private prevBytesReceived = 0;
  private prevStatsTimestamp = 0;
  private destroyed = false;
  private inputSeq = 0;
  private seenInputKeys: string[] = [];

  constructor(localId: string) {
    this.localId = normalizeDeskId(localId);
    this.loadIceServers();
    this.initWebSocket();
  }

  private async loadIceServers() {
    try {
      const url = apiUrl('/api/ice-servers');
      if (!url.startsWith('http') && isTauriRuntime()) return;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
          this.cachedIceServers = data.iceServers;
        }
      }
    } catch {
      // keep default STUN servers
    }
  }

  public getTargetId(): string | null {
    return this.targetId;
  }

  public isDataChannelOpen(): boolean {
    return Boolean(this.dataChannel && this.dataChannel.readyState === 'open');
  }

  public isSignalingConnected(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  public reconnectServer() {
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.loadIceServers();
    this.initWebSocket();
  }

  public async sendRegistration() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    let deviceInfo: any = {
      os: navigator.platform || 'Web',
      name: localStorage.getItem('mehdesk_alias') || `${this.localId}@desk`,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      userAgent: navigator.userAgent
    };

    if (isTauriRuntime()) {
      try {
        const sys = await invokeTauri<any>('get_system_info');
        if (sys) {
          deviceInfo = {
            os: sys.os,
            name: sys.hostname,
            screenResolution: `${sys.screen_width}x${sys.screen_height}`
          };
        }
      } catch {
        // fallback to browser navigator
      }
    }

    this.ws.send(
      JSON.stringify({
        type: 'register',
        id: this.localId,
        alias: localStorage.getItem('mehdesk_alias') || `${this.localId}@desk`,
        isHost: this.isHost,
        isTauri: isTauriRuntime(),
        hasStream: !!this.localStream,
        unattendedPassword: localStorage.getItem('mehdesk_password') || '',
        deviceInfo
      })
    );
  }

  public updateLocalId(newId: string) {
    this.localId = normalizeDeskId(newId);
    this.sendRegistration();
  }

  private initWebSocket() {
    if (this.destroyed) return;
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const wsUrl = getWebSocketUrl();
    if (!wsUrl) {
      this.onConnectionStatusCallback?.('server_url_required');
      return;
    }

    try {
      this.onConnectionStatusCallback?.('connecting_to_signaling');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        await this.sendRegistration();
        this.onConnectionStatusCallback?.('connected_to_signaling');

        while (this.pendingSignalsQueue.length > 0) {
          const item = this.pendingSignalsQueue.shift();
          this.sendSignal(item);
        }

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
          await this.handleSignalingMessage(msg);
        } catch (e) {
          console.error('[WebRTC] WS message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        if (this.pingTimer) {
          clearInterval(this.pingTimer);
          this.pingTimer = null;
        }
        this.onConnectionStatusCallback?.('disconnected_from_signaling');
        if (!this.destroyed) {
          this.reconnectTimer = setTimeout(() => this.initWebSocket(), 2500);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WebRTC] WS signaling socket error:', err);
      };
    } catch (err) {
      console.error('[WebRTC] WebSocket connection setup failed:', err);
      this.onConnectionStatusCallback?.('disconnected_from_signaling');
    }
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: this.cachedIceServers
    });

    this.remoteMediaStream = new MediaStream();

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
      if (event.streams && event.streams[0]) {
        this.remoteMediaStream = event.streams[0];
        this.onRemoteStreamCallback?.(event.streams[0]);
      } else if (event.track) {
        if (!this.remoteMediaStream) {
          this.remoteMediaStream = new MediaStream();
        }
        const alreadyHas = this.remoteMediaStream.getTracks().some((t) => t.id === event.track.id);
        if (!alreadyHas) {
          this.remoteMediaStream.addTrack(event.track);
        }
        this.onRemoteStreamCallback?.(this.remoteMediaStream);
      }
    };

    pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannelEvents();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.onConnectionStatusCallback?.('connected');
      } else if (pc.connectionState === 'failed') {
        try {
          pc.restartIce();
        } catch {
          // ignore
        }
        this.onConnectionStatusCallback?.('connecting', 'تلاش مجدد جهت اتصال مستقیم P2P...');
      } else if (pc.connectionState === 'disconnected') {
        this.onConnectionStatusCallback?.('connecting', 'اتصال موقتاً ناپایدار شد، در حال بازیابی...');
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        try {
          pc.restartIce();
        } catch {
          // ignore
        }
      }
    };

    return pc;
  }

  private setupDataChannelEvents() {
    if (!this.dataChannel) return;
    this.dataChannel.bufferedAmountLowThreshold = 256 * 1024;
    this.dataChannel.onopen = () => {
      this.onConnectionStatusCallback?.('datachannel_open');
    };
    this.dataChannel.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'remote_input') {
          this.dispatchRemoteInput(parsed);
        }
        this.onDataMessageCallback?.(parsed);
      } catch {
        this.onDataMessageCallback?.(event.data);
      }
    };
  }

  private dispatchRemoteInput(msg: any) {
    if (msg && msg._seq != null) {
      const key = `${msg.senderId || ''}:${msg._seq}`;
      if (this.seenInputKeys.includes(key)) {
        return;
      }
      this.seenInputKeys.push(key);
      if (this.seenInputKeys.length > 200) {
        this.seenInputKeys.shift();
      }
    }
    this.onRemoteInputCallback?.(msg);
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
        this.onIncomingRequestCallback?.({
          fromId: msg.fromId || msg.senderId || msg.rawFromId,
          rawFromId: msg.rawFromId || msg.fromId,
          requesterName: msg.fromAlias || msg.requesterName || `Client (${msg.fromId || msg.senderId})`,
          requesterDevice: msg.fromDevice || msg.requesterDevice || 'Remote Client',
          mode: msg.mode || 'desktop',
          requiresPassword: !!msg.requiresPassword,
          unattendedAuthorized: !!msg.unattendedAuthorized,
          providedPassword: msg.providedPassword
        });
        break;
      }

      case 'password_required': {
        this.onPasswordRequiredCallback?.({
          targetId: msg.targetId,
          alias: msg.alias,
          mode: msg.mode
        });
        break;
      }

      case 'connection_result': {
        if (msg.accepted) {
          this.targetId = normalizeDeskId(msg.hostId || this.targetId);
          this.activeMode = msg.mode || this.activeMode;
          this.onConnectionStatusCallback?.('accepted', {
            permissions: msg.permissions,
            mode: msg.mode || 'desktop',
            hostIsTauri: !!msg.hostIsTauri
          });
          await this.createOffer(msg.mode || 'desktop');
        } else {
          this.onConnectionStatusCallback?.('rejected', msg.reason || 'درخواست اتصال توسط کاربر مقصد رد شد.');
        }
        break;
      }

      case 'connect_error': {
        this.onConnectionStatusCallback?.('error', msg.message);
        break;
      }

      case 'session_end':
      case 'viewer_disconnected': {
        if (this.peerConnection) {
          this.peerConnection.close();
          this.peerConnection = null;
        }
        if (this.dataChannel) {
          this.dataChannel.close();
          this.dataChannel = null;
        }
        this.onSessionEndCallback?.({
          senderId: msg.senderId || msg.viewerId,
          reason: msg.reason || 'disconnected'
        });
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
        this.targetId = normalizeDeskId(msg.senderId);
        if (!this.peerConnection || this.peerConnection.connectionState === 'closed') {
          this.peerConnection = this.createPeerConnection();
        }

        if (this.localStream) {
          const senders = this.peerConnection.getSenders();
          this.localStream.getTracks().forEach((track) => {
            const sender = senders.find((s) => s.track?.kind === track.kind);
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
          answer
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

      case 'remote_input': {
        this.dispatchRemoteInput(msg);
        this.onDataMessageCallback?.(msg);
        break;
      }

      case 'clipboard_sync':
      case 'file_list_request':
      case 'file_list_response':
      case 'file_download_request':
      case 'file_meta':
      case 'file_chunk':
      case 'file_complete':
      case 'file_cancel':
      case 'terminal_exec':
      case 'terminal_output':
      case 'whiteboard_draw':
      case 'chat_message':
      case 'session_control': {
        this.onDataMessageCallback?.(msg);
        break;
      }
    }
  }

  public async connectToHost(
    targetId: string,
    password?: string,
    mode: 'desktop' | 'file' | 'terminal' = 'desktop',
    manualApproval?: boolean
  ) {
    this.targetId = normalizeDeskId(targetId);
    this.isHost = false;
    this.activeMode = mode;

    this.sendSignal({
      type: 'connect_request',
      fromId: this.localId,
      toId: this.targetId,
      targetId: this.targetId,
      mode,
      requesterName: localStorage.getItem('mehdesk_alias') || `Client (${this.localId})`,
      requesterDevice: isTauriRuntime()
        ? 'MehDesk Desktop App'
        : /Mobi|Android|iPhone/i.test(navigator.userAgent)
        ? 'Mobile Web'
        : 'Desktop Browser',
      providedPassword: password,
      manualApproval: !!manualApproval
    });
  }

  public respondToRequest(
    requesterId: string,
    accepted: boolean,
    permissions?: any,
    mode: 'desktop' | 'file' | 'terminal' = 'desktop',
    reason?: string
  ) {
    const cleanRequester = normalizeDeskId(requesterId);
    if (accepted) {
      this.targetId = cleanRequester;
    }
    this.sendSignal({
      type: 'connect_response',
      hostId: this.localId,
      toId: cleanRequester,
      targetId: cleanRequester,
      accepted,
      permissions,
      mode,
      reason
    });
  }

  public async setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    this.isHost = !!stream;

    if (this.peerConnection && stream) {
      const senders = this.peerConnection.getSenders();
      stream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          this.peerConnection?.addTrack(track, stream);
        }
      });

      if (this.targetId && this.peerConnection.signalingState === 'stable') {
        try {
          const offer = await this.peerConnection.createOffer();
          await this.peerConnection.setLocalDescription(offer);
          this.sendSignal({
            type: 'signal_offer',
            targetId: this.targetId,
            offer
          });
        } catch (err) {
          console.warn('[WebRTC] Renegotiation offer failed:', err);
        }
      }
    }

    await this.sendRegistration();
  }

  private async createOffer(mode: 'desktop' | 'file' | 'terminal' = 'desktop') {
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {
        // ignore
      }
    }
    this.iceCandidatesQueue = [];
    this.peerConnection = this.createPeerConnection();

    if (mode === 'desktop') {
      try {
        this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
        this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });
      } catch (e) {
        console.warn('Transceiver setup fallback:', e);
      }
    }

    this.dataChannel = this.peerConnection.createDataChannel('mehdesk_data', { ordered: true });
    this.setupDataChannelEvents();

    const offer = await this.peerConnection.createOffer({
      offerToReceiveVideo: mode === 'desktop',
      offerToReceiveAudio: mode === 'desktop'
    });
    await this.peerConnection.setLocalDescription(offer);

    this.sendSignal({
      type: 'signal_offer',
      targetId: this.targetId,
      offer
    });
  }

  // Unified P2P DataChannel with automatic WebSocket signaling fallback
  public sendPeerMessage(payload: Record<string, any>, targetOverride?: string): boolean {
    const dest = normalizeDeskId(targetOverride || this.targetId || '');
    const packet = { ...payload, senderId: this.localId, targetId: dest };

    if (this.dataChannel && this.dataChannel.readyState === 'open' && (!targetOverride || dest === this.targetId)) {
      try {
        this.dataChannel.send(JSON.stringify(packet));
        return true;
      } catch {
        // fallback to WS below
      }
    }

    if (dest && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSignal(packet);
      return true;
    }
    return false;
  }

  // Wait for DataChannel buffer drain when streaming large files
  public async sendPeerMessageWithBackpressure(payload: Record<string, any>, targetOverride?: string): Promise<boolean> {
    if (this.dataChannel && this.dataChannel.readyState === 'open' && (!targetOverride || normalizeDeskId(targetOverride) === this.targetId)) {
      const MAX_BUFFER = 512 * 1024;
      if (this.dataChannel.bufferedAmount > MAX_BUFFER) {
        await new Promise<void>((resolve) => {
          const dc = this.dataChannel;
          if (!dc || dc.readyState !== 'open') {
            resolve();
            return;
          }
          const onLow = () => {
            dc.removeEventListener('bufferedamountlow', onLow);
            resolve();
          };
          dc.addEventListener('bufferedamountlow', onLow);
          setTimeout(() => {
            dc.removeEventListener('bufferedamountlow', onLow);
            resolve();
          }, 500);
        });
      }
    }
    return this.sendPeerMessage(payload, targetOverride);
  }

  public sendInputEvent(eventData: any) {
    const seq = ++this.inputSeq;
    const payload = { type: 'remote_input', _seq: seq, senderId: this.localId, ...eventData };
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(payload));
      } catch {
        // ignore
      }
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.targetId) {
      this.sendSignal({
        targetId: this.targetId,
        ...payload
      });
    }
  }

  public async getRealStats(): Promise<RealSessionStats | null> {
    if (!this.peerConnection) return null;
    try {
      const report = await this.peerConnection.getStats();
      let fps = 0;
      let width = 0;
      let height = 0;
      let packetsLost = 0;
      let bytesReceived = 0;
      let rttMs = 0;
      let codecName = 'WebRTC VP8/H264';

      report.forEach((stat: any) => {
        if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
          fps = Math.round(stat.framesPerSecond || 0);
          width = stat.frameWidth || 0;
          height = stat.frameHeight || 0;
          packetsLost = stat.packetsLost || 0;
          bytesReceived = stat.bytesReceived || 0;
        }
        if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.currentRoundTripTime) {
          rttMs = Math.round(stat.currentRoundTripTime * 1000);
        }
        if (stat.type === 'codec' && stat.mimeType && stat.mimeType.startsWith('video/')) {
          codecName = stat.mimeType.replace('video/', '').toUpperCase();
        }
      });

      const now = Date.now();
      let bitrateKbps = 0;
      if (this.prevStatsTimestamp > 0 && bytesReceived >= this.prevBytesReceived) {
        const dt = (now - this.prevStatsTimestamp) / 1000;
        if (dt > 0) {
          bitrateKbps = Math.round(((bytesReceived - this.prevBytesReceived) * 8) / dt / 1000);
        }
      }
      this.prevBytesReceived = bytesReceived;
      this.prevStatsTimestamp = now;

      return {
        fps,
        latencyMs: rttMs,
        bitrateKbps,
        packetLoss: packetsLost,
        codec: codecName,
        resolution: width > 0 && height > 0 ? `${width}x${height}` : '-'
      };
    } catch {
      return null;
    }
  }

  public onAgentStatus(cb: (status: { id: string; active: boolean }) => void) {
    this.onAgentStatusCallback = cb;
  }

  public queryAgentStatus(targetHostId?: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'agent_status_query',
          id: normalizeDeskId(targetHostId || this.localId)
        })
      );
    }
  }

  public sendSignal(data: any) {
    const packet = { senderId: this.localId, ...data };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(packet));
    } else {
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

  public onPasswordRequired(cb: (info: { targetId: string; alias?: string; mode?: string }) => void) {
    this.onPasswordRequiredCallback = cb;
  }

  public onSessionEnd(cb: (info: { senderId?: string; reason?: string }) => void) {
    this.onSessionEndCallback = cb;
  }

  public endSession(notifyPeer: boolean = true) {
    if (notifyPeer && this.targetId) {
      this.sendSignal({
        type: 'session_end',
        targetId: this.targetId,
        reason: 'user_disconnected'
      });
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    this.remoteMediaStream = null;
    this.targetId = null;
    this.iceCandidatesQueue = [];
  }

  public disconnect() {
    this.destroyed = true;
    this.endSession(true);
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}
