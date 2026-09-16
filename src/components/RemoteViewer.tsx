import React, { useState, useRef, useEffect } from 'react';
import { 
  Tv, 
  Monitor, 
  Smartphone, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Video, 
  Maximize2, 
  Minimize2, 
  Sliders, 
  Layers, 
  MousePointer, 
  Keyboard as KeyboardIcon, 
  FolderSync, 
  Terminal, 
  EyeOff, 
  Eye, 
  PhoneOff, 
  PenTool, 
  RefreshCw, 
  Sparkles, 
  Lock, 
  Power, 
  Copy, 
  Check, 
  Radio, 
  Wifi, 
  Cpu, 
  HardDrive, 
  FileText, 
  FileSpreadsheet, 
  Globe, 
  Settings, 
  X, 
  Minus, 
  Square, 
  Eraser, 
  ArrowRight,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import { Device, QualityPreset, DisplayMode, SessionPermissions, WhiteboardStroke, SessionStats } from '../types';

interface RemoteViewerProps {
  device: Device;
  onDisconnect: () => void;
  onOpenFileTransfer: () => void;
  onOpenTerminal: () => void;
  onOpenAiHelp: () => void;
  isRtl: boolean;
  realStream?: MediaStream | null;
  onSendInput?: (eventData: any) => void;
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
  sessionStatus,
  sessionError
}) => {
  // Session Settings
  const [activeMonitor, setActiveMonitor] = useState<1 | 2 | 'all'>(1);
  const [quality, setQuality] = useState<QualityPreset>('best');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('fit');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(false);
  const [privacyScreen, setPrivacyScreen] = useState(false);
  
  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Whiteboard / Annotation
  const [whiteboardActive, setWhiteboardActive] = useState(false);
  const [penColor, setPenColor] = useState('#ef4444');
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<WhiteboardStroke | null>(null);

  // Mobile Controls & Touchpad
  const [mobileTouchpadVisible, setMobileTouchpadVisible] = useState(false);
  const [mobileKeyboardVisible, setMobileKeyboardVisible] = useState(false);
  const [mobileTextInput, setMobileTextInput] = useState('');
  const [mousePos, setMousePos] = useState({ x: 500, y: 320 });
  const [isClicking, setIsClicking] = useState(false);
  const [rightClickMenuPos, setRightClickMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [touchFeedback, setTouchFeedback] = useState<{ x: number; y: number; type: 'left' | 'right' } | null>(null);
  const [activeModifiers, setActiveModifiers] = useState<{ ctrl: boolean; alt: boolean; shift: boolean; win: boolean }>({
    ctrl: false,
    alt: false,
    shift: false,
    win: false,
  });

  const touchTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // Stats
  const [stats, setStats] = useState<SessionStats>({
    fps: 60,
    latencyMs: 14,
    bitrateKbps: 4250,
    packetLoss: 0,
    codec: 'DeskRT (H.264 / AV1)',
    resolution: '1920x1080'
  });

  const [clipboardText, setClipboardText] = useState('https://portal.company.internal/login');
  const [clipboardSynced, setClipboardSynced] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [systemVolume, setSystemVolume] = useState(75);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Real WebRTC stream attach
  useEffect(() => {
    if (videoRef.current && realStream) {
      videoRef.current.srcObject = realStream;
      videoRef.current.play().catch(e => console.warn('Video auto-play error:', e));
    }
  }, [realStream]);

  // Recording Timer
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Whiteboard Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    if (currentStroke && currentStroke.points.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = currentStroke.color;
      ctx.lineWidth = currentStroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
      for (let i = 1; i < currentStroke.points.length; i++) {
        ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, currentStroke]);

  // Mouse / Canvas Pointer Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!whiteboardActive) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentStroke({ points: [{ x, y }], color: penColor, width: 4, tool: 'pen' });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (whiteboardActive && currentStroke) {
      setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, { x, y }] } : null);
    }
  };

  const handleCanvasMouseUp = () => {
    if (whiteboardActive && currentStroke) {
      setStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke(null);
    }
  };

  // Keyboard shortcut emulation
  const sendKeyCombination = (combo: string) => {
    setActionsMenuOpen(false);
    if (combo === 'Ctrl+Alt+Del') {
      onSendInput?.({
        type: 'keydown',
        key: 'Delete',
        code: 'Delete',
        ctrlKey: true,
        altKey: true
      });
    } else if (combo === 'Win+L') {
      onSendInput?.({
        type: 'keydown',
        key: 'l',
        code: 'KeyL',
        metaKey: true
      });
    } else if (combo === 'Ctrl+Shift+Esc') {
      onSendInput?.({
        type: 'keydown',
        key: 'Escape',
        code: 'Escape',
        ctrlKey: true,
        shiftKey: true
      });
    } else if (combo === 'Win') {
      onSendInput?.({
        type: 'keydown',
        key: 'LWin',
        code: 'OSLeft'
      });
    } else if (combo === 'Alt+Tab') {
      onSendInput?.({
        type: 'keydown',
        key: 'Tab',
        code: 'Tab',
        altKey: true
      });
    } else if (combo === 'Escape') {
      onSendInput?.({
        type: 'keydown',
        key: 'Escape',
        code: 'Escape'
      });
    } else if (combo === 'Enter') {
      onSendInput?.({
        type: 'keydown',
        key: 'Enter',
        code: 'Enter'
      });
    } else if (combo === 'Backspace') {
      onSendInput?.({
        type: 'keydown',
        key: 'Backspace',
        code: 'Backspace'
      });
    }
  };

  const handleSendTextToRemote = (text: string) => {
    if (!text) return;
    for (const char of text) {
      onSendInput?.({
        type: 'keydown',
        key: char,
        code: char === ' ' ? 'Space' : undefined
      });
    }
  };

  const handleSyncClipboard = () => {
    navigator.clipboard.writeText(clipboardText);
    setClipboardSynced(true);
    setTimeout(() => setClipboardSynced(false), 2000);
  };

  // Virtual Mobile Trackpad Touch Handler
  const handleTouchpadMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = ((touch.clientX - rect.left) / rect.width) * 1920;
    const touchY = ((touch.clientY - rect.top) / rect.height) * 1080;
    setMousePos({ x: Math.max(0, Math.min(1920, touchX)), y: Math.max(0, Math.min(1080, touchY)) });
  };

  // Direct Screen Touch Gestures (Single Tap = Left Click, Long Press / Two Fingers = Right Click)
  const handleScreenTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (whiteboardActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 1920;
    const y = ((touch.clientY - rect.top) / rect.height) * 1080;
    setMousePos({ x, y });

    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    if (e.touches.length === 2) {
      // Two-Finger Tap = Instant Right Click
      e.preventDefault();
      triggerRightClick(x, y);
      return;
    }

    // Long Press Timer (500ms) for Right Click
    touchTimerRef.current = setTimeout(() => {
      triggerRightClick(x, y);
    }, 550);
  };

  const handleScreenTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (whiteboardActive) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // Cancel long press if finger moved significantly (scrolling / dragging)
    if (deltaX > 10 || deltaY > 10) {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    }

    const x = ((touch.clientX - rect.left) / rect.width) * 1920;
    const y = ((touch.clientY - rect.top) / rect.height) * 1080;
    setMousePos({ x, y });
  };

  const handleScreenTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (whiteboardActive) return;
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    const elapsed = Date.now() - touchStartPosRef.current.time;
    if (elapsed < 350 && !rightClickMenuPos) {
      // Short Tap = Left Click
      triggerLeftClick(mousePos.x, mousePos.y);
    }
  };

  const triggerLeftClick = (x: number, y: number) => {
    setRightClickMenuPos(null);
    setIsClicking(true);
    setTouchFeedback({ x, y, type: 'left' });
    setTimeout(() => {
      setIsClicking(false);
      setTouchFeedback(null);
    }, 250);
  };

  const triggerRightClick = (x: number, y: number) => {
    setIsClicking(true);
    setTouchFeedback({ x, y, type: 'right' });
    setRightClickMenuPos({ x: Math.min(x, 1650), y: Math.min(y, 850) });
    setTimeout(() => {
      setIsClicking(false);
      setTouchFeedback(null);
    }, 250);
  };

  const handleSendMobileText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileTextInput) return;
    // Simulate typing text into remote application
    setMobileTextInput('');
  };

  const toggleModifier = (key: 'ctrl' | 'alt' | 'shift' | 'win') => {
    setActiveModifiers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getVideoCoordinates = (clientX: number, clientY: number) => {
    const video = videoRef.current;
    if (!video) return null;
    const rect = video.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const videoW = video.videoWidth || 1920;
    const videoH = video.videoHeight || 1080;
    const videoAspect = videoW / videoH;
    const rectAspect = rect.width / rect.height;

    let renderW = rect.width;
    let renderH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (rectAspect > videoAspect) {
      renderW = rect.height * videoAspect;
      offsetX = (rect.width - renderW) / 2;
    } else {
      renderH = rect.width / videoAspect;
      offsetY = (rect.height - renderH) / 2;
    }

    const clickX = clientX - rect.left - offsetX;
    const clickY = clientY - rect.top - offsetY;

    const normX = Math.max(0, Math.min(1, clickX / renderW));
    const normY = Math.max(0, Math.min(1, clickY / renderH));

    return {
      normX,
      normY,
      pxX: normX * 1920,
      pxY: normY * 1080
    };
  };

  // Keyboard capture for remote typing
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      // Prevent browser default actions that disrupt remote desktop control
      if (['Backspace', 'Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.code) ||
          (e.altKey && e.code === 'Tab')) {
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
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

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
  }, [onSendInput]);

  const handleDesktopMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (whiteboardActive) return;
    const coords = getVideoCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    setMousePos({ x: coords.pxX, y: coords.pxY });
    onSendInput?.({ type: 'mousemove', x: coords.normX, y: coords.normY });
  };

  const handleDesktopMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (whiteboardActive) return;
    const coords = getVideoCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    const btn = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left';
    if (btn === 'left') {
      triggerLeftClick(coords.pxX, coords.pxY);
    } else if (btn === 'right') {
      triggerRightClick(coords.pxX, coords.pxY);
    }
    onSendInput?.({ type: 'mousedown', button: btn, x: coords.normX, y: coords.normY });
  };

  const handleDesktopMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (whiteboardActive) return;
    const coords = getVideoCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    const btn = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left';
    onSendInput?.({ type: 'mouseup', button: btn, x: coords.normX, y: coords.normY });
    onSendInput?.({ type: 'click', button: btn, x: coords.normX, y: coords.normY });
  };

  const handleDesktopDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (whiteboardActive) return;
    const coords = getVideoCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    const btn = e.button === 2 ? 'right' : 'left';
    onSendInput?.({ type: 'dblclick', button: btn, x: coords.normX, y: coords.normY });
  };

  const handleDesktopWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (whiteboardActive) return;
    const coords = getVideoCoordinates(e.clientX, e.clientY);
    const normX = coords?.normX ?? 0.5;
    const normY = coords?.normY ?? 0.5;
    onSendInput?.({
      type: 'wheel',
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      x: normX,
      y: normY
    });
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#08090d] flex flex-col select-none overflow-hidden font-['Vazirmatn',sans-serif]"
    >
      {/* ANYDESK TOP FLOATING TOOLBAR */}
      <div className="bg-[#12141c]/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-1.5 flex items-center justify-between text-xs z-30 shadow-xl">
        {/* Left: Device identity & latency stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="font-mono font-bold text-white tracking-wider">{device.id}</span>
            <span className="hidden sm:inline text-slate-400 text-[11px] truncate max-w-[140px]">({device.alias})</span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden md:block"></div>

          {/* Real-time stats */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="w-3 h-3" />
              <span>{stats.latencyMs}ms</span>
            </span>
            <span>{stats.fps} FPS</span>
            <span>{(stats.bitrateKbps / 1000).toFixed(1)} Mb/s</span>
            <span className="text-slate-500">{stats.codec}</span>
          </div>
        </div>

        {/* Center: Remote Control Utility Buttons */}
        <div className="flex items-center gap-1">
          {/* Monitor Switcher */}
          {device.specs.monitorsCount > 1 && (
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
              <button
                onClick={() => setActiveMonitor(1)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  activeMonitor === 1 ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title={isRtl ? 'مانیتور اول (نمایشگر اصلی)' : 'Display 1 (Primary)'}
              >
                1
              </button>
              <button
                onClick={() => setActiveMonitor(2)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  activeMonitor === 2 ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title={isRtl ? 'مانیتور دوم (نمایشگر فرعی)' : 'Display 2 (Secondary)'}
              >
                2
              </button>
              <button
                onClick={() => setActiveMonitor('all')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  activeMonitor === 'all' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title={isRtl ? 'هر دو مانیتور کنار هم' : 'Both Displays Side-by-Side'}
              >
                1+2
              </button>
            </div>
          )}

          {/* Quality Mode */}
          <button
            onClick={() => setQuality(q => q === 'best' ? 'balanced' : q === 'balanced' ? 'speed' : 'best')}
            className="hidden sm:flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-1 rounded-lg text-[11px]"
            title={isRtl ? 'تغییر کیفیت و فشرده‌سازی تصویر' : 'Streaming Quality'}
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="capitalize">{quality}</span>
          </button>

          {/* Audio Toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-1.5 rounded-lg border transition-colors ${
              audioEnabled ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-red-950/40 border-red-800 text-red-400'
            }`}
            title={isRtl ? 'انتقال صدای ریموت' : 'Remote Audio'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Whiteboard / Annotation Pen */}
          <button
            onClick={() => setWhiteboardActive(!whiteboardActive)}
            className={`p-1.5 rounded-lg border transition-colors ${
              whiteboardActive ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={isRtl ? 'تخته وایت‌برد و ابزار قلم نقاشی روی صفحه' : 'Whiteboard & Screen Pen'}
          >
            <PenTool className="w-4 h-4" />
          </button>

          {/* Recording Button */}
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 transition-colors text-[11px] ${
              isRecording ? 'bg-rose-600 text-white border-rose-500 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isRtl ? 'ضبط ویدیو از نشست ریموت' : 'Screen Recorder'}
          >
            <Video className="w-3.5 h-3.5" />
            <span>{isRecording ? `${recordingSeconds}s` : (isRtl ? 'ضبط' : 'REC')}</span>
          </button>

          {/* Privacy Screen (Blank Remote Monitor) */}
          <button
            onClick={() => setPrivacyScreen(!privacyScreen)}
            className={`p-1.5 rounded-lg border transition-colors ${
              privacyScreen ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={isRtl ? 'سیاه کردن مانیتور فیزیکی کامپیوتر مقصد (پرده حریم خصوصی)' : 'Blank Remote Screen'}
          >
            {privacyScreen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Special Actions Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2 py-1 rounded-lg text-[11px] flex items-center gap-1"
            >
              <span>{isRtl ? 'عملیات سیستم' : 'Actions'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {actionsMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-[#181b26] border border-slate-700 rounded-xl shadow-2xl py-1 text-xs z-50">
                <button
                  onClick={() => sendKeyCombination('Ctrl+Alt+Del')}
                  className="w-full text-right px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between"
                >
                  <span>Ctrl + Alt + Del</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                </button>
                <button
                  onClick={() => sendKeyCombination('Win+L')}
                  className="w-full text-right px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between"
                >
                  <span>{isRtl ? 'قفل ویندوز (Win+L)' : 'Lock PC (Win+L)'}</span>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                </button>
                <button
                  onClick={() => sendKeyCombination('Ctrl+Shift+Esc')}
                  className="w-full text-right px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between"
                >
                  <span>Task Manager</span>
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                </button>
                <div className="h-px bg-slate-800 my-1"></div>
                <button
                  onClick={() => {
                    setActionsMenuOpen(false);
                    alert(isRtl ? 'دستور راه‌اندازی مجدد (Reboot) به سیستم ریموت ارسال شد.' : 'Reboot command sent to remote PC.');
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

        {/* Right: Mode switches, AI Copilot & End Session */}
        <div className="flex items-center gap-1.5">
          {/* Mobile Touchpad / Trackpad overlay trigger */}
          <button
            onClick={() => setMobileTouchpadVisible(!mobileTouchpadVisible)}
            className={`p-1.5 rounded-lg border transition-colors ${
              mobileTouchpadVisible ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-300'
            }`}
            title={isRtl ? 'تاچ‌پد لمسی موبایل (Virtual Trackpad)' : 'Virtual Trackpad for Mobile'}
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Mobile Keyboard */}
          <button
            onClick={() => setMobileKeyboardVisible(!mobileKeyboardVisible)}
            className={`p-1.5 rounded-lg border transition-colors ${
              mobileKeyboardVisible ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={isRtl ? 'کیبورد مجازی با کلیدهای اختصاصی' : 'Virtual Keyboard'}
          >
            <KeyboardIcon className="w-4 h-4" />
          </button>

          {/* Direct File Transfer Mode */}
          <button
            onClick={onOpenFileTransfer}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title={isRtl ? 'باز کردن انتقال فایل' : 'File Manager'}
          >
            <FolderSync className="w-4 h-4" />
          </button>

          {/* Remote Terminal Mode */}
          <button
            onClick={onOpenTerminal}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title={isRtl ? 'ترمینال و پاورشل ریموت' : 'Remote Terminal'}
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* AI IT Copilot */}
          <button
            onClick={onOpenAiHelp}
            className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 transition-colors"
            title={isRtl ? 'پشتیبان هوشمند IT' : 'AI IT Copilot'}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
          </button>

          {/* Disconnect Call / End Session Button */}
          <button
            onClick={onDisconnect}
            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all ml-1"
            title={isRtl ? 'قطع اتصال نشست ریموت' : 'Disconnect Session'}
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>{isRtl ? 'قطع ریموت' : 'End'}</span>
          </button>
        </div>
      </div>

      {/* WHITEBOARD PALETTE (WHEN ACTIVE) */}
      {whiteboardActive && (
        <div className="bg-[#181b26] border-b border-slate-800 p-2 flex items-center justify-center gap-3 text-xs z-20">
          <span className="text-slate-400">{isRtl ? 'رنگ قلم نقاشی روی صفحه:' : 'Pen Color:'}</span>
          <div className="flex items-center gap-1.5">
            {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff'].map(col => (
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
            onClick={() => setStrokes([])}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>{isRtl ? 'پاک کردن نقاشی‌ها' : 'Clear Drawings'}</span>
          </button>
        </div>
      )}

      {/* QUICK KEYS & TEXT TRANSMITTER SUB-BAR */}
      <div className="bg-[#151822] border-b border-slate-800 px-3 py-1 flex flex-wrap items-center justify-between gap-2 text-xs z-20">
        {/* Quick Functional Keys */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
          <span className="text-[11px] text-slate-400 font-medium ml-1 hidden sm:inline">
            {isRtl ? 'کلیدهای سریع:' : 'Quick Keys:'}
          </span>
          <button
            onClick={() => sendKeyCombination('Win')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-mono hover:text-white transition-colors"
            title={isRtl ? 'باز کردن منوی استارت ویندوز' : 'Windows Start Key'}
          >
            Win 🪟
          </button>
          <button
            onClick={() => sendKeyCombination('Alt+Tab')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-mono hover:text-white transition-colors"
            title={isRtl ? 'جابه‌جایی بین پنجره‌ها' : 'Switch Windows (Alt+Tab)'}
          >
            Alt+Tab 🔄
          </button>
          <button
            onClick={() => sendKeyCombination('Ctrl+Alt+Del')}
            className="px-2 py-0.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-[11px] font-mono transition-colors"
            title={isRtl ? 'دستور امنیتی ویندوز' : 'Security Attention Sequence'}
          >
            Ctrl+Alt+Del
          </button>
          <button
            onClick={() => sendKeyCombination('Ctrl+Shift+Esc')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-mono hover:text-white transition-colors"
            title={isRtl ? 'باز کردن تسک منیجر' : 'Task Manager'}
          >
            TaskMgr
          </button>
          <button
            onClick={() => sendKeyCombination('Escape')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono hover:text-white transition-colors"
          >
            Esc
          </button>
          <button
            onClick={() => sendKeyCombination('Enter')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono hover:text-white transition-colors"
          >
            Enter ↵
          </button>
          <button
            onClick={() => sendKeyCombination('Backspace')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono hover:text-white transition-colors"
          >
            ⌫
          </button>
        </div>

        {/* Text Transmitter (Type or paste text into remote application) */}
        <div className="flex items-center gap-1.5 flex-1 max-w-sm ml-auto">
          <input
            type="text"
            placeholder={isRtl ? 'نوشتن یا پیست متن/رمز برای تایپ در ریموت...' : 'Type or paste text to send to remote...'}
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
            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium whitespace-nowrap shadow transition-colors flex items-center gap-1"
          >
            <span>{isRtl ? 'تایپ' : 'Type'}</span>
          </button>
        </div>
      </div>

      {/* REMOTE SCREEN CANVAS / VIDEO STAGE */}
      <div 
        className="flex-1 relative bg-black flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleScreenTouchStart}
        onTouchMove={handleScreenTouchMove}
        onTouchEnd={handleScreenTouchEnd}
        onMouseMove={handleDesktopMouseMove}
        onMouseDown={handleDesktopMouseDown}
        onMouseUp={handleDesktopMouseUp}
        onDoubleClick={handleDesktopDoubleClick}
        onWheel={handleDesktopWheel}
        onContextMenu={(e) => { 
          e.preventDefault(); 
          handleDesktopMouseDown(e); 
          handleDesktopMouseUp(e);
        }}
      >
        {/* Real WebRTC Video if stream exists */}
        {realStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain max-h-full cursor-crosshair"
          />
        ) : (
          /* REAL CONNECTION WAITING / NEGOTIATING / ERROR STATE */
          <div className="w-full h-full max-w-4xl max-h-[600px] flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="relative mb-6">
              <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center shadow-2xl ${
                sessionStatus === 'rejected' || sessionStatus === 'error'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-500'
                  : 'bg-gradient-to-br from-red-500/20 to-rose-600/10 border-red-500/30 text-red-500'
              }`}>
                <Monitor className={`w-10 h-10 ${sessionStatus === 'rejected' || sessionStatus === 'error' ? '' : 'animate-pulse'}`} />
              </div>
              {sessionStatus !== 'rejected' && sessionStatus !== 'error' && (
                <>
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 animate-ping" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-[#0d0f15]" />
                </>
              )}
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              {sessionStatus === 'rejected'
                ? (isRtl ? 'درخواست اتصال رد شد' : 'Connection Rejected')
                : sessionStatus === 'error'
                ? (isRtl ? 'خطا در برقراری اتصال' : 'Connection Error')
                : (isRtl ? `در حال برقراری ارتباط با ${device.name}...` : `Connecting to ${device.name}...`)}
            </h3>
            
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              {sessionStatus === 'rejected'
                ? (isRtl ? (sessionError || 'درخواست اتصال توسط سیستم میزبان رد شد.') : (sessionError || 'The host rejected the remote connection request.'))
                : sessionStatus === 'error'
                ? (sessionError || (isRtl ? 'سیستم مقصد در سرور آنلاین نیست یا شناسه وارد شده صحیح نمی‌باشد.' : 'Remote target is offline.'))
                : (isRtl 
                    ? `درخواست اتصال P2P (WebRTC) به سرور ارسال شده است. به محض تایید در پنجره تایید کامپیوتر مقصد یا اشتراک‌گذاری مانیتور، تصویر سیستم ریموت به صورت زنده و با کنترل کامل ماوس و کیبورد پخش خواهد شد.`
                    : `WebRTC P2P signaling initiated. As soon as the host accepts the prompt and shares screen, live video and input control will stream here.`)}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-300">
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2">
                <span className="text-slate-400">شناسه مقصد:</span>
                <span className="text-red-400 font-bold">{device.id}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2">
                <span className="text-slate-400">وضعیت سیگنال:</span>
                <span className={`font-bold ${sessionStatus === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {sessionStatus === 'error' ? 'ناموفق' : sessionStatus === 'rejected' ? 'رد شده' : 'در انتظار تایید کاربر مقصد...'}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2">
                <span className="text-slate-400">پروتکل:</span>
                <span className="text-blue-400 font-bold">DTLS-SRTP 256-bit</span>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={onDisconnect}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 text-xs font-bold transition-colors"
              >
                {isRtl ? 'بازگشت به داشبورد' : 'Return to Dashboard'}
              </button>
            </div>
          </div>
        )}

        {/* WHITEBOARD CANVAS OVERLAY */}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className={`absolute inset-0 w-full h-full pointer-events-${whiteboardActive ? 'auto' : 'none'} z-20`}
        />

        {/* TOUCH RIPPLE VISUAL FEEDBACK */}
        {touchFeedback && (
          <div 
            className={`absolute pointer-events-none rounded-full animate-ping z-40 ${
              touchFeedback.type === 'right' ? 'w-12 h-12 bg-amber-500/60 border-2 border-amber-300' : 'w-8 h-8 bg-sky-500/60 border border-white'
            }`}
            style={{ 
              left: `${touchFeedback.x - (touchFeedback.type === 'right' ? 24 : 16)}px`, 
              top: `${touchFeedback.y - (touchFeedback.type === 'right' ? 24 : 16)}px` 
            }}
          />
        )}

        {/* SIMULATED / REMOTE MOUSE CURSOR */}
        <div 
          className="absolute pointer-events-none z-30 transition-transform duration-75"
          style={{ 
            left: `${mousePos.x}px`, 
            top: `${mousePos.y}px`,
            transform: 'translate(-2px, -2px)'
          }}
        >
          <MousePointer className={`w-5 h-5 text-red-500 fill-white drop-shadow-md ${isClicking ? 'scale-90' : ''}`} />
          <span className="bg-red-600/90 text-white text-[9px] font-mono px-1 py-0.2 rounded ml-3 -mt-4 block shadow">
            Remote Guest
          </span>
        </div>
      </div>

      {/* MOBILE VIRTUAL TRACKPAD OVERLAY (FOR SMARTPHONES & TOUCHSCREENS) */}
      {mobileTouchpadVisible && (
        <div className="absolute bottom-16 right-4 z-40 bg-[#161924]/95 border-2 border-amber-500/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md w-72 max-w-[90vw]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700 text-xs text-amber-400 font-bold">
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>{isRtl ? 'تاچ‌پد لمسی موبایل (Virtual Trackpad)' : 'Mobile Trackpad'}</span>
            </div>
            <button onClick={() => setMobileTouchpadVisible(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Touch surface */}
          <div 
            onTouchMove={handleTouchpadMove}
            className="h-32 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs cursor-crosshair active:bg-slate-800/80 select-none mb-2"
          >
            <MousePointer className="w-5 h-5 mb-1 text-slate-400" />
            <span>{isRtl ? 'انگشت خود را روی این صفحه بکشید' : 'Swipe here to move cursor'}</span>
          </div>

          {/* Left & Right Click buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => triggerLeftClick(mousePos.x, mousePos.y)}
              className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 active:bg-red-600 transition-colors"
            >
              {isRtl ? 'کلیک چپ (Left)' : 'Left Click'}
            </button>
            <button
              onClick={() => triggerRightClick(mousePos.x, mousePos.y)}
              className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 active:bg-red-600 transition-colors"
            >
              {isRtl ? 'کلیک راست (Right)' : 'Right Click'}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE KEYBOARD TOOLBAR WITH SPECIAL KEYS & REAL TEXT INPUT */}
      {mobileKeyboardVisible && (
        <div className="bg-[#141622] border-t border-slate-800 p-2 z-40 select-none space-y-2 animate-in slide-in-from-bottom-5 duration-150">
          {/* Quick typing box for mobile virtual keyboard */}
          <form onSubmit={handleSendMobileText} className="flex items-center gap-2">
            <input 
              type="text"
              value={mobileTextInput}
              onChange={(e) => setMobileTextInput(e.target.value)}
              placeholder={isRtl ? 'تایپ مستقیم متن در کامپیوتر مقصد...' : 'Type text to send directly to remote machine...'}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 shadow"
            >
              {isRtl ? 'ارسال' : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => setMobileKeyboardVisible(false)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </form>

          {/* Functional Modifier Keys & PC Controls */}
          <div className="overflow-x-auto flex items-center gap-1.5 text-xs pb-0.5">
            {/* Sticky modifier keys */}
            <button
              type="button"
              onClick={() => toggleModifier('ctrl')}
              className={`px-2.5 py-1.5 rounded-lg font-mono font-bold text-[11px] border transition-colors ${
                activeModifiers.ctrl ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Ctrl
            </button>
            <button
              type="button"
              onClick={() => toggleModifier('alt')}
              className={`px-2.5 py-1.5 rounded-lg font-mono font-bold text-[11px] border transition-colors ${
                activeModifiers.alt ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Alt
            </button>
            <button
              type="button"
              onClick={() => toggleModifier('shift')}
              className={`px-2.5 py-1.5 rounded-lg font-mono font-bold text-[11px] border transition-colors ${
                activeModifiers.shift ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Shift
            </button>
            <button
              type="button"
              onClick={() => toggleModifier('win')}
              className={`px-2.5 py-1.5 rounded-lg font-mono font-bold text-[11px] border transition-colors ${
                activeModifiers.win ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Win
            </button>

            {['Esc', 'Tab', 'F1', 'F5', 'F12', 'Del', 'Enter', '▲', '▼', '◄', '►'].map((k) => (
              <button
                key={k}
                type="button"
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
