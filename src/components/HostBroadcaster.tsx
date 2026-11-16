import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Share2,
  StopCircle,
  Users,
  ShieldCheck,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  MessageSquare,
  Check,
  X,
  Copy,
  Smartphone,
  Radio,
  Send,
  Download,
  MousePointer,
  FolderSync
} from 'lucide-react';
import { SessionPermissions, ChatMessage } from '../types';
import { ScreenShareConsentModal } from './ScreenShareConsentModal';
import { apiUrl, isTauriRuntime } from '../utils/serverConfig';

interface HostBroadcasterProps {
  localId: string;
  alias: string;
  isHosting: boolean;
  onStartHosting: (includeAudio?: boolean) => Promise<MediaStream | null> | void;
  onStopHosting: () => void;
  stream: MediaStream | null;
  permissions: SessionPermissions;
  setPermissions: React.Dispatch<React.SetStateAction<SessionPermissions>>;
  isRtl: boolean;
  openQrModal: () => void;
  remoteCursor?: { x: number; y: number; click?: string } | null;
  incomingRequest?: {
    fromId: string;
    requesterName: string;
    requesterDevice: string;
    mode?: string;
  } | null;
  onAcceptIncomingRequest?: (permissions?: SessionPermissions) => void;
  onRejectIncomingRequest?: () => void;
  connectedGuests: Array<{
    id: string;
    name: string;
    device: string;
    connectedAt: string;
  }>;
  onKickGuest?: (guestId: string) => void;
  nativeAgentActive?: boolean;
  chatMessages?: ChatMessage[];
  onSendChatMessage?: (text: string) => void;
  onOpenFileManager?: () => void;
}

export const HostBroadcaster: React.FC<HostBroadcasterProps> = ({
  localId,
  alias,
  isHosting,
  onStartHosting,
  onStopHosting,
  stream,
  permissions,
  setPermissions,
  isRtl,
  openQrModal,
  remoteCursor,
  incomingRequest,
  onAcceptIncomingRequest,
  onRejectIncomingRequest,
  connectedGuests,
  onKickGuest,
  nativeAgentActive = false,
  chatMessages = [],
  onSendChatMessage,
  onOpenFileManager
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [privacyScreen, setPrivacyScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const inTauri = isTauriRuntime();
  const osControlReady = inTauri || nativeAgentActive;
  const cleanId = localId.replace(/\s+/g, '');

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Toggle audio tracks when mic/audio toggle clicked
  const handleToggleAudioTrack = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    if (stream) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = next;
      });
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(localId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerStartHosting = () => {
    setShowConsentModal(true);
  };

  const handleConsentApproved = (options: { includeAudio: boolean; permissions: SessionPermissions }) => {
    setPermissions(options.permissions);
    setMicEnabled(options.includeAudio);
    setShowConsentModal(false);
    onStartHosting(options.includeAudio);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !onSendChatMessage) return;
    onSendChatMessage(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Screen Share Permission Consent Modal */}
      <ScreenShareConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConfirm={handleConsentApproved}
        currentPermissions={permissions}
        isRtl={isRtl}
      />

      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-[#1a1d27] to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isHosting && stream ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isHosting && stream
                  ? isRtl
                    ? 'استریم زنده صفحه فعال است'
                    : 'Live Screen Stream Active'
                  : isRtl
                  ? 'آماده میزبانی و اشتراک تصویر'
                  : 'Ready to Host'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {isRtl ? 'میزبانی صفحه این کامپیوتر در meh desk' : 'Host This Machine Screen on meh desk'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              {isRtl
                ? 'با شروع اشتراک‌گذاری صفحه، تصویر دسکتاپ یا پنجره انتخابی به صورت مستقیم WebRTC P2P به سیستم متصل‌شده ارسال می‌شود.'
                : 'Share your display securely via WebRTC with granular permission consent.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isHosting || !stream ? (
              <button
                onClick={handleTriggerStartHosting}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2.5 shadow-lg shadow-red-600/40 transition-all"
              >
                <Share2 className="w-5 h-5" />
                <span>{isRtl ? 'شروع اشتراک‌گذاری صفحه' : 'Start Sharing Screen'}</span>
              </button>
            ) : (
              <button
                onClick={onStopHosting}
                className="bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 border border-rose-500/40 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2.5 shadow-lg transition-all"
              >
                <StopCircle className="w-5 h-5" />
                <span>{isRtl ? 'توقف اشتراک صفحه' : 'Stop Hosting'}</span>
              </button>
            )}

            <button
              onClick={openQrModal}
              className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              <span>{isRtl ? 'اسکن با گوشی' : 'Mobile QR'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Native OS Mouse & Keyboard Control Status Banner */}
      <div
        className={`rounded-2xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          osControlReady
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              osControlReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            <MousePointer className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <div className="font-bold">
              {inTauri
                ? isRtl
                  ? 'کنترل بومی ماوس و کیبورد ویندوز (داخلی اپلیکیشن تائوری) فعال است'
                  : 'Built-in Native OS Mouse & Keyboard Control Active (Tauri)'
                : nativeAgentActive
                ? isRtl
                  ? 'ایجنت کنترل ماوس و کیبورد ویندوز/لینوکس به این شناسه متصل و فعال است'
                  : 'External Native OS Input Agent Connected'
                : isRtl
                ? 'در حالت مرورگر وب: برای اینکه کاربر مقابل بتواند ماوس و کیبورد سیستم شما را تکان دهد، ایجنت بومی را اجرا کنید (یا از برنامه Tauri .exe استفاده نمایید)'
                : 'Browser Mode: Run the Native Input Agent (or use Tauri .exe) so the remote peer can move your OS mouse & keyboard'}
            </div>
            <div className="text-[11px] opacity-80">
              {osControlReady
                ? isRtl
                  ? 'کلیه حرکات ماوس، کلیک‌ها، اسکرول و کلیدهای کیبورد از طرف کامپیوتر مقابل مستقیماً روی سیستم‌عامل شما اعمال می‌شوند.'
                  : 'All remote mouse moves, clicks, wheel & keystrokes execute directly on your OS.'
                : isRtl
                ? 'بدون ایجنت یا نسخه Tauri، مرورگر به دلایل امنیتی فقط نشانگر ریموت را روی پیش‌نمایش نمایش می‌دهد.'
                : 'Without the desktop app or agent, browser sandbox only displays remote cursor overlay.'}
            </div>
          </div>
        </div>

        {!inTauri && !nativeAgentActive && (
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={apiUrl(`/api/agent/mehdesk-agent.bat?id=${cleanId}`)}
              download={`mehdesk-input-agent-${cleanId}.bat`}
              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRtl ? 'ایجنت ویندوز (.bat)' : 'Windows Agent (.bat)'}</span>
            </a>
            <a
              href={apiUrl(`/api/agent/linux.sh?id=${cleanId}`)}
              download={`mehdesk-agent-${cleanId}.sh`}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRtl ? 'لینوکس (.sh)' : 'Linux (.sh)'}</span>
            </a>
          </div>
        )}
      </div>

      {/* Incoming Request Bar */}
      {incomingRequest && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-500 rounded-2xl p-4 sm:p-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 animate-pulse">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {isRtl ? 'درخواست اتصال ریموت ورودی' : 'Incoming Connection Request'}
                </div>
                <div className="text-sm font-bold text-white mt-0.5">{incomingRequest.requesterName}</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  ID: {incomingRequest.fromId} | {incomingRequest.requesterDevice}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => onRejectIncomingRequest?.()}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-900/50 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>{isRtl ? 'رد اتصال' : 'Reject'}</span>
              </button>
              <button
                onClick={() => onAcceptIncomingRequest?.(permissions)}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isRtl ? 'تایید و برقراری ارتباط' : 'Accept Session'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Video Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#161922] border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="bg-[#1a1d27] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Tv className="w-4 h-4 text-red-400" />
                <span>{isRtl ? 'پیش‌نمایش تصویر زنده ارسالی' : 'Live Outgoing Stream'}</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                {stream ? 'WebRTC Active' : 'Idle'}
              </span>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-contain ${privacyScreen ? 'filter brightness-0 contrast-200' : ''}`}
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-500 mx-auto flex items-center justify-center border border-slate-700">
                    <Share2 className="w-8 h-8" />
                  </div>
                  <div className="text-sm font-semibold text-slate-300">
                    {isRtl ? 'هنوز اشتراک صفحه آغاز نشده است' : 'Screen broadcast is not started'}
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm">
                    {isRtl
                      ? 'روی دکمه "شروع اشتراک‌گذاری صفحه" کلیک کنید تا تمام صفحه یا یک پنجره را به اشتراک بگذارید.'
                      : 'Click Start Sharing Screen to broadcast your desktop or a window.'}
                  </p>
                  <button
                    onClick={handleTriggerStartHosting}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md"
                  >
                    {isRtl ? 'اشتراک صفحه با WebRTC' : 'Start WebRTC Broadcast'}
                  </button>
                </div>
              )}

              {privacyScreen && (
                <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <EyeOff className="w-8 h-8 text-slate-600 mb-2" />
                  <span>{isRtl ? 'پرده حریم خصوصی فعال است' : 'Privacy screen active'}</span>
                </div>
              )}

              {/* Real-time Remote Guest Cursor Overlay */}
              {remoteCursor && permissions.allowMouseKeyboard && (
                <div
                  className="absolute pointer-events-none z-30 transition-all duration-75"
                  style={{
                    left: `${Math.max(0, Math.min(100, remoteCursor.x * 100))}%`,
                    top: `${Math.max(0, Math.min(100, remoteCursor.y * 100))}%`,
                    transform: 'translate(-2px, -2px)'
                  }}
                >
                  <div className="relative">
                    <div className={`w-4 h-4 text-red-500 fill-white drop-shadow-md ${remoteCursor.click ? 'scale-125 transition-transform' : ''}`}>
                      <svg viewBox="0 0 24 24" fill="currentColor" stroke="black" strokeWidth="1">
                        <path d="M3 3l7 18 3-7 7-3L3 3z" />
                      </svg>
                    </div>
                    {remoteCursor.click && (
                      <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full border-2 border-red-400 animate-ping" />
                    )}
                    <span className="absolute left-4 top-0 bg-red-600/90 text-white text-[9px] font-mono px-1 py-0.5 rounded shadow whitespace-nowrap">
                      {isRtl ? 'کاربر ریموت' : 'Remote Guest'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Stream Action Toolbar */}
            <div className="p-3 bg-[#1a1d27] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleAudioTrack}
                  className={`p-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
                    micEnabled
                      ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  <span>{micEnabled ? (isRtl ? 'صدا فعال' : 'Audio ON') : (isRtl ? 'صدا خاموش' : 'Audio OFF')}</span>
                </button>

                <button
                  onClick={() => setPrivacyScreen(!privacyScreen)}
                  className={`p-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
                    privacyScreen
                      ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {privacyScreen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{isRtl ? 'پرده سیاه خصوصی' : 'Privacy Screen'}</span>
                </button>
              </div>

              {onOpenFileManager && connectedGuests.length > 0 && (
                <button
                  onClick={onOpenFileManager}
                  className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center gap-1.5"
                >
                  <FolderSync className="w-4 h-4" />
                  <span>{isRtl ? 'ارسال/دریافت فایل با مهمان' : 'Share Files with Guest'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Credentials, Connected Guests & Live Chat */}
        <div className="space-y-4">
          {/* Host ID Card */}
          <div className="bg-[#161922] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-red-500" />
              <span>{isRtl ? 'اطلاعات اتصال این سیستم' : 'Your Machine Address'}</span>
            </h3>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {isRtl ? 'شناسه اختصاصی ۹ رقمی:' : 'Your 9-Digit ID:'}
              </label>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <span className="font-mono text-lg font-black text-red-400 flex-1 tracking-wider text-center">
                  {localId}
                </span>
                <button
                  onClick={handleCopyId}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-slate-200">
              {alias}
            </div>
          </div>

          {/* Connected Guests List */}
          <div className="bg-[#161922] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{isRtl ? 'دستگاه‌های متصل' : 'Connected Guests'}</span>
              </h3>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                {connectedGuests.length}
              </span>
            </div>

            {connectedGuests.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800/80">
                {isRtl ? 'هیچ کاربری در حال حاضر متصل نیست.' : 'No active remote sessions.'}
              </div>
            ) : (
              <div className="space-y-2">
                {connectedGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{guest.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {guest.device} • {guest.connectedAt}
                      </div>
                    </div>
                    <button
                      onClick={() => onKickGuest?.(guest.id)}
                      className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-950/40 transition-colors"
                      title={isRtl ? 'قطع اتصال این کاربر' : 'Disconnect Guest'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Peer Chat Box */}
          <div className="bg-[#161922] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>{isRtl ? 'گفتگوی مستقیم با کاربر متصل' : 'Live Peer Chat'}</span>
            </h3>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 h-36 overflow-y-auto space-y-2 text-xs">
              {chatMessages.length === 0 ? (
                <div className="text-slate-500 text-center py-10 text-[11px]">
                  {isRtl ? 'پیامی ارسال نشده است.' : 'No messages yet.'}
                </div>
              ) : (
                chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2 rounded-lg max-w-[85%] ${
                      m.sender === 'local'
                        ? 'bg-red-600/20 border border-red-500/30 text-slate-100 mr-auto'
                        : 'bg-slate-800 text-slate-200 ml-auto'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 mb-0.5 flex justify-between gap-2">
                      <span>{m.senderName}</span>
                      <span>{m.time}</span>
                    </div>
                    <div className="break-words">{m.text}</div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={connectedGuests.length === 0}
                placeholder={connectedGuests.length > 0 ? (isRtl ? 'پیام به کاربر مقابل...' : 'Message peer...') : (isRtl ? 'ابتدا یک کاربر متصل شود' : 'No peer connected')}
                className="flex-1 bg-slate-900 border border-slate-700 disabled:opacity-50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={connectedGuests.length === 0 || !chatInput.trim()}
                className="p-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
