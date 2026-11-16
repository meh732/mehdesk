import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Monitor,
  Smartphone,
  ShieldCheck,
  Volume2,
  VolumeX,
  Video,
  Maximize2,
  Minimize2,
  Sliders,
  MousePointer,
  Keyboard as KeyboardIcon,
  FolderSync,
  Terminal,
  EyeOff,
  Eye,
  PhoneOff,
  PenTool,
  Sparkles,
  Lock,
  Power,
  Check,
  Wifi,
  Cpu,
  X,
  Eraser,
  ChevronDown,
  MessageSquare,
  Send,
  Clipboard
} from 'lucide-react';
import {
  Device,
  QualityPreset,
  DisplayMode,
  SessionPermissions,
  WhiteboardStroke,
  SessionStats,
  ChatMessage
} from '../types';
import { RealSessionStats } from '../utils/webrtc';

interface RemoteViewerProps {
  device: Device;
  onDisconnect: () => void;
  onOpenFileTransfer: () => void;
  onOpenTerminal: () => void;
  onOpenAiHelp: () => void;
  isRtl: boolean;
  realStream?: MediaStream | null;
  onSendInput?: (eventData: any) => void;
  onSendPeerMessage?: (payload: Record<string, any>) => void;
  onGetStats?: () => Promise<RealSessionStats | null>;
  grantedPermissions?: SessionPermissions;
  chatMessages?: ChatMessage[];
  onSendChatMessage?: (text: string) => void;
  onDropFiles?: (files: FileList | File[]) => void;
  incomingClipboard?: string | null;
  sessionStatus?: string;
  sessionError?: string | null;
}

export const RemoteViewer: React.FC<RemoteViewerProps> = ({
  device,
  onDisconnect,
  onOpenFileTransfer,
  onOpenTerminal,
  onOpenAiHelp,
  isRtl,
  realStream,
  onSendInput,
  onSendPeerMessage,
  onGetStats,
  grantedPermissions,
  chatMessages = [],
  onSendChatMessage,
  onDropFiles,
  incomingClipboard,
  sessionStatus,
  sessionError
}) => {
  const canControl = grantedPermissions ? grantedPermissions.allowMouseKeyboard : true;

  // Session settings
  const [quality, setQuality] = useState<QualityPreset>('best');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [autoplayMutedNotice, setAutoplayMutedNotice] = useState(false);
  const [privacyScreen, setPrivacyScreen] = useState(false);

  // Real MediaRecorder state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Whiteboard
  const [whiteboardActive, setWhiteboardActive] = useState(false);
  const [penColor, setPenColor] = useState('#ef4444');
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<WhiteboardStroke | null>(null);

  // Mobile controls & normalized remote pointer (0..1)
  const [mobileTouchpadVisible, setMobileTouchpadVisible] = useState(false);
  const [mobileKeyboardVisible, setMobileKeyboardVisible] = useState(false);
  const [mobileTextInput, setMobileTextInput] = useState('');
  const [normCursor, setNormCursor] = useState({ x: 0.5, y: 0.5 });
  const [isClicking, setIsClicking] = useState(false);
  const [touchFeedback, setTouchFeedback] = useState<{ normX: number; normY: number; type: 'left' | 'right' } | null>(null);
  const [activeModifiers, setActiveModifiers] = useState<{ ctrl: boolean; alt: boolean; shift: boolean; win: boolean }>({
    ctrl: false,
    alt: false,
    shift: false,
    win: false
  });

  // In-session overlays & notices
  const [clipboardText, setClipboardText] = useState('');
  const [clipboardOpen, setClipboardOpen] = useState(false);
  const [clipboardSynced, setClipboardSynced] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [isDragOverFile, setIsDragOverFile] = useState(false);

  // Real WebRTC stats
  const [stats, setStats] = useState<SessionStats>({
    fps: 0,
    latencyMs: 0,
    bitrateKbps: 0,
    packetLoss: 0,
    codec: 'WebRTC',
    resolution: '-'
  });

  // Rendered video rectangle inside stage (px) so cursor/whiteboard align accurately
  const [videoRect, setVideoRect] = useState({ left: 0, top: 0, width: 1280, height: 720 });

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const touchTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number; normX: number; normY: number }>({
    x: 0,
    y: 0,
    time: 0,
    normX: 0.5,
    normY: 0.5
  });
  const touchpadLastRef = useRef<{ x: number; y: number; moved: boolean; startTime: number }>({
    x: 0,
    y: 0,
    moved: false,
    startTime: 0
  });
  const lastMoveSentRef = useRef<number>(0);

  const showToast = useCallback((msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice((curr) => (curr === msg ? null : curr)), 3000);
  }, []);

  // Recalculate rendered video box within stage
  const updateVideoRect = useCallback(() => {
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage) return;
    const sRect = stage.getBoundingClientRect();
    if (sRect.width === 0 || sRect.height === 0) return;

    if (!video || !realStream || displayMode === 'stretch') {
      setVideoRect({ left: 0, top: 0, width: sRect.width, height: sRect.height });
      return;
    }

    const vW = video.videoWidth || 1920;
    const vH = video.videoHeight || 1080;
    const vAspect = vW / vH;
    const sAspect = sRect.width / sRect.height;

    let renderW = sRect.width;
    let renderH = sRect.height;
    let left = 0;
    let top = 0;

    if (sAspect > vAspect) {
      renderW = sRect.height * vAspect;
      left = (sRect.width - renderW) / 2;
    } else {
      renderH = sRect.width / vAspect;
      top = (sRect.height - renderH) / 2;
    }

    setVideoRect({ left, top, width: renderW, height: renderH });
  }, [realStream, displayMode]);

  useEffect(() => {
    updateVideoRect();
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => updateVideoRect());
    ro.observe(stage);
    window.addEventListener('resize', updateVideoRect);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateVideoRect);
    };
  }, [updateVideoRect]);

  // Attach real WebRTC stream & handle audio mute/autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !realStream) return;
    video.srcObject = realStream;
    video.muted = !audioEnabled;
    video.play().catch(() => {
      // Browser autoplay policy blocked unmuted audio; mute cleanly and let user unmute
      video.muted = true;
      setAutoplayMutedNotice(true);
      video.play().catch(() => {});
    });
  }, [realStream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !audioEnabled;
    if (audioEnabled) {
      setAutoplayMutedNotice(false);
      video.play().catch(() => {});
    }
  }, [audioEnabled]);

  // Sync incoming clipboard from peer
  useEffect(() => {
    if (incomingClipboard) {
      setClipboardText(incomingClipboard);
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(incomingClipboard).catch(() => {});
      }
      showToast(isRtl ? 'کلیپ‌بورد از سیستم مقابل دریافت و کپی شد' : 'Clipboard synced from remote peer');
    }
  }, [incomingClipboard, isRtl, showToast]);

  // Real WebRTC stats polling
  useEffect(() => {
    if (!realStream || !onGetStats) return;
    const timer = setInterval(async () => {
      const s = await onGetStats();
      if (s) {
        setStats(s);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [realStream, onGetStats]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore if iframe blocks fullscreen
    }
  };

  // Real MediaRecorder toggle
  const handleToggleRecording = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    if (!realStream) {
      showToast(isRtl ? 'ابتدا باید استریم تصویر برقرار باشد' : 'Stream not active yet');
      return;
    }

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';
      const recorder = mimeType ? new MediaRecorder(realStream, { mimeType }) : new MediaRecorder(realStream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mehdesk-session-${device.id.replace(/\s+/g, '')}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        showToast(isRtl ? 'ویدیو نشست با فرمت WebM ذخیره شد' : 'Session recording saved (.webm)');
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      showToast(isRtl ? 'مرورگر از ضبط استریم پشتیبانی نمی‌کند' : 'Recording not supported in this browser');
    }
  };

  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Whiteboard Canvas Drawing (normalized 0..1920 x 0..1080 coords)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawStroke = (s: WhiteboardStroke) => {
      if (s.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
    };

    strokes.forEach(drawStroke);
    if (currentStroke) drawStroke(currentStroke);
  }, [strokes, currentStroke]);

  const toCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / Math.max(1, rect.width)) * canvas.width,
      y: ((clientY - rect.top) / Math.max(1, rect.height)) * canvas.height
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!whiteboardActive) return;
    const pt = toCanvasPoint(e.clientX, e.clientY);
    setCurrentStroke({ points: [pt], color: penColor, width: 4, tool: 'pen' });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!whiteboardActive || !currentStroke) return;
    const pt = toCanvasPoint(e.clientX, e.clientY);
    setCurrentStroke((prev) => (prev ? { ...prev, points: [...prev.points, pt] } : null));
  };

  const handleCanvasMouseUp = () => {
    if (whiteboardActive && currentStroke) {
      setStrokes((prev) => [...prev, currentStroke]);
      onSendPeerMessage?.({ type: 'whiteboard_draw', stroke: currentStroke });
      setCurrentStroke(null);
    }
  };

  // Emit normalized video coords (0..1)
  const getVideoCoordinates = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const sRect = stage.getBoundingClientRect();
    const relX = clientX - sRect.left - videoRect.left;
    const relY = clientY - sRect.top - videoRect.top;
    const normX = Math.max(0, Math.min(1, relX / Math.max(1, videoRect.width)));
    const normY = Math.max(0, Math.min(1, relY / Math.max(1, videoRect.height)));
    return { normX, normY };
  };

  // Remote keyboard shortcuts & virtual keys
  const sendKeyCombination = (combo: string) => {
    setActionsMenuOpen(false);
    if (!canControl) {
      showToast(isRtl ? 'میزبان دسترسی کنترل کیبورد را غیرفعال کرده است' : 'Host disabled keyboard control');
      return;
    }
    const map: Record<string, any> = {
      'Ctrl+Alt+Del': { key: 'Delete', code: 'Delete', ctrlKey: true, altKey: true },
      'Win+L': { key: 'l', code: 'KeyL', metaKey: true },
      'Ctrl+Shift+Esc': { key: 'Escape', code: 'Escape', ctrlKey: true, shiftKey: true },
      Win: { key: 'LWin', code: 'OSLeft', metaKey: true },
      'Alt+Tab': { key: 'Tab', code: 'Tab', altKey: true },
      Escape: { key: 'Escape', code: 'Escape' },
      Enter: { key: 'Enter', code: 'Enter' },
      Backspace: { key: 'Backspace', code: 'Backspace' }
    };
    const payload = map[combo];
    if (payload) {
      onSendInput?.({ type: 'keydown', ...payload });
    }
  };

  const sendVirtualKey = (label: string) => {
    if (!canControl) return;
    if (label === 'Ctrl' || label === 'Alt' || label === 'Shift' || label === 'Win') {
      const k = label.toLowerCase() as 'ctrl' | 'alt' | 'shift' | 'win';
      setActiveModifiers((prev) => ({ ...prev, [k]: !prev[k] }));
      return;
    }

    const keyMap: Record<string, { key: string; code: string }> = {
      Esc: { key: 'Escape', code: 'Escape' },
      Tab: { key: 'Tab', code: 'Tab' },
      Del: { key: 'Delete', code: 'Delete' },
      Enter: { key: 'Enter', code: 'Enter' },
      F1: { key: 'F1', code: 'F1' },
      F5: { key: 'F5', code: 'F5' },
      F12: { key: 'F12', code: 'F12' },
      '▲': { key: 'ArrowUp', code: 'ArrowUp' },
      '▼': { key: 'ArrowDown', code: 'ArrowDown' },
      '◄': { key: 'ArrowLeft', code: 'ArrowLeft' },
      '►': { key: 'ArrowRight', code: 'ArrowRight' }
    };

    const mapped = keyMap[label] || { key: label, code: label };
    onSendInput?.({
      type: 'keydown',
      key: mapped.key,
      code: mapped.code,
      ctrlKey: activeModifiers.ctrl,
      altKey: activeModifiers.alt,
      shiftKey: activeModifiers.shift,
      metaKey: activeModifiers.win
    });
    setActiveModifiers({ ctrl: false, alt: false, shift: false, win: false });
  };

  const handleSendTextToRemote = (text: string) => {
    if (!text || !canControl) return;
    for (const char of text) {
      onSendInput?.({
        type: 'keydown',
        key: char,
        code: char === ' ' ? 'Space' : undefined,
        ctrlKey: activeModifiers.ctrl,
        altKey: activeModifiers.alt,
        shiftKey: activeModifiers.shift,
        metaKey: activeModifiers.win
      });
    }
    setActiveModifiers({ ctrl: false, alt: false, shift: false, win: false });
  };

  const handleSyncClipboard = () => {
    if (!clipboardText.trim()) return;
    navigator.clipboard?.writeText(clipboardText).catch(() => {});
    onSendPeerMessage?.({ type: 'clipboard_sync', text: clipboardText });
    setClipboardSynced(true);
    setTimeout(() => setClipboardSynced(false), 2000);
  };

  // Visual click feedback helper
  const showClickFeedback = (normX: number, normY: number, type: 'left' | 'right') => {
    setIsClicking(true);
    setTouchFeedback({ normX, normY, type });
    setTimeout(() => {
      setIsClicking(false);
      setTouchFeedback(null);
    }, 220);
  };

  // Virtual Mobile Trackpad (relative movement + real clicks + 2-finger scroll)
  const handleTouchpadStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    touchpadLastRef.current = { x: t.clientX, y: t.clientY, moved: false, startTime: Date.now() };
  };

  const handleTouchpadMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canControl || !realStream) return;
    const t = e.touches[0];
    const dx = t.clientX - touchpadLastRef.current.x;
    const dy = t.clientY - touchpadLastRef.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      touchpadLastRef.current.moved = true;
    }
    touchpadLastRef.current.x = t.clientX;
    touchpadLastRef.current.y = t.clientY;

    if (e.touches.length === 2) {
      onSendInput?.({
        type: 'wheel',
        deltaX: -dx * 2,
        deltaY: -dy * 3,
        x: normCursor.x,
        y: normCursor.y
      });
      return;
    }

    const sensitivity = 1.6 / Math.max(240, e.currentTarget.clientWidth);
    const nextX = Math.max(0, Math.min(1, normCursor.x + dx * sensitivity));
    const nextY = Math.max(0, Math.min(1, normCursor.y + dy * sensitivity * 1.4));
    setNormCursor({ x: nextX, y: nextY });

    const now = performance.now();
    if (now - lastMoveSentRef.current >= 20) {
      lastMoveSentRef.current = now;
      onSendInput?.({ type: 'mousemove', x: nextX, y: nextY });
    }
  };

  const handleTouchpadEnd = () => {
    if (!canControl || !realStream) return;
    const elapsed = Date.now() - touchpadLastRef.current.startTime;
    if (!touchpadLastRef.current.moved && elapsed < 250) {
      showClickFeedback(normCursor.x, normCursor.y, 'left');
      onSendInput?.({ type: 'click', button: 'left', x: normCursor.x, y: normCursor.y });
    }
  };

  // Direct Screen Touch Gestures (Single Tap = Left Click, Long Press / Two Fingers = Right Click)
  const handleScreenTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (whiteboardActive || !realStream || !canControl) return;
    const touch = e.touches[0];
    const coords = getVideoCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setNormCursor({ x: coords.normX, y: coords.normY });
    onSendInput?.({ type: 'mousemove', x: coords.normX, y: coords.normY });
    touchStartPosRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      normX: coords.normX,
      normY: coords.normY
    };

    if (e.touches.length === 2) {
      e.preventDefault();
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
      showClickFeedback(coords.normX, coords.normY, 'right');
      onSendInput?.({ type: 'click', button: 'right', x: coords.normX, y: coords.normY });
      return;
    }

    touchTimerRef.current = setTimeout(() => {
      touchTimerRef.current = null;
      showClickFeedback(coords.normX, coords.normY, 'right');
      onSendInput?.({ type: 'click', button: 'right', x: coords.normX, y: coords.normY });
    }, 520);
  };

  const handleScreenTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (whiteboardActive || !realStream || !canControl) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);

    if ((deltaX > 10 || deltaY > 10) && touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    const coords = getVideoCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;
    setNormCursor({ x: coords.normX, y: coords.normY });

    const now = performance.now();
    if (now - lastMoveSentRef.current >= 20) {
      lastMoveSentRef.current = now;
      onSendInput?.({ type: 'mousemove', x: coords.normX, y: coords.normY });
    }
  };

  const handleScreenTouchEnd = () => {
    if (whiteboardActive || !realStream || !canControl) return;
    const hadTimer = !!touchTimerRef.current;
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    const elapsed = Date.now() - touchStartPosRef.current.time;
    if (hadTimer && elapsed < 350) {
      const { normX, normY } = touchStartPosRef.current;
      showClickFeedback(normX, normY, 'left');
      onSendInput?.({ type: 'click', button: 'left', x: normX, y: normY });
    }
  };

  // Global physical keyboard forwarding when remote session is active
  useEffect(() => {
    if (!realStream || !canControl) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (whiteboardActive) return;
      const activeEl = document.activeElement as HTMLElement | null;
      const tag = activeEl?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || activeEl?.isContentEditable) return;

      if (
        ['Backspace', 'Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Delete'].includes(
          e.code
        ) ||
        e.key.startsWith('F') ||
        (e.altKey && e.code === 'Tab') ||
        e.ctrlKey
      ) {
        e.preventDefault();
      }

      onSendInput?.({
        type: 'keydown',
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey
      });
    };

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (whiteboardActive) return;
      const activeEl = document.activeElement as HTMLElement | null;
      const tag = activeEl?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || activeEl?.isContentEditable) return;

      onSendInput?.({
        type: 'keyup',
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey
      });
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, [realStream, canControl, whiteboardActive, onSendInput]);

  // Desktop Mouse Handlers (NO duplicate click emission, throttled move)
  const handleDesktopMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (whiteboardActive || !realStream || !canControl) return;
    const coords = getVideoCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    setNormCursor({ x: coords.normX, y: coords.normY });

    const now = performance.now();
    if (now - lastMoveSentRef.current >= 16) {
      lastMoveSentRef.current = now;
      onSendInput?.({ type: 'mousemove', x: coords.normX, y: coords.normY });
    }
  };

  const handleDesktopMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (whiteboardActive || !realStream || !canControl) return;
    const coords = getVideoCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    const btn = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left';
    showClickFeedback(coords.normX, coords.normY, btn === 'right' ? 'right' : 'left');
    onSendInput?.({ type: 'mousedown', button: btn, x: coords.normX, y: coords.normY });
  };

  const handleDesktopMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (whiteboardActive || !realStream || !canControl) return;
    const coords = getVideoCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    const btn = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left';
    onSendInput?.({ type: 'mouseup', button: btn, x: coords.normX, y: coords.normY });
  };

  const handleDesktopDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (whiteboardActive || !realStream || !canControl) return;
    const coords = getVideoCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    const btn = e.button === 2 ? 'right' : 'left';
    onSendInput?.({ type: 'dblclick', button: btn, x: coords.normX, y: coords.normY });
  };

  const handleDesktopWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (whiteboardActive || !realStream || !canControl) return;
    const coords = getVideoCoordinates(e.clientX, e.clientY);
    onSendInput?.({
      type: 'wheel',
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      x: coords?.normX ?? normCursor.x,
      y: coords?.normY ?? normCursor.y
    });
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#08090d] flex flex-col select-none overflow-hidden font-['Vazirmatn',sans-serif]"
    >
      {/* TOP FLOATING TOOLBAR */}
      <div className="bg-[#12141c]/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-1.5 flex items-center justify-between text-xs z-30 shadow-xl gap-2">
        {/* Left: Device identity & live WebRTC stats */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${realStream ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></div>
            <span className="font-mono font-bold text-white tracking-wider truncate">{device.id}</span>
            <span className="hidden sm:inline text-slate-400 text-[11px] truncate max-w-[140px]">({device.alias})</span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden lg:block"></div>

          <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="w-3 h-3" />
              <span>{stats.latencyMs > 0 ? `${stats.latencyMs}ms` : '--'}</span>
            </span>
            <span>{stats.fps > 0 ? `${stats.fps} FPS` : '-- FPS'}</span>
            <span>{stats.bitrateKbps > 0 ? `${(stats.bitrateKbps / 1000).toFixed(1)} Mb/s` : '-- Mb/s'}</span>
            <span className="text-slate-500">{stats.resolution !== '-' ? stats.resolution : stats.codec}</span>
          </div>
        </div>

        {/* Center: Utility Controls */}
        <div className="flex items-center gap-1 flex-wrap justify-center">
          <button
            onClick={() => setDisplayMode((m) => (m === 'fit' ? 'stretch' : 'fit'))}
            className="hidden sm:flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-1 rounded-lg text-[11px]"
            title={isRtl ? 'حالت نمایش صفحه' : 'Display Mode'}
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>{displayMode === 'fit' ? 'Fit' : 'Stretch'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-1.5 rounded-lg border bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            title={isRtl ? 'تمام صفحه' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-1.5 rounded-lg border transition-colors ${
              audioEnabled ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-red-950/40 border-red-800 text-red-400'
            }`}
            title={isRtl ? 'صدای سیستم ریموت' : 'Remote Audio'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setClipboardOpen(!clipboardOpen)}
            className={`p-1.5 rounded-lg border transition-colors ${
              clipboardOpen ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={isRtl ? 'کلیپ‌بورد دوطرفه' : 'Clipboard Sync'}
          >
            <Clipboard className="w-4 h-4" />
          </button>

          <button
            onClick={() => setWhiteboardActive(!whiteboardActive)}
            className={`p-1.5 rounded-lg border transition-colors ${
              whiteboardActive ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={isRtl ? 'ابزار قلم و وایت‌برد' : 'Whiteboard Pen'}
          >
            <PenTool className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleRecording}
            className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 transition-colors text-[11px] ${
              isRecording ? 'bg-rose-600 text-white border-rose-500 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isRtl ? 'ضبط واقعی ویدیو WebM' : 'Record Session (.webm)'}
          >
            <Video className="w-3.5 h-3.5" />
            <span>{isRecording ? `${recordingSeconds}s` : isRtl ? 'ضبط' : 'REC'}</span>
          </button>

          <button
            onClick={() => {
              const next = !privacyScreen;
              setPrivacyScreen(next);
              onSendPeerMessage?.({ type: 'session_control', action: 'privacy_screen', enabled: next });
            }}
            className={`p-1.5 rounded-lg border transition-colors ${
              privacyScreen ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={isRtl ? 'پرده خصوصی' : 'Privacy Screen'}
          >
            {privacyScreen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2 py-1 rounded-lg text-[11px] flex items-center gap-1"
            >
              <span className="hidden sm:inline">{isRtl ? 'عملیات' : 'Actions'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {actionsMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-52 bg-[#181b26] border border-slate-700 rounded-xl shadow-2xl py-1 text-xs z-50">
                <button
                  onClick={() => sendKeyCombination('Ctrl+Alt+Del')}
                  className="w-full text-right px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>Ctrl + Alt + Del</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                </button>
                <button
                  onClick={() => sendKeyCombination('Win+L')}
                  className="w-full text-right px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>{isRtl ? 'قفل ویندوز (Win+L)' : 'Lock PC (Win+L)'}</span>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                </button>
                <button
                  onClick={() => sendKeyCombination('Ctrl+Shift+Esc')}
                  className="w-full text-right px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>Task Manager</span>
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                </button>
                <div className="h-px bg-slate-800 my-1"></div>
                <button
                  onClick={() => {
                    setActionsMenuOpen(false);
                    onSendPeerMessage?.({ type: 'session_control', action: 'remote_restart' });
                    showToast(isRtl ? 'درخواست ریستارت سیستم ریموت ارسال شد' : 'Remote restart command sent');
                  }}
                  className="w-full text-right px-3 py-2 text-rose-400 hover:bg-rose-950/40 flex items-center justify-between"
                >
                  <span>{isRtl ? 'ریستارت کامپیوتر ریموت' : 'Restart Remote PC'}</span>
                  <Power className="w-3.5 h-3.5 text-rose-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Mobile tools, Files, Terminal, Chat & End */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setMobileTouchpadVisible(!mobileTouchpadVisible)}
            className={`p-1.5 rounded-lg border transition-colors ${
              mobileTouchpadVisible ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-300'
            }`}
            title={isRtl ? 'تاچ‌پد لمسی' : 'Virtual Trackpad'}
          >
            <Smartphone className="w-4 h-4" />
          </button>

          <button
            onClick={() => setMobileKeyboardVisible(!mobileKeyboardVisible)}
            className={`p-1.5 rounded-lg border transition-colors ${
              mobileKeyboardVisible ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={isRtl ? 'کیبورد مجازی' : 'Virtual Keyboard'}
          >
            <KeyboardIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`p-1.5 rounded-lg border transition-colors relative ${
              chatOpen ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isRtl ? 'چت آنلاین' : 'Live Chat'}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenFileTransfer}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title={isRtl ? 'انتقال فایل' : 'File Transfer'}
          >
            <FolderSync className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenTerminal}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title={isRtl ? 'ترمینال ریموت' : 'Remote Terminal'}
          >
            <Terminal className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAiHelp}
            className="hidden sm:flex p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 transition-colors"
            title={isRtl ? 'پشتیبان هوشمند IT' : 'AI Copilot'}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
          </button>

          <button
            onClick={onDisconnect}
            className="bg-red-600 hover:bg-red-500 text-white px-2.5 sm:px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all ml-1"
            title={isRtl ? 'قطع اتصال' : 'Disconnect'}
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isRtl ? 'قطع ریموت' : 'End'}</span>
          </button>
        </div>
      </div>

      {/* TOAST NOTICE / AUDIO AUTOPLAY UNLOCK / PERMISSION BANNER */}
      {(toastNotice || autoplayMutedNotice || !canControl) && (
        <div className="bg-[#181b26] border-b border-slate-800 px-3 py-1.5 flex items-center justify-center gap-3 text-xs z-20">
          {!canControl && (
            <span className="text-amber-400 font-semibold">
              {isRtl ? 'حالت فقط-مشاهده: میزبان اجازه کنترل ماوس و کیبورد نداده است' : 'View-only mode: host disabled input control'}
            </span>
          )}
          {autoplayMutedNotice && (
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = false;
                  videoRef.current.play().catch(() => {});
                  setAutoplayMutedNotice(false);
                }
              }}
              className="px-2.5 py-0.5 rounded bg-emerald-600 text-white font-bold"
            >
              {isRtl ? 'برای پخش صدا کلیک کنید' : 'Click to enable remote audio'}
            </button>
          )}
          {toastNotice && <span className="text-emerald-400 font-medium">{toastNotice}</span>}
        </div>
      )}

      {/* CLIPBOARD SYNC BAR */}
      {clipboardOpen && (
        <div className="bg-[#161924] border-b border-slate-800 p-2 flex items-center gap-2 text-xs z-20">
          <Clipboard className="w-4 h-4 text-blue-400 shrink-0" />
          <input
            type="text"
            value={clipboardText}
            onChange={(e) => setClipboardText(e.target.value)}
            placeholder={isRtl ? 'متن کلیپ‌بورد را اینجا وارد کنید تا به سیستم مقابل ارسال شود...' : 'Clipboard text to send to remote PC...'}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSyncClipboard}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1"
          >
            {clipboardSynced ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            <span>{clipboardSynced ? (isRtl ? 'ارسال شد' : 'Sent') : isRtl ? 'ارسال به کلیپ‌بورد ریموت' : 'Send Clipboard'}</span>
          </button>
        </div>
      )}

      {/* WHITEBOARD PALETTE */}
      {whiteboardActive && (
        <div className="bg-[#181b26] border-b border-slate-800 p-2 flex items-center justify-center gap-3 text-xs z-20">
          <span className="text-slate-400">{isRtl ? 'رنگ قلم:' : 'Pen Color:'}</span>
          <div className="flex items-center gap-1.5">
            {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff'].map((col) => (
              <button
                key={col}
                onClick={() => setPenColor(col)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  penColor === col ? 'scale-125 border-white shadow-md' : 'border-transparent'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
          <button
            onClick={() => {
              setStrokes([]);
              onSendPeerMessage?.({ type: 'whiteboard_draw', clear: true });
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>{isRtl ? 'پاک کردن' : 'Clear'}</span>
          </button>
        </div>
      )}

      {/* QUICK KEYS & TEXT TRANSMITTER SUB-BAR */}
      <div className="bg-[#151822] border-b border-slate-800 px-3 py-1 flex flex-wrap items-center justify-between gap-2 text-xs z-20">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
          <button
            onClick={() => sendKeyCombination('Win')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-mono"
          >
            Win
          </button>
          <button
            onClick={() => sendKeyCombination('Alt+Tab')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-mono"
          >
            Alt+Tab
          </button>
          <button
            onClick={() => sendKeyCombination('Ctrl+Alt+Del')}
            className="px-2 py-0.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-[11px] font-mono"
          >
            Ctrl+Alt+Del
          </button>
          <button
            onClick={() => sendKeyCombination('Ctrl+Shift+Esc')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-mono"
          >
            TaskMgr
          </button>
          <button
            onClick={() => sendKeyCombination('Escape')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono"
          >
            Esc
          </button>
          <button
            onClick={() => sendKeyCombination('Enter')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono"
          >
            Enter
          </button>
          <button
            onClick={() => sendKeyCombination('Backspace')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono"
          >
            ⌫
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-1 max-w-sm ml-auto">
          <input
            type="text"
            placeholder={isRtl ? 'تایپ یا پیست متن مستقیم در سیستم ریموت...' : 'Type text to send to remote...'}
            value={mobileTextInput}
            onChange={(e) => setMobileTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendTextToRemote(mobileTextInput);
                setMobileTextInput('');
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-sans"
          />
          <button
            onClick={() => {
              handleSendTextToRemote(mobileTextInput);
              setMobileTextInput('');
            }}
            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium whitespace-nowrap shadow transition-colors"
          >
            {isRtl ? 'تایپ' : 'Type'}
          </button>
        </div>
      </div>

      {/* MAIN REMOTE STAGE + OPTIONAL CHAT SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          ref={stageRef}
          className={`flex-1 relative bg-black flex items-center justify-center overflow-hidden touch-none ${
            isDragOverFile ? 'ring-4 ring-inset ring-blue-500' : ''
          }`}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('Files')) {
              e.preventDefault();
              setIsDragOverFile(true);
            }
          }}
          onDragLeave={() => setIsDragOverFile(false)}
          onDrop={(e) => {
            setIsDragOverFile(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropFiles) {
              e.preventDefault();
              onDropFiles(e.dataTransfer.files);
              showToast(isRtl ? 'فایل‌ها آماده ارسال شدند — پنجره انتقال فایل باز شد' : 'Files staged for transfer');
              onOpenFileTransfer();
            }
          }}
          onTouchStart={handleScreenTouchStart}
          onTouchMove={handleScreenTouchMove}
          onTouchEnd={handleScreenTouchEnd}
          onMouseMove={handleDesktopMouseMove}
          onMouseDown={handleDesktopMouseDown}
          onMouseUp={handleDesktopMouseUp}
          onDoubleClick={handleDesktopDoubleClick}
          onWheel={handleDesktopWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          {realStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={!audioEnabled}
              onLoadedMetadata={updateVideoRect}
              className={`w-full h-full max-h-full cursor-crosshair ${
                displayMode === 'stretch' ? 'object-fill' : 'object-contain'
              }`}
            />
          ) : (
            <div className="w-full h-full max-w-4xl max-h-[600px] flex flex-col items-center justify-center p-8 text-center select-none">
              <div className="relative mb-6">
                <div
                  className={`w-20 h-20 rounded-2xl border flex items-center justify-center shadow-2xl ${
                    sessionStatus === 'rejected' || sessionStatus === 'error'
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-500'
                      : 'bg-gradient-to-br from-red-500/20 to-rose-600/10 border-red-500/30 text-red-500'
                  }`}
                >
                  <Monitor className={`w-10 h-10 ${sessionStatus === 'rejected' || sessionStatus === 'error' ? '' : 'animate-pulse'}`} />
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                {sessionStatus === 'rejected'
                  ? isRtl
                    ? 'درخواست اتصال رد شد'
                    : 'Connection Rejected'
                  : sessionStatus === 'error'
                  ? isRtl
                    ? 'خطا در برقراری اتصال'
                    : 'Connection Error'
                  : isRtl
                  ? `در حال برقراری ارتباط با ${device.name}...`
                  : `Connecting to ${device.name}...`}
              </h3>

              <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed whitespace-pre-line">
                {sessionStatus === 'rejected'
                  ? sessionError || (isRtl ? 'درخواست اتصال توسط سیستم میزبان رد شد.' : 'The host rejected the request.')
                  : sessionStatus === 'error'
                  ? sessionError || (isRtl ? 'سیستم مقصد آنلاین نیست.' : 'Remote target is offline.')
                  : isRtl
                  ? 'درخواست اتصال به سیستم مقصد ارسال شد. پس از تایید میزبان و شروع اشتراک مانیتور، تصویر زنده و کنترل کامل اینجا نمایش داده می‌شود.'
                  : 'Waiting for host approval and display stream...'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-300">
                <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2">
                  <span className="text-slate-400">{isRtl ? 'شناسه مقصد:' : 'Target:'}</span>
                  <span className="text-red-400 font-bold">{device.id}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2">
                  <span className="text-slate-400">{isRtl ? 'وضعیت:' : 'State:'}</span>
                  <span className={`font-bold ${sessionStatus === 'error' || sessionStatus === 'rejected' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {sessionStatus === 'error'
                      ? isRtl
                        ? 'ناموفق'
                        : 'Error'
                      : sessionStatus === 'rejected'
                      ? isRtl
                        ? 'رد شده'
                        : 'Rejected'
                      : sessionStatus === 'connected'
                      ? isRtl
                        ? 'متصل (در انتظار تصویر میزبان)'
                        : 'Connected (waiting stream)'
                      : isRtl
                      ? 'در انتظار تایید میزبان...'
                      : 'Waiting approval...'}
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={onDisconnect}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 text-xs font-bold transition-colors"
                >
                  {isRtl ? 'بازگشت به داشبورد' : 'Return to Dashboard'}
                </button>
              </div>
            </div>
          )}

          {/* WHITEBOARD OVERLAY ALIGNED TO VIDEO RECT */}
          {realStream && (
            <canvas
              ref={canvasRef}
              width={1920}
              height={1080}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              style={{
                left: `${videoRect.left}px`,
                top: `${videoRect.top}px`,
                width: `${videoRect.width}px`,
                height: `${videoRect.height}px`
              }}
              className={`absolute ${whiteboardActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'} z-20`}
            />
          )}

          {/* TOUCH RIPPLE FEEDBACK */}
          {realStream && touchFeedback && (
            <div
              className={`absolute pointer-events-none rounded-full animate-ping z-40 ${
                touchFeedback.type === 'right' ? 'w-10 h-10 bg-amber-500/60 border-2 border-amber-300' : 'w-7 h-7 bg-sky-500/60 border border-white'
              }`}
              style={{
                left: `${videoRect.left + touchFeedback.normX * videoRect.width - (touchFeedback.type === 'right' ? 20 : 14)}px`,
                top: `${videoRect.top + touchFeedback.normY * videoRect.height - (touchFeedback.type === 'right' ? 20 : 14)}px`
              }}
            />
          )}

          {/* REMOTE POINTER INDICATOR (Mobile Trackpad / Touch Sync) */}
          {realStream && mobileTouchpadVisible && (
            <div
              className="absolute pointer-events-none z-30"
              style={{
                left: `${videoRect.left + normCursor.x * videoRect.width}px`,
                top: `${videoRect.top + normCursor.y * videoRect.height}px`,
                transform: 'translate(-2px, -2px)'
              }}
            >
              <MousePointer className={`w-5 h-5 text-red-500 fill-white drop-shadow-md ${isClicking ? 'scale-90' : ''}`} />
            </div>
          )}
        </div>

        {/* LIVE SESSION CHAT SIDEBAR */}
        {chatOpen && (
          <div className="w-72 sm:w-80 bg-[#12141c] border-r border-l border-slate-800 flex flex-col z-30">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>{isRtl ? 'گفتگوی زنده با میزبان' : 'Live Session Chat'}</span>
              </span>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
              {chatMessages.length === 0 ? (
                <div className="text-slate-500 text-center py-10">{isRtl ? 'پیامی ارسال نشده است.' : 'No messages yet.'}</div>
              ) : (
                chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2 rounded-xl max-w-[88%] ${
                      m.sender === 'local'
                        ? 'bg-red-600/20 border border-red-500/30 text-slate-100 mr-auto'
                        : 'bg-slate-800 text-slate-200 ml-auto'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 flex justify-between gap-2 mb-0.5">
                      <span>{m.senderName}</span>
                      <span>{m.time}</span>
                    </div>
                    <div className="break-words">{m.text}</div>
                  </div>
                ))
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatInput.trim() || !onSendChatMessage) return;
                onSendChatMessage(chatInput.trim());
                setChatInput('');
              }}
              className="p-2.5 border-t border-slate-800 flex items-center gap-1.5"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isRtl ? 'پیام...' : 'Message...'}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button type="submit" className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* MOBILE VIRTUAL TRACKPAD OVERLAY */}
      {mobileTouchpadVisible && (
        <div className="absolute bottom-16 right-4 z-40 bg-[#161924]/95 border-2 border-amber-500/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md w-72 max-w-[90vw]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700 text-xs text-amber-400 font-bold">
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>{isRtl ? 'تاچ‌پد لمسی موبایل' : 'Mobile Trackpad'}</span>
            </div>
            <button onClick={() => setMobileTouchpadVisible(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            onTouchStart={handleTouchpadStart}
            onTouchMove={handleTouchpadMove}
            onTouchEnd={handleTouchpadEnd}
            className="h-32 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs select-none mb-2 touch-none"
          >
            <MousePointer className="w-5 h-5 mb-1 text-slate-400" />
            <span>{isRtl ? 'انگشت خود را بکشید (۲ انگشت = اسکرول)' : 'Drag to move (2-finger scroll)'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (!canControl || !realStream) return;
                showClickFeedback(normCursor.x, normCursor.y, 'left');
                onSendInput?.({ type: 'click', button: 'left', x: normCursor.x, y: normCursor.y });
              }}
              className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 active:bg-red-600 transition-colors"
            >
              {isRtl ? 'کلیک چپ (Left)' : 'Left Click'}
            </button>
            <button
              onClick={() => {
                if (!canControl || !realStream) return;
                showClickFeedback(normCursor.x, normCursor.y, 'right');
                onSendInput?.({ type: 'click', button: 'right', x: normCursor.x, y: normCursor.y });
              }}
              className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 active:bg-red-600 transition-colors"
            >
              {isRtl ? 'کلیک راست (Right)' : 'Right Click'}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE VIRTUAL KEYBOARD TOOLBAR */}
      {mobileKeyboardVisible && (
        <div className="bg-[#141622] border-t border-slate-800 p-2 z-40 select-none space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendTextToRemote(mobileTextInput);
              setMobileTextInput('');
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={mobileTextInput}
              onChange={(e) => setMobileTextInput(e.target.value)}
              placeholder={isRtl ? 'تایپ مستقیم متن در سیستم مقصد...' : 'Type text to send directly to remote...'}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
            >
              {isRtl ? 'ارسال' : 'Send'}
            </button>
          </form>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(['Ctrl', 'Alt', 'Shift', 'Win'] as const).map((mod) => {
              const active = activeModifiers[mod.toLowerCase() as 'ctrl' | 'alt' | 'shift' | 'win'];
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => sendVirtualKey(mod)}
                  className={`px-2.5 py-1.5 rounded-lg font-mono font-bold border text-[11px] shrink-0 ${
                    active ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {mod}
                </button>
              );
            })}
            {['Esc', 'Tab', 'F1', 'F5', 'F12', 'Del', 'Enter', '▲', '▼', '◄', '►'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => sendVirtualKey(k)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 active:bg-red-600 font-mono font-bold border border-slate-700 text-[11px] whitespace-nowrap shadow-sm shrink-0"
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
