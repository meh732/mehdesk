import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { AnyDeskDashboard } from './components/AnyDeskDashboard';
import { RemoteViewer } from './components/RemoteViewer';
import { FileManager } from './components/FileManager';
import { RemoteTerminal, TerminalLogEntry } from './components/RemoteTerminal';
import { HostBroadcaster } from './components/HostBroadcaster';
import { QrPairModal } from './components/QrPairModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';
import { DeploymentManagerModal } from './components/DeploymentManagerModal';
import { IncomingConnectionDialog, IncomingRequestData } from './components/IncomingConnectionDialog';
import { Device, SessionPermissions, RemoteFile, FileTransferProgress, ChatMessage } from './types';
import { INITIAL_COMPANY_DEVICES } from './utils/mockDevices';
import { WebRtcClient, normalizeDeskId } from './utils/webrtc';
import {
  isTauriRuntime,
  invokeTauri,
  getServerBaseUrl,
  TauriShellResult
} from './utils/serverConfig';
import {
  LocalFileEntry,
  IncomingTransferBuffer,
  sendBrowserFileToPeer,
  sendTauriFileToPeer,
  base64ToUint8Array,
  formatTransferSpeed,
  triggerBrowserDownload
} from './utils/fileTransfer';

type ActiveTab = 'dashboard' | 'devices' | 'host' | 'terminal' | 'file-manager' | 'session';
type ConnectionMode = 'desktop' | 'file' | 'terminal';

function generateRandomDeskId(): string {
  const p1 = Math.floor(100 + Math.random() * 900);
  const p2 = Math.floor(100 + Math.random() * 900);
  const p3 = Math.floor(100 + Math.random() * 900);
  return `${p1} ${p2} ${p3}`;
}

export default function App() {
  // Persistent Desk ID for Tauri/PWA standalone apps; per-tab sessionStorage in standard browsers for multi-tab testing
  const [localId] = useState<string>(() => {
    const isStandalone =
      typeof window !== 'undefined' &&
      (isTauriRuntime() || window.matchMedia?.('(display-mode: standalone)').matches);

    if (isStandalone) {
      const saved = localStorage.getItem('mehdesk_local_id');
      if (saved) return saved;
      const newId = generateRandomDeskId();
      localStorage.setItem('mehdesk_local_id', newId);
      return newId;
    }

    const sessionSaved = sessionStorage.getItem('mehdesk_local_id');
    if (sessionSaved) return sessionSaved;
    const newId = generateRandomDeskId();
    sessionStorage.setItem('mehdesk_local_id', newId);
    return newId;
  });

  const [alias, setAlias] = useState<string>(() => {
    return localStorage.getItem('mehdesk_alias') || `desk-${Math.floor(1000 + Math.random() * 9000)}@desk`;
  });

  const [unattendedPassword, setUnattendedPassword] = useState<string>(() => {
    return localStorage.getItem('mehdesk_password') || '';
  });

  const [isRtl, setIsRtl] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [devices, setDevices] = useState<Device[]>(() => {
    const saved = localStorage.getItem('mehdesk_saved_devices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_COMPANY_DEVICES;
      }
    }
    return INITIAL_COMPANY_DEVICES;
  });

  const [activeDevice, setActiveDevice] = useState<Device | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<IncomingRequestData | null>(null);
  const rtcRef = useRef<WebRtcClient | null>(null);

  // Host Screen Share & Live State
  const [hostStream, setHostStream] = useState<MediaStream | null>(null);
  const [isHosting, setIsHosting] = useState<boolean>(false);
  const [connectedGuests, setConnectedGuests] = useState<
    Array<{ id: string; name: string; device: string; connectedAt: string }>
  >([]);
  const [nativeAgentActive, setNativeAgentActive] = useState<boolean>(() => isTauriRuntime());

  const [permissions, setPermissions] = useState<SessionPermissions>({
    allowMouseKeyboard: true,
    allowClipboard: true,
    allowAudio: true,
    allowFileTransfer: true,
    allowTerminal: true,
    allowRecording: true,
    allowRestart: true,
    allowWhiteboard: true,
    allowPrivacyScreen: true
  });
  const [grantedPermissions, setGrantedPermissions] = useState<SessionPermissions | undefined>(undefined);

  const [signalingStatus, setSignalingStatus] = useState<
    'connected' | 'connecting' | 'disconnected' | 'server_url_required'
  >('connecting');
  const [sessionStatus, setSessionStatus] = useState<string>('idle');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [remoteCursor, setRemoteCursor] = useState<{ x: number; y: number; click?: string } | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Chat & Clipboard state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [incomingClipboard, setIncomingClipboard] = useState<string | null>(null);

  // Real File Transfer State
  const [localFiles, setLocalFiles] = useState<LocalFileEntry[]>([]);
  const [remoteFiles, setRemoteFiles] = useState<RemoteFile[]>([]);
  const [remotePath, setRemotePath] = useState<string>('');
  const [remoteIsTauri, setRemoteIsTauri] = useState<boolean>(false);
  const [remoteLoading, setRemoteLoading] = useState<boolean>(false);
  const [transfers, setTransfers] = useState<FileTransferProgress[]>([]);
  const [activeTransfer, setActiveTransfer] = useState<FileTransferProgress | null>(null);

  // Real Terminal State
  const [terminalHistory, setTerminalHistory] = useState<TerminalLogEntry[]>([]);
  const [terminalExecuting, setTerminalExecuting] = useState<boolean>(false);

  // Modals
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);

  // Unattended Password Prompt Modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingDevice, setPendingDevice] = useState<Device | null>(null);
  const [pendingMode, setPendingMode] = useState<ConnectionMode>('desktop');
  const [inputPassword, setInputPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Refs to avoid stale closures inside persistent WebRtcClient callbacks
  const permissionsRef = useRef(permissions);
  permissionsRef.current = permissions;

  const hostStreamRef = useRef(hostStream);
  hostStreamRef.current = hostStream;

  const activeDeviceRef = useRef(activeDevice);
  activeDeviceRef.current = activeDevice;

  const activeModeRef = useRef<ConnectionMode>('desktop');
  const localFilesRef = useRef(localFiles);
  localFilesRef.current = localFiles;

  const isRtlRef = useRef(isRtl);
  isRtlRef.current = isRtl;

  const passwordModalOpenRef = useRef(passwordModalOpen);
  passwordModalOpenRef.current = passwordModalOpen;

  const pendingDeviceRef = useRef(pendingDevice);
  pendingDeviceRef.current = pendingDevice;

  const incomingTransfersRef = useRef<Map<string, IncomingTransferBuffer>>(new Map());
  const urlConnectHandledRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastNotice(msg);
    setTimeout(() => {
      setToastNotice((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  const upsertTransfer = useCallback((prog: FileTransferProgress) => {
    setTransfers((prev) => {
      const idx = prev.findIndex((t) => t.id === prog.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = prog;
        return next;
      }
      return [prog, ...prev].slice(0, 40);
    });
    if (prog.status === 'in_progress') {
      setActiveTransfer(prog);
    } else {
      setActiveTransfer((curr) => (curr?.id === prog.id ? null : curr));
    }
  }, []);

  const playIncomingChimeAlert = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.25, now + start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur);
      };
      playTone(659.25, 0, 0.22);
      playTone(880.0, 0.25, 0.4);
    } catch {
      // ignore autoplay audio restrictions
    }
  }, []);

  const handleStopHosting = useCallback(() => {
    if (hostStreamRef.current) {
      hostStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setHostStream(null);
    setIsHosting(false);
    if (rtcRef.current) {
      rtcRef.current.setLocalStream(null);
    }
  }, []);

  const handleStartHosting = useCallback(
    async (includeAudio: boolean = true): Promise<MediaStream | null> => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'monitor',
              frameRate: { ideal: 60, max: 60 }
            } as any,
            audio: includeAudio
          });

          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              handleStopHosting();
            };
          }

          setHostStream(stream);
          setIsHosting(true);
          if (rtcRef.current) {
            await rtcRef.current.setLocalStream(stream);
          }
          setActiveTab('host');
          return stream;
        }
        return null;
      } catch (err) {
        console.warn('Screen share cancelled or blocked:', err);
        return null;
      }
    },
    [handleStopHosting]
  );

  // Add browser files into staging list
  const handleAddLocalFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;

      const entries: LocalFileEntry[] = incoming.map((f) => ({
        name: f.name,
        path: `browser://${Date.now()}-${f.name}`,
        size: f.size,
        isDir: false,
        modified: new Date(f.lastModified).toLocaleTimeString(isRtlRef.current ? 'fa-IR' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        type: 'file',
        extension: f.name.split('.').pop()?.toLowerCase() || '',
        browserFile: f
      }));

      setLocalFiles((prev) => [...entries, ...prev]);
    },
    []
  );

  // Fetch remote directory listing from peer
  const handleRequestRemoteList = useCallback((dirPath?: string) => {
    const rtc = rtcRef.current;
    const targetId = rtc?.getTargetId() || activeDeviceRef.current?.id;
    if (!rtc || !targetId) return;
    setRemoteLoading(true);
    rtc.sendPeerMessage(
      {
        type: 'file_list_request',
        path: dirPath ?? ''
      },
      targetId
    );
  }, []);

  // Upload a local file (browser File or Tauri OS path) to active remote peer
  const handleUploadFile = useCallback(
    async (entry: LocalFileEntry) => {
      const rtc = rtcRef.current;
      const targetId = rtc?.getTargetId() || activeDeviceRef.current?.id;
      if (!rtc || !targetId || entry.isDir) return;

      if (entry.browserFile) {
        await sendBrowserFileToPeer(rtc, entry.browserFile, targetId, upsertTransfer);
      } else if (isTauriRuntime() && entry.path && !entry.path.startsWith('browser://')) {
        await sendTauriFileToPeer(rtc, entry.path, entry.name, entry.size, targetId, upsertTransfer);
      } else {
        showToast(
          isRtlRef.current
            ? 'این فایل از حالت مرورگر قابل خواندن مجدد نیست؛ لطفاً فایل را مجدداً انتخاب کنید.'
            : 'Please re-pick this file from browser storage.'
        );
      }
    },
    [upsertTransfer, showToast]
  );

  // Request a remote file download from peer
  const handleDownloadRemoteFile = useCallback((file: RemoteFile) => {
    const rtc = rtcRef.current;
    const targetId = rtc?.getTargetId() || activeDeviceRef.current?.id;
    if (!rtc || !targetId || file.isDir) return;
    rtc.sendPeerMessage(
      {
        type: 'file_download_request',
        path: file.path,
        fileName: file.name
      },
      targetId
    );
  }, []);

  // Execute real shell command on remote peer (via WS so both Tauri and Browser+PS1 agent receive it)
  const handleExecuteTerminalCommand = useCallback(
    (command: string) => {
      const rtc = rtcRef.current;
      const targetId = rtc?.getTargetId() || activeDeviceRef.current?.id;
      const ts = new Date().toLocaleTimeString(isRtlRef.current ? 'fa-IR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      setTerminalHistory((prev) => [
        ...prev,
        { id: `in-${Date.now()}`, type: 'input', text: command, timestamp: ts }
      ]);

      if (!rtc || !targetId) {
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            type: 'error',
            text: isRtlRef.current
              ? 'خطا: ارتباط فعالی با سیستم مقصد برقرار نیست.'
              : 'Error: No active connection to remote peer.',
            timestamp: ts
          }
        ]);
        return;
      }

      setTerminalExecuting(true);
      const requestId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      rtc.sendSignal({
        type: 'terminal_exec',
        targetId,
        requestId,
        command
      });
    },
    []
  );

  // Initialize persistent WebRtcClient once per localId
  useEffect(() => {
    const rtc = new WebRtcClient(localId);
    rtcRef.current = rtc;

    rtc.onConnectionStatus((status, details) => {
      if (status === 'server_url_required') {
        setSignalingStatus('server_url_required');
        if (isTauriRuntime() && !getServerBaseUrl()) {
          setSettingsModalOpen(true);
        }
      } else if (status === 'connecting_to_signaling') {
        setSignalingStatus('connecting');
      } else if (status === 'connected_to_signaling') {
        setSignalingStatus('connected');
        rtc.queryAgentStatus(localId);
      } else if (status === 'disconnected_from_signaling') {
        setSignalingStatus('disconnected');
      } else if (status === 'registered') {
        setSignalingStatus('connected');
      } else if (status === 'connecting') {
        setSessionStatus('connecting');
        if (typeof details === 'string') {
          setSessionError(details);
        }
      } else if (status === 'accepted') {
        setSessionStatus('connected');
        setSessionError(null);
        setPasswordModalOpen(false);
        setPasswordError(null);
        setPendingDevice(null);
        if (details && typeof details === 'object') {
          if (details.permissions) {
            setGrantedPermissions(details.permissions);
          }
          if (details.mode) {
            activeModeRef.current = details.mode;
          }
          if (details.mode === 'file') {
            setRemoteLoading(true);
            setTimeout(() => {
              const tid = rtc.getTargetId() || activeDeviceRef.current?.id;
              if (tid) {
                rtc.sendPeerMessage({ type: 'file_list_request', path: '' }, tid);
              }
            }, 300);
          }
        }
      } else if (status === 'datachannel_open') {
        setSessionStatus('connected');
        if (activeModeRef.current === 'file') {
          const tid = rtc.getTargetId() || activeDeviceRef.current?.id;
          if (tid) {
            setRemoteLoading(true);
            rtc.sendPeerMessage({ type: 'file_list_request', path: '' }, tid);
          }
        }
      } else if (status === 'connected') {
        setSessionStatus('connected');
        setSessionError(null);
      } else if (status === 'rejected') {
        setSessionStatus('rejected');
        setSessionError(
          typeof details === 'string' ? details : 'درخواست اتصال توسط کاربر سیستم مقصد رد شد.'
        );
      } else if (status === 'error') {
        const msg = typeof details === 'string' ? details : 'خطا در برقراری ارتباط با سیستم مقصد.';
        // If error is invalid unattended password, reopen/update password prompt for clean retry
        if (msg.includes('رمز عبور') && (pendingDeviceRef.current || activeDeviceRef.current)) {
          const targetDev = pendingDeviceRef.current || activeDeviceRef.current!;
          setPendingDevice(targetDev);
          setPasswordError(msg);
          setPasswordModalOpen(true);
          setSessionStatus('idle');
          return;
        }
        setSessionStatus('error');
        setSessionError(msg);
      }
    });

    rtc.onPasswordRequired((info) => {
      const existing = activeDeviceRef.current;
      const dev: Device = existing && normalizeDeskId(existing.id) === normalizeDeskId(info.targetId)
        ? existing
        : {
            id: info.targetId,
            name: info.alias || `Remote (${info.targetId})`,
            alias: info.alias || `${info.targetId}@desk`,
            department: 'ریموت',
            location: 'شبکه مرکزی',
            os: 'windows',
            status: 'online',
            ip: '-',
            lastSeen: 'آنلاین',
            unattendedAccess: true,
            specs: {
              cpu: '-',
              ram: '-',
              storage: '-',
              resolution: '-',
              monitorsCount: 1,
              osVersion: '-'
            }
          };
      setPendingDevice(dev);
      setPendingMode((info.mode as ConnectionMode) || activeModeRef.current || 'desktop');
      setInputPassword('');
      setPasswordError(null);
      setPasswordModalOpen(true);
      setSessionStatus('idle');
      setSessionError(null);
    });

    rtc.onRemoteStream((stream) => {
      setRemoteStream(stream);
      setSessionStatus('connected');
      setSessionError(null);
    });

    rtc.onSessionEnd((info) => {
      const senderNorm = normalizeDeskId(info.senderId);
      setConnectedGuests((prev) => prev.filter((g) => normalizeDeskId(g.id) !== senderNorm));
      setRemoteStream(null);
      if (activeDeviceRef.current) {
        setSessionStatus('rejected');
        setSessionError(
          isRtlRef.current
            ? 'جلسه اتصال توسط طرف مقابل پایان یافت.'
            : 'Session was ended by the remote peer.'
        );
      }
    });

    rtc.onAgentStatus((st) => {
      if (isTauriRuntime()) {
        setNativeAgentActive(true);
      } else {
        setNativeAgentActive(st.active);
      }
    });

    rtc.onIncomingRequest(async (req: IncomingRequestData) => {
      playIncomingChimeAlert();
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('مه دسک - درخواست اتصال جدید', {
          body: `سیستم ${req.requesterName} (${req.fromId}) درخواست دسترسی ارسال کرده است.`
        });
      }

      const mode = req.mode || 'desktop';
      const nowTime = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

      // Unattended password verified server-side: auto-accept when feasible
      if (req.unattendedAuthorized) {
        if (mode === 'file' || mode === 'terminal') {
          rtc.respondToRequest(req.fromId, true, permissionsRef.current, mode);
          setConnectedGuests((prev) => {
            const exists = prev.some((g) => normalizeDeskId(g.id) === normalizeDeskId(req.fromId));
            return exists
              ? prev
              : [...prev, { id: req.fromId, name: req.requesterName, device: req.requesterDevice, connectedAt: nowTime }];
          });
          setIncomingRequest(null);
          return;
        }

        if (hostStreamRef.current) {
          await rtc.setLocalStream(hostStreamRef.current);
          rtc.respondToRequest(req.fromId, true, permissionsRef.current, 'desktop');
          setConnectedGuests((prev) => {
            const exists = prev.some((g) => normalizeDeskId(g.id) === normalizeDeskId(req.fromId));
            return exists
              ? prev
              : [...prev, { id: req.fromId, name: req.requesterName, device: req.requesterDevice, connectedAt: nowTime }];
          });
          setIncomingRequest(null);
          return;
        }

        // Try acquiring screen stream (succeeds if permitted without gesture, otherwise show modal)
        const stream = await handleStartHosting(permissionsRef.current.allowAudio);
        if (stream) {
          await rtc.setLocalStream(stream);
          rtc.respondToRequest(req.fromId, true, permissionsRef.current, 'desktop');
          setConnectedGuests((prev) => {
            const exists = prev.some((g) => normalizeDeskId(g.id) === normalizeDeskId(req.fromId));
            return exists
              ? prev
              : [...prev, { id: req.fromId, name: req.requesterName, device: req.requesterDevice, connectedAt: nowTime }];
          });
          setIncomingRequest(null);
          return;
        }
      }

      setIncomingRequest(req);
    });

    rtc.onRemoteInput(async (input) => {
      if (!permissionsRef.current.allowMouseKeyboard || !input) return;

      if (input.type === 'mousemove') {
        setRemoteCursor({ x: input.x, y: input.y });
      } else if (input.type === 'click' || input.type === 'mousedown' || input.type === 'dblclick') {
        setRemoteCursor({ x: input.x, y: input.y, click: input.button || 'left' });
        setTimeout(() => {
          setRemoteCursor((prev) => (prev ? { ...prev, click: undefined } : null));
        }, 350);
      }

      // If running inside Tauri native desktop app, inject real OS mouse/keyboard events via Rust/Win32/xdotool
      if (isTauriRuntime()) {
        try {
          await invokeTauri('inject_remote_input', { event: input });
        } catch (err) {
          console.warn('Tauri inject_remote_input error:', err);
        }
      }
    });

    rtc.onDataMessage(async (msg: any) => {
      if (!msg || typeof msg !== 'object') return;
      const nowTime = new Date().toLocaleTimeString(isRtlRef.current ? 'fa-IR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      switch (msg.type) {
        case 'clipboard_sync': {
          if (typeof msg.text === 'string') {
            setIncomingClipboard(msg.text);
            if (permissionsRef.current.allowClipboard && navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(msg.text).catch(() => {});
            }
          }
          break;
        }

        case 'chat_message': {
          if (typeof msg.text === 'string') {
            setChatMessages((prev) => [
              ...prev,
              {
                id: msg.id || `chat-${Date.now()}`,
                sender: 'remote',
                senderName: msg.senderName || msg.senderId || 'Remote Peer',
                text: msg.text,
                time: msg.time || nowTime
              }
            ]);
          }
          break;
        }

        case 'session_control': {
          if (msg.action === 'privacy_screen' && permissionsRef.current.allowPrivacyScreen) {
            showToast(
              msg.enabled
                ? isRtlRef.current
                  ? 'حالت صفحه حریم خصوصی توسط اپراتور فعال شد.'
                  : 'Privacy screen enabled by operator.'
                : isRtlRef.current
                ? 'حالت صفحه حریم خصوصی غیرفعال شد.'
                : 'Privacy screen disabled.'
            );
          } else if (msg.action === 'remote_restart' && permissionsRef.current.allowRestart) {
            if (isTauriRuntime()) {
              await invokeTauri('execute_shell_command', {
                command: 'shutdown /r /t 15 /c "MehDesk Remote Restart"'
              }).catch(() => {});
            }
            showToast(
              isRtlRef.current
                ? 'دستور راه‌اندازی مجدد از راه دور دریافت شد.'
                : 'Remote restart command received.'
            );
          }
          break;
        }

        case 'terminal_exec': {
          const requesterId = msg.senderId || rtc.getTargetId();
          if (!permissionsRef.current.allowTerminal) {
            rtc.sendPeerMessage(
              {
                type: 'terminal_output',
                requestId: msg.requestId,
                stdout: '',
                stderr: 'Remote host disabled terminal execution permission.',
                exitCode: 1
              },
              requesterId
            );
            break;
          }

          if (isTauriRuntime()) {
            try {
              const res = await invokeTauri<TauriShellResult>('execute_shell_command', {
                command: String(msg.command || '')
              });
              rtc.sendPeerMessage(
                {
                  type: 'terminal_output',
                  requestId: msg.requestId,
                  stdout: res?.stdout || '',
                  stderr: res?.stderr || '',
                  exitCode: res?.exit_code ?? 0,
                  cwd: res?.cwd || ''
                },
                requesterId
              );
            } catch (err: any) {
              rtc.sendPeerMessage(
                {
                  type: 'terminal_output',
                  requestId: msg.requestId,
                  stdout: '',
                  stderr: String(err?.message || err || 'Command failed'),
                  exitCode: 1
                },
                requesterId
              );
            }
          } else {
            rtc.sendPeerMessage(
              {
                type: 'terminal_output',
                requestId: msg.requestId,
                stdout: '',
                stderr:
                  'این میزبان درون مرورگر وب باز است و دسترسی Shell سیستم‌عامل ندارد. برای اجرای دستورات ترمینال واقعی، نسخه دسکتاپ mehdesk-portable.exe یا ایجنت ویندوز (mehdesk-agent.bat) را روی سیستم مقصد اجرا کنید.',
                exitCode: 126
              },
              requesterId
            );
          }
          break;
        }

        case 'terminal_output': {
          setTerminalExecuting(false);
          const ts = new Date().toLocaleTimeString(isRtlRef.current ? 'fa-IR' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          setTerminalHistory((prev) => {
            const additions: TerminalLogEntry[] = [];
            if (msg.stdout && String(msg.stdout).trim()) {
              additions.push({
                id: `out-${Date.now()}-${Math.random()}`,
                type: 'output',
                text: String(msg.stdout).trimEnd(),
                timestamp: ts
              });
            }
            if (msg.stderr && String(msg.stderr).trim()) {
              additions.push({
                id: `err-${Date.now()}-${Math.random()}`,
                type: 'error',
                text: String(msg.stderr).trimEnd(),
                timestamp: ts
              });
            }
            if (additions.length === 0) {
              additions.push({
                id: `sys-${Date.now()}`,
                type: 'system',
                text: `(exit code: ${msg.exitCode ?? 0})`,
                timestamp: ts
              });
            }
            return [...prev, ...additions];
          });
          break;
        }

        case 'file_list_request': {
          const requesterId = msg.senderId || rtc.getTargetId();
          if (!permissionsRef.current.allowFileTransfer) {
            rtc.sendPeerMessage(
              {
                type: 'file_list_response',
                path: '',
                files: [],
                isTauri: isTauriRuntime(),
                error: 'File transfer permission denied by host.'
              },
              requesterId
            );
            break;
          }

          if (isTauriRuntime()) {
            try {
              const res = await invokeTauri<[string, RemoteFile[]]>('list_directory', {
                path: msg.path || ''
              });
              rtc.sendPeerMessage(
                {
                  type: 'file_list_response',
                  path: res?.[0] || '',
                  files: res?.[1] || [],
                  isTauri: true
                },
                requesterId
              );
            } catch (err: any) {
              rtc.sendPeerMessage(
                {
                  type: 'file_list_response',
                  path: msg.path || '',
                  files: [],
                  isTauri: true,
                  error: String(err?.message || err)
                },
                requesterId
              );
            }
          } else {
            const staged = localFilesRef.current.map(({ browserFile: _bf, downloadUrl: _du, ...rest }) => rest);
            rtc.sendPeerMessage(
              {
                type: 'file_list_response',
                path: 'Browser Shared Files',
                files: staged,
                isTauri: false
              },
              requesterId
            );
          }
          break;
        }

        case 'file_list_response': {
          setRemotePath(msg.path || '');
          setRemoteFiles(Array.isArray(msg.files) ? msg.files : []);
          setRemoteIsTauri(!!msg.isTauri);
          setRemoteLoading(false);
          if (msg.error) {
            showToast(msg.error);
          }
          break;
        }

        case 'file_download_request': {
          const requesterId = msg.senderId || rtc.getTargetId();
          if (!permissionsRef.current.allowFileTransfer || !requesterId) break;

          if (isTauriRuntime() && msg.path && !String(msg.path).startsWith('browser://')) {
            const name = msg.fileName || String(msg.path).split(/[\\/]/).pop() || 'file';
            sendTauriFileToPeer(rtc, msg.path, name, 0, requesterId, upsertTransfer);
          } else {
            const match = localFilesRef.current.find(
              (f) => f.path === msg.path || (msg.fileName && f.name === msg.fileName)
            );
            if (match?.browserFile) {
              sendBrowserFileToPeer(rtc, match.browserFile, requesterId, upsertTransfer);
            }
          }
          break;
        }

        case 'file_meta': {
          if (!msg.transferId || !msg.fileName) break;
          const buffer: IncomingTransferBuffer = {
            transferId: msg.transferId,
            fileName: msg.fileName,
            totalBytes: Number(msg.totalBytes) || 0,
            totalChunks: Number(msg.totalChunks) || 1,
            receivedChunks: 0,
            receivedBytes: 0,
            senderId: msg.senderId || '',
            mimeType: msg.mimeType || 'application/octet-stream',
            startedAt: Date.now(),
            chunks: []
          };
          incomingTransfersRef.current.set(msg.transferId, buffer);
          upsertTransfer({
            id: msg.transferId,
            fileName: msg.fileName,
            direction: 'download',
            totalBytes: buffer.totalBytes,
            transferredBytes: 0,
            speed: '0 KB/s',
            status: 'in_progress',
            timestamp: nowTime
          });
          break;
        }

        case 'file_chunk': {
          const buf = incomingTransfersRef.current.get(msg.transferId);
          if (!buf || typeof msg.data !== 'string') break;

          const bytes = base64ToUint8Array(msg.data);
          buf.receivedChunks += 1;
          buf.receivedBytes += bytes.byteLength;

          if (isTauriRuntime()) {
            try {
              const savedPath = await invokeTauri<string>('write_file_chunk', {
                filename: buf.fileName,
                destDir: null,
                dataBase64: msg.data,
                append: Number(msg.index) > 0
              });
              if (savedPath) buf.savedPath = savedPath;
            } catch (err) {
              console.warn('Tauri write_file_chunk failed:', err);
            }
          } else {
            buf.chunks.push(bytes);
          }

          upsertTransfer({
            id: buf.transferId,
            fileName: buf.fileName,
            direction: 'download',
            totalBytes: buf.totalBytes,
            transferredBytes: buf.receivedBytes,
            speed: formatTransferSpeed(buf.receivedBytes, Date.now() - buf.startedAt),
            status: 'in_progress',
            timestamp: nowTime
          });
          break;
        }

        case 'file_complete': {
          const buf = incomingTransfersRef.current.get(msg.transferId);
          if (!buf) break;
          incomingTransfersRef.current.delete(msg.transferId);

          if (!isTauriRuntime()) {
            const blob = new Blob(buf.chunks as BlobPart[], { type: buf.mimeType });
            const downloadUrl = triggerBrowserDownload(blob, buf.fileName);
            const receivedFile = new File([blob], buf.fileName, { type: buf.mimeType });
            setLocalFiles((prev) => [
              {
                name: buf.fileName,
                path: `browser://received-${Date.now()}-${buf.fileName}`,
                size: buf.receivedBytes || buf.totalBytes,
                isDir: false,
                modified: nowTime,
                type: 'file',
                extension: buf.fileName.split('.').pop()?.toLowerCase() || '',
                browserFile: receivedFile,
                downloadUrl
              },
              ...prev
            ]);
          } else if (buf.savedPath) {
            showToast(
              isRtlRef.current
                ? `فایل "${buf.fileName}" در مسیر ${buf.savedPath} ذخیره شد.`
                : `File "${buf.fileName}" saved to ${buf.savedPath}`
            );
          }

          upsertTransfer({
            id: buf.transferId,
            fileName: buf.fileName,
            direction: 'download',
            totalBytes: buf.totalBytes || buf.receivedBytes,
            transferredBytes: buf.receivedBytes || buf.totalBytes,
            speed: formatTransferSpeed(buf.receivedBytes || buf.totalBytes, Math.max(1, Date.now() - buf.startedAt)),
            status: 'completed',
            timestamp: nowTime
          });
          break;
        }

        case 'file_cancel': {
          const buf = incomingTransfersRef.current.get(msg.transferId);
          if (!buf) break;
          incomingTransfersRef.current.delete(msg.transferId);
          upsertTransfer({
            id: buf.transferId,
            fileName: buf.fileName,
            direction: 'download',
            totalBytes: buf.totalBytes,
            transferredBytes: buf.receivedBytes,
            speed: '0 B/s',
            status: 'failed',
            timestamp: nowTime
          });
          break;
        }
      }
    });

    return () => {
      rtc.disconnect();
    };
  }, [localId, handleStartHosting, playIncomingChimeAlert, showToast, upsertTransfer]);

  // Persist devices list
  useEffect(() => {
    localStorage.setItem('mehdesk_saved_devices', JSON.stringify(devices));
  }, [devices]);

  // Sync allowAudio toggle with active host MediaStream
  useEffect(() => {
    if (hostStream) {
      hostStream.getAudioTracks().forEach((track) => {
        track.enabled = permissions.allowAudio;
      });
    }
  }, [permissions.allowAudio, hostStream]);

  const connectTarget = useCallback((device: Device, mode: ConnectionMode = 'desktop') => {
    const cleanId = normalizeDeskId(device.id);
    const cleanLocalId = normalizeDeskId(localId);

    if (cleanId === cleanLocalId) {
      setSessionError(
        isRtlRef.current
          ? `⚠️ شما شناسه سیستم فعلی خودتان (${localId}) را وارد کرده‌اید!\n\nبرای تست روی یک کامپیوتر، یک تب ناشناس (Incognito) باز کنید تا شناسه مجزا دریافت نمایید.`
          : `You entered your own Desk ID (${localId}). Please enter a remote computer's ID.`
      );
      setActiveDevice(device);
      setActiveTab(mode === 'file' ? 'file-manager' : mode === 'terminal' ? 'terminal' : 'session');
      setSessionStatus('error');
      return;
    }

    const rtc = rtcRef.current;
    const alreadyTargeting = rtc && normalizeDeskId(rtc.getTargetId()) === cleanId;
    const hasLiveSession =
      alreadyTargeting &&
      (sessionStatus === 'connected' || sessionStatus === 'accepted' || rtc?.isDataChannelOpen());

    activeModeRef.current = mode;
    setActiveDevice(device);
    setActiveTab(mode === 'file' ? 'file-manager' : mode === 'terminal' ? 'terminal' : 'session');

    if (hasLiveSession && (mode === 'file' || mode === 'terminal')) {
      setSessionStatus('connected');
      setSessionError(null);
      if (mode === 'file') {
        setRemoteLoading(true);
        rtc?.sendPeerMessage({ type: 'file_list_request', path: '' }, device.id);
      }
      return;
    }

    setRemoteFiles([]);
    setRemotePath('');
    setRemoteStream(null);
    setChatMessages([]);
    setSessionStatus('connecting');
    setSessionError(null);
    if (mode === 'file') setRemoteLoading(true);

    rtc?.connectToHost(device.id, device.unattendedPassword || undefined, mode);
  }, [localId, sessionStatus]);

  const startSession = useCallback(
    (device: Device) => {
      connectTarget(device, 'desktop');
    },
    [connectTarget]
  );

  // Handle QR ?connect=<id> link after rtc client mounts
  useEffect(() => {
    if (urlConnectHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const connectTargetParam = params.get('connect');
    if (connectTargetParam) {
      urlConnectHandledRef.current = true;
      const match = devices.find(
        (d) => normalizeDeskId(d.id) === normalizeDeskId(connectTargetParam)
      );
      const dynamicDev: Device = match || {
        id: connectTargetParam,
        name: `دستگاه ریموت (${connectTargetParam})`,
        alias: `${connectTargetParam}@desk`,
        department: 'اتصال مستقیم',
        location: 'موبایل / کامپیوتر سازمانی',
        os: 'windows',
        status: 'online',
        ip: '-',
        lastSeen: 'هم اکنون',
        unattendedAccess: false,
        specs: {
          cpu: '-',
          ram: '-',
          storage: '-',
          resolution: '-',
          monitorsCount: 1,
          osVersion: '-'
        }
      };
      // Wait briefly so WebSocket registration completes before sending connect_request
      setTimeout(() => connectTarget(dynamicDev, 'desktop'), 600);
    }
  }, [devices, connectTarget]);

  const handleAcceptIncomingRequest = async (customPermissions?: SessionPermissions) => {
    if (!incomingRequest || !rtcRef.current) return;
    const req = incomingRequest;
    const perms = customPermissions || permissions;
    const mode = req.mode || 'desktop';
    const nowTime = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    if (mode === 'desktop') {
      let stream = hostStreamRef.current;
      if (!stream) {
        stream = await handleStartHosting(perms.allowAudio);
      }
      if (stream) {
        await rtcRef.current.setLocalStream(stream);
      } else {
        showToast(
          isRtl
            ? 'انتخاب صفحه لغو شد — اتصال بدون تصویر (فایل/ترمینال) برقرار شد. از تب میزبان می‌توانید اشتراک تصویر را شروع کنید.'
            : 'Screen share cancelled — data channel accepted. You can start screen share from Host tab.'
        );
      }
    }

    rtcRef.current.respondToRequest(req.fromId, true, perms, mode);
    setConnectedGuests((prev) => {
      const exists = prev.some((g) => normalizeDeskId(g.id) === normalizeDeskId(req.fromId));
      return exists
        ? prev
        : [...prev, { id: req.fromId, name: req.requesterName, device: req.requesterDevice, connectedAt: nowTime }];
    });
    setIncomingRequest(null);
  };

  const handleRejectIncomingRequest = useCallback(() => {
    if (!incomingRequest || !rtcRef.current) return;
    rtcRef.current.respondToRequest(
      incomingRequest.fromId,
      false,
      permissionsRef.current,
      incomingRequest.mode || 'desktop'
    );
    setIncomingRequest(null);
  }, [incomingRequest]);

  const handleKickGuest = useCallback((guestId: string) => {
    if (rtcRef.current) {
      rtcRef.current.sendSignal({
        type: 'session_end',
        targetId: guestId,
        reason: 'kicked_by_host'
      });
    }
    setConnectedGuests((prev) => prev.filter((g) => normalizeDeskId(g.id) !== normalizeDeskId(guestId)));
  }, []);

  const handleVerifyPassword = (manualApproval: boolean = false) => {
    if (!pendingDevice || !rtcRef.current) return;
    const dev = pendingDevice;
    const mode = pendingMode;
    setPasswordModalOpen(false);
    setPasswordError(null);
    setActiveDevice(dev);
    activeModeRef.current = mode;
    setActiveTab(mode === 'file' ? 'file-manager' : mode === 'terminal' ? 'terminal' : 'session');
    setSessionStatus('connecting');
    setSessionError(null);

    if (manualApproval) {
      rtcRef.current.connectToHost(dev.id, undefined, mode, true);
    } else {
      rtcRef.current.connectToHost(dev.id, inputPassword, mode, false);
    }
  };

  const handleConnectToId = (targetId: string, mode: ConnectionMode = 'desktop') => {
    const cleanId = normalizeDeskId(targetId);
    const match = devices.find(
      (d) => normalizeDeskId(d.id) === cleanId || d.alias.toLowerCase() === targetId.toLowerCase()
    );
    const target: Device = match || {
      id: targetId,
      name: `کامپیوتر سازمانی (${targetId})`,
      alias: `${targetId}@desk`,
      department: 'اتصال ریموت',
      location: 'شبکه مرکزی',
      os: 'windows',
      status: 'online',
      ip: '-',
      lastSeen: 'آنلاین',
      unattendedAccess: false,
      specs: {
        cpu: '-',
        ram: '-',
        storage: '-',
        resolution: '-',
        monitorsCount: 1,
        osVersion: '-'
      }
    };
    connectTarget(target, mode);
  };

  const handleSendChatMessage = useCallback((text: string) => {
    const rtc = rtcRef.current;
    const targetId = rtc?.getTargetId() || activeDeviceRef.current?.id;
    const nowTime = new Date().toLocaleTimeString(isRtlRef.current ? 'fa-IR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const myAlias = localStorage.getItem('mehdesk_alias') || localId;
    const id = `chat-${Date.now()}`;

    setChatMessages((prev) => [
      ...prev,
      { id, sender: 'local', senderName: myAlias, text, time: nowTime }
    ]);

    if (rtc && targetId) {
      rtc.sendPeerMessage(
        {
          type: 'chat_message',
          id,
          senderName: myAlias,
          text,
          time: nowTime
        },
        targetId
      );
    }
  }, [localId]);

  const handleDisconnectSession = useCallback(() => {
    if (rtcRef.current) {
      rtcRef.current.endSession(true);
    }
    setRemoteStream(null);
    setActiveDevice(null);
    setGrantedPermissions(undefined);
    setSessionStatus('idle');
    setSessionError(null);
    setActiveTab('dashboard');
  }, []);

  const handleAddDevice = (newDev: Device) => {
    setDevices((prev) => [newDev, ...prev]);
  };

  const renderSelectDevicePrompt = (title: string) => (
    <div className="max-w-lg mx-auto mt-12 p-6 bg-[#161922] border border-slate-800 rounded-2xl text-center space-y-4">
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-xs text-slate-400">
        {isRtl
          ? 'ابتدا از داشبورد شناسه سیستم مقصد را وارد کنید یا یکی از سیستم‌های آنلاین را انتخاب نمایید.'
          : 'Please enter a remote Desk ID or pick an online machine from the Dashboard first.'}
      </p>
      <button
        onClick={() => setActiveTab('dashboard')}
        className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/20"
      >
        {isRtl ? 'بازگشت به داشبورد' : 'Go to Dashboard'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0f15] text-slate-100 flex flex-col selection:bg-red-500 selection:text-white">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openQrModal={() => setQrModalOpen(true)}
        openSettingsModal={() => setSettingsModalOpen(true)}
        openAdminModal={() => setAdminModalOpen(true)}
        openAiAssistant={() => setAiDrawerOpen(true)}
        openDeployModal={() => setDeployModalOpen(true)}
        isHosting={isHosting}
        localId={localId}
        isRtl={isRtl}
        setIsRtl={setIsRtl}
        signalingStatus={signalingStatus}
      />

      {toastNotice && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium backdrop-blur-md max-w-md text-center">
          {toastNotice}
        </div>
      )}

      <main className="flex-1 pb-10">
        {(activeTab === 'dashboard' || activeTab === 'devices') && (
          <AnyDeskDashboard
            localId={localId}
            alias={alias}
            devices={devices}
            onConnectToDevice={startSession}
            onConnectToId={handleConnectToId}
            onOpenFileTransfer={(dev) => connectTarget(dev, 'file')}
            onOpenTerminal={(dev) => connectTarget(dev, 'terminal')}
            onStartHosting={() => handleStartHosting(permissions.allowAudio)}
            isHosting={isHosting}
            openQrModal={() => setQrModalOpen(true)}
            openSettingsModal={() => setSettingsModalOpen(true)}
            openDeployModal={() => setDeployModalOpen(true)}
            isRtl={isRtl}
            onAddDevice={handleAddDevice}
            signalingStatus={signalingStatus}
          />
        )}

        {activeTab === 'host' && (
          <HostBroadcaster
            localId={localId}
            alias={alias}
            isHosting={isHosting}
            onStartHosting={(audio) => handleStartHosting(audio)}
            onStopHosting={handleStopHosting}
            stream={hostStream}
            permissions={permissions}
            setPermissions={setPermissions}
            isRtl={isRtl}
            openQrModal={() => setQrModalOpen(true)}
            remoteCursor={remoteCursor}
            incomingRequest={incomingRequest}
            onAcceptIncomingRequest={handleAcceptIncomingRequest}
            onRejectIncomingRequest={handleRejectIncomingRequest}
            connectedGuests={connectedGuests}
            onKickGuest={handleKickGuest}
            nativeAgentActive={nativeAgentActive}
            chatMessages={chatMessages}
            onSendChatMessage={handleSendChatMessage}
            onOpenFileManager={() => setActiveTab('file-manager')}
          />
        )}

        {activeTab === 'file-manager' && (
          <div className="p-3 sm:p-6">
            {activeDevice ? (
              <FileManager
                remoteName={activeDevice.name}
                remoteId={activeDevice.id}
                isRtl={isRtl}
                onClose={() => setActiveTab(remoteStream ? 'session' : 'dashboard')}
                connectionStatus={sessionStatus}
                connectionError={sessionError}
                localFiles={localFiles}
                onAddLocalFiles={handleAddLocalFiles}
                remoteFiles={remoteFiles}
                remotePath={remotePath}
                remoteIsTauri={remoteIsTauri}
                remoteLoading={remoteLoading}
                onRequestRemoteList={handleRequestRemoteList}
                onUploadFile={handleUploadFile}
                onDownloadRemoteFile={handleDownloadRemoteFile}
                transfers={transfers}
                activeTransfer={activeTransfer}
              />
            ) : (
              renderSelectDevicePrompt(
                isRtl ? 'انتقال دوطرفه فایل بین سیستم‌ها' : 'Bidirectional File Transfer'
              )
            )}
          </div>
        )}

        {activeTab === 'terminal' && (
          <div className="p-3 sm:p-6">
            {activeDevice ? (
              <RemoteTerminal
                remoteName={activeDevice.name}
                remoteId={activeDevice.id}
                isRtl={isRtl}
                connectionStatus={sessionStatus}
                connectionError={sessionError}
                history={terminalHistory}
                onClearHistory={() => setTerminalHistory([])}
                onExecuteCommand={handleExecuteTerminalCommand}
                isExecuting={terminalExecuting}
                onClose={() => setActiveTab(remoteStream ? 'session' : 'dashboard')}
                onOpenAiHelp={() => setAiDrawerOpen(true)}
              />
            ) : (
              renderSelectDevicePrompt(
                isRtl ? 'ترمینال واقعی ریموت (PowerShell / Bash)' : 'Real Remote Terminal'
              )
            )}
          </div>
        )}

        {activeTab === 'session' && (
          activeDevice ? (
            <RemoteViewer
              device={activeDevice}
              onDisconnect={handleDisconnectSession}
              onOpenFileTransfer={() => connectTarget(activeDevice, 'file')}
              onOpenTerminal={() => connectTarget(activeDevice, 'terminal')}
              onOpenAiHelp={() => setAiDrawerOpen(true)}
              isRtl={isRtl}
              realStream={remoteStream}
              onSendInput={(eventData) => {
                rtcRef.current?.sendInputEvent(eventData);
              }}
              onSendPeerMessage={(payload) => {
                rtcRef.current?.sendPeerMessage(payload, activeDevice.id);
              }}
              onGetStats={() => rtcRef.current?.getRealStats() || Promise.resolve(null)}
              grantedPermissions={grantedPermissions}
              chatMessages={chatMessages}
              onSendChatMessage={handleSendChatMessage}
              onDropFiles={async (files) => {
                handleAddLocalFiles(files);
                const list: File[] = Array.isArray(files) ? files : Array.from(files as ArrayLike<File>);
                if (rtcRef.current) {
                  for (const file of list) {
                    await sendBrowserFileToPeer(
                      rtcRef.current,
                      file,
                      activeDevice.id,
                      upsertTransfer
                    );
                  }
                }
                showToast(
                  isRtl
                    ? `${list.length} فایل در حال ارسال به سیستم مقصد است.`
                    : `Sending ${list.length} file(s) to remote host.`
                );
              }}
              incomingClipboard={incomingClipboard}
              sessionStatus={sessionStatus}
              sessionError={sessionError}
            />
          ) : (
            renderSelectDevicePrompt(isRtl ? 'جلسه ریموت دسکتاپ' : 'Remote Desktop Session')
          )
        )}
      </main>

      {/* MODAL: UNATTENDED ACCESS PASSWORD PROMPT */}
      {passwordModalOpen && pendingDevice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-slate-100 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30 mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">
                {isRtl ? 'گذرواژه دسترسی بدون نظارت' : 'Unattended Access Password'}
              </h3>
              <p className="text-xs text-slate-400">
                {isRtl
                  ? `رمز عبور سیستم ${pendingDevice.name} را وارد کنید:`
                  : `Enter password for ${pendingDevice.name}:`}
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                value={inputPassword}
                onChange={(e) => {
                  setInputPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword(false)}
                placeholder={isRtl ? 'رمز عبور...' : 'Enter password...'}
                className={`w-full bg-slate-900 border rounded-xl px-4 py-2.5 text-sm text-center tracking-widest text-white focus:outline-none ${
                  passwordError ? 'border-rose-500' : 'border-slate-700 focus:border-red-500'
                }`}
                autoFocus
              />
              {passwordError && (
                <p className="text-rose-400 text-[11px] text-center">{passwordError}</p>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setPendingDevice(null);
                    setPasswordError(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  {isRtl ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  onClick={() => handleVerifyPassword(false)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30"
                >
                  {isRtl ? 'ورود با رمز' : 'Login'}
                </button>
              </div>

              <button
                onClick={() => handleVerifyPassword(true)}
                className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold"
              >
                {isRtl ? 'یا ارسال درخواست تایید دستی به کاربر مقابل' : 'Or Request Manual Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR PAIR MODAL */}
      <QrPairModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        localId={localId}
        isRtl={isRtl}
      />

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        localId={localId}
        alias={alias}
        setAlias={setAlias}
        unattendedPassword={unattendedPassword}
        setUnattendedPassword={setUnattendedPassword}
        permissions={permissions}
        setPermissions={setPermissions}
        isRtl={isRtl}
        onServerSettingsSaved={(serverChanged) => {
          if (serverChanged) {
            rtcRef.current?.reconnectServer();
          } else {
            rtcRef.current?.sendRegistration();
          }
        }}
      />

      {/* ADMIN BOTS & SERVER SETTINGS MODAL */}
      <AdminSettingsModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        isRtl={isRtl}
      />

      {/* AI REMOTE IT ASSISTANT DRAWER */}
      <AiAssistantDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        isRtl={isRtl}
        onExecuteCommand={(cmd) => {
          setAiDrawerOpen(false);
          if (activeDevice) {
            setActiveTab('terminal');
            handleExecuteTerminalCommand(cmd);
          } else {
            showToast(
              isRtl
                ? 'ابتدا به یک سیستم ریموت متصل شوید تا دستور در ترمینال اجرا شود.'
                : 'Connect to a remote host first to run commands.'
            );
          }
        }}
      />

      {/* LINUX & WINDOWS DEPLOYMENT SUITE & TAURI PORTABLE MODAL */}
      <DeploymentManagerModal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        isRtl={isRtl}
      />

      {/* INCOMING REMOTE CONNECTION REQUEST MODAL */}
      <IncomingConnectionDialog
        request={incomingRequest}
        onAccept={handleAcceptIncomingRequest}
        onReject={handleRejectIncomingRequest}
        isRtl={isRtl}
        defaultPermissions={permissions}
      />
    </div>
  );
}
