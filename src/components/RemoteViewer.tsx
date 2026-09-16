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
}

export const RemoteViewer: React.FC<RemoteViewerProps> = ({
  device,
  onDisconnect,
  onOpenFileTransfer,
  onOpenTerminal,
  onOpenAiHelp,
  isRtl,
  realStream
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

  // Windows in Simulated OS
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [activeWindow, setActiveWindow] = useState<'excel' | 'taskmgr' | 'explorer' | 'notepad' | null>('excel');
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
      alert(isRtl ? 'دستور امنیتی Ctrl+Alt+Del به سیستم ریموت ارسال شد.' : 'Sent Ctrl+Alt+Del to remote machine.');
    } else if (combo === 'Win+L') {
      alert(isRtl ? 'سیستم ریموت با موفقیت قفل شد (Lock Screen).' : 'Remote workstation locked.');
    } else if (combo === 'Ctrl+Shift+Esc') {
      setActiveWindow('taskmgr');
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

      {/* REMOTE SCREEN CANVAS / VIDEO STAGE */}
      <div 
        className="flex-1 relative bg-black flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleScreenTouchStart}
        onTouchMove={handleScreenTouchMove}
        onTouchEnd={handleScreenTouchEnd}
      >
        {/* Real WebRTC Video if stream exists */}
        {realStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain max-h-full"
          />
        ) : (
          /* SIMULATED HIGH-FIDELITY REMOTE DESKTOP ENVIRONMENT */
          <div 
            className="w-full h-full max-w-[1920px] max-h-[1080px] bg-cover bg-center relative flex flex-col justify-between overflow-hidden shadow-2xl"
            style={{
              backgroundImage: device.os === 'linux' 
                ? 'radial-gradient(circle at center, #300a24 0%, #110515 100%)' 
                : device.os === 'macos'
                ? 'linear-gradient(135deg, #1f1c2c 0%, #928DAB 100%)'
                : 'radial-gradient(circle at 50% 30%, #1e3a8a 0%, #091024 100%)'
            }}
          >
            {/* Desktop Icons Grid */}
            <div className="p-4 grid grid-flow-col grid-rows-6 gap-4 w-max text-xs select-none">
              <div 
                onClick={() => setActiveWindow('excel')}
                className="w-20 p-2 rounded-xl hover:bg-white/10 flex flex-col items-center text-center text-white cursor-pointer group transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <span className="mt-1 text-[11px] leading-tight drop-shadow font-medium">فاکتورها و ترازنامه.xlsx</span>
              </div>

              <div 
                onClick={() => setActiveWindow('taskmgr')}
                className="w-20 p-2 rounded-xl hover:bg-white/10 flex flex-col items-center text-center text-white cursor-pointer group transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <span className="mt-1 text-[11px] leading-tight drop-shadow font-medium">Task Manager</span>
              </div>

              <div 
                onClick={() => setActiveWindow('explorer')}
                className="w-20 p-2 rounded-xl hover:bg-white/10 flex flex-col items-center text-center text-white cursor-pointer group transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <HardDrive className="w-6 h-6 text-white" />
                </div>
                <span className="mt-1 text-[11px] leading-tight drop-shadow font-medium">درایوها (C:/ D:/)</span>
              </div>

              <div 
                onClick={() => setActiveWindow('notepad')}
                className="w-20 p-2 rounded-xl hover:bg-white/10 flex flex-col items-center text-center text-white cursor-pointer group transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <span className="mt-1 text-[11px] leading-tight drop-shadow font-medium">یادداشت‌های دفتر.txt</span>
              </div>
            </div>

            {/* INTERACTIVE APPLICATION WINDOW: EXCEL / ACCOUNTING SHEET */}
            {activeWindow === 'excel' && (
              <div className="absolute top-10 left-16 right-16 bottom-16 bg-[#1f2330] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Window Title Bar */}
                <div className="bg-[#181b26] px-3 py-2 border-b border-slate-700 flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">نرم‌افزار جامع مالی و حسابداری شرکت - گزارش عملکرد شعب و دفاتر</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setActiveWindow(null)} className="p-1 hover:bg-slate-700 rounded text-slate-400"><Minus className="w-3.5 h-3.5" /></button>
                    <button className="p-1 hover:bg-slate-700 rounded text-slate-400"><Square className="w-3 h-3" /></button>
                    <button onClick={() => setActiveWindow(null)} className="p-1 hover:bg-rose-600 rounded text-slate-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Window Ribbon Bar */}
                <div className="bg-[#252a3a] px-3 py-1.5 border-b border-slate-700 flex items-center gap-4 text-[11px] text-slate-300">
                  <span className="text-emerald-400 font-bold">فایل</span>
                  <span>صفحه اصلی</span>
                  <span>درج فرمول</span>
                  <span>ترازنامه</span>
                  <span>محاسبه مالیات</span>
                  <span>خروجی PDF</span>
                </div>

                {/* Sheet Table */}
                <div className="flex-1 p-3 overflow-auto text-xs font-mono">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                        <th className="p-2 border border-slate-700">کد سند</th>
                        <th className="p-2 border border-slate-700">شرح حساب / دپارتمان</th>
                        <th className="p-2 border border-slate-700">بدهکار (ریال)</th>
                        <th className="p-2 border border-slate-700">بستانکار (ریال)</th>
                        <th className="p-2 border border-slate-700">وضعیت تایید</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-200">
                      <tr className="hover:bg-slate-800/60 border-b border-slate-800">
                        <td className="p-2 border border-slate-700">DOC-1403-890</td>
                        <td className="p-2 border border-slate-700">فاکتور خرید تجهیزات شبکه و سرور تهران</td>
                        <td className="p-2 border border-slate-700 text-emerald-400">۸۵۰,۰۰۰,۰۰۰</td>
                        <td className="p-2 border border-slate-700">۰</td>
                        <td className="p-2 border border-slate-700 text-emerald-400">تایید شده توسط مالی</td>
                      </tr>
                      <tr className="hover:bg-slate-800/60 border-b border-slate-800">
                        <td className="p-2 border border-slate-700">DOC-1403-891</td>
                        <td className="p-2 border border-slate-700">حقوق و دستمزد پرسنل شعبه اصفهان</td>
                        <td className="p-2 border border-slate-700 text-emerald-400">۱,۲۴۰,۰۰۰,۰۰۰</td>
                        <td className="p-2 border border-slate-700">۰</td>
                        <td className="p-2 border border-slate-700 text-emerald-400">پرداخت شده</td>
                      </tr>
                      <tr className="hover:bg-slate-800/60 border-b border-slate-800">
                        <td className="p-2 border border-slate-700">DOC-1403-892</td>
                        <td className="p-2 border border-slate-700">واریزی قرارداد پشتیبانی نرم افزار</td>
                        <td className="p-2 border border-slate-700">۰</td>
                        <td className="p-2 border border-slate-700 text-cyan-400">۲,۱۵۰,۰۰۰,۰۰۰</td>
                        <td className="p-2 border border-slate-700 text-emerald-400">ثبت در حساب جاری</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* INTERACTIVE APPLICATION WINDOW: TASK MANAGER */}
            {activeWindow === 'taskmgr' && (
              <div className="absolute top-12 left-24 w-[600px] h-[400px] bg-[#181b26] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                <div className="bg-[#141620] px-3 py-2 border-b border-slate-700 flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <span className="font-bold">Task Manager - {device.name}</span>
                  </div>
                  <button onClick={() => setActiveWindow(null)} className="p-1 hover:bg-rose-600 rounded text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[11px]">پردازنده (CPU)</div>
                      <div className="text-lg font-bold text-blue-400">18%</div>
                      <div className="text-[10px] text-slate-500">3.80 GHz • 12 Cores</div>
                    </div>
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[11px]">حافظه رم (RAM)</div>
                      <div className="text-lg font-bold text-purple-400">9.4 / 32 GB (29%)</div>
                      <div className="text-[10px] text-slate-500">Speed: 3200 MHz</div>
                    </div>
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[11px]">کارت شبکه (Network)</div>
                      <div className="text-lg font-bold text-emerald-400">1.2 Gbps</div>
                      <div className="text-[10px] text-slate-500">Send: 4.2 MB/s</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* INTERACTIVE APPLICATION WINDOW: NOTEPAD */}
            {activeWindow === 'notepad' && (
              <div className="absolute top-16 right-24 w-[450px] h-[320px] bg-[#1a1d28] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
                <div className="bg-[#141620] px-3 py-2 border-b border-slate-700 flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="font-bold">یادداشت‌های دفتر.txt - Notepad</span>
                  </div>
                  <button onClick={() => setActiveWindow(null)} className="p-1 hover:bg-rose-600 rounded text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  defaultValue={`جلسه هماهنگی شعب سراسر کشور:
۱. بررسی فاکتورهای ارسالی شعبه اصفهان و تبریز
۲. ارتقای رم سرور دیتابیس در تعطیلات آخر هفته
۳. تنظیم گذرواژه دسترسی بدون نظارت (Unattended Access) برای مدیران
۴. آدرس پرتال داخلی: https://corp-portal.local`}
                  className="flex-1 bg-slate-900 p-3 text-xs text-slate-200 font-mono resize-none focus:outline-none"
                />
              </div>
            )}

            {/* REALISTIC RIGHT-CLICK CONTEXT MENU */}
            {rightClickMenuPos && (
              <div 
                className="absolute z-40 bg-[#1a1d28]/95 border border-slate-700 rounded-xl shadow-2xl py-1 text-xs text-slate-200 w-48 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                style={{ left: `${rightClickMenuPos.x}px`, top: `${rightClickMenuPos.y}px` }}
              >
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  {isRtl ? 'منوی کلیک راست سیستم مقصد' : 'Remote Context Menu'}
                </div>
                <button 
                  onClick={() => { setActiveWindow('notepad'); setRightClickMenuPos(null); }}
                  className="w-full text-right px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>{isRtl ? 'باز کردن یادداشت جدید' : 'New Text Note'}</span>
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button 
                  onClick={() => { setActiveWindow('taskmgr'); setRightClickMenuPos(null); }}
                  className="w-full text-right px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>{isRtl ? 'مدیریت وظایف (Task Manager)' : 'Task Manager'}</span>
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                </button>
                <button 
                  onClick={() => { handleSyncClipboard(); setRightClickMenuPos(null); }}
                  className="w-full text-right px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>{isRtl ? 'پیست از کلیپ‌بورد موبایل (Paste)' : 'Paste from Mobile'}</span>
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                </button>
                <div className="h-px bg-slate-800 my-1"></div>
                <button 
                  onClick={() => { setRightClickMenuPos(null); }}
                  className="w-full text-right px-3 py-1.5 hover:bg-slate-800 text-slate-400 flex items-center justify-between"
                >
                  <span>{isRtl ? 'بستن منو' : 'Close Menu'}</span>
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            )}

            {/* BOTTOM WINDOWS TASKBAR */}
            <div className="h-12 bg-[#12141c]/90 backdrop-blur-md border-t border-slate-800/80 px-3 flex items-center justify-between text-xs text-slate-200 z-20">
              {/* Start button & Pinned apps */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStartMenuOpen(!startMenuOpen)}
                  className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow transition-colors"
                >
                  <Tv className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setActiveWindow('excel')}
                    className={`p-2 rounded-lg transition-colors ${activeWindow === 'excel' ? 'bg-slate-700/80' : 'hover:bg-slate-800'}`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  </button>
                  <button 
                    onClick={() => setActiveWindow('taskmgr')}
                    className={`p-2 rounded-lg transition-colors ${activeWindow === 'taskmgr' ? 'bg-slate-700/80' : 'hover:bg-slate-800'}`}
                  >
                    <Cpu className="w-4 h-4 text-blue-400" />
                  </button>
                  <button 
                    onClick={() => setActiveWindow('notepad')}
                    className={`p-2 rounded-lg transition-colors ${activeWindow === 'notepad' ? 'bg-slate-700/80' : 'hover:bg-slate-800'}`}
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* System Tray Clock & Volume */}
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded">
                  <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{systemVolume}%</span>
                </div>
                <div className="text-right">
                  <div>11:45 AM</div>
                  <div className="text-[10px] text-slate-400">1403/06/25</div>
                </div>
              </div>
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
