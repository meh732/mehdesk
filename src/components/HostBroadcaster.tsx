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
  Sparkles,
  Smartphone,
  Layers,
  Lock,
  Radio,
  Settings,
  Shield
} from 'lucide-react';
import { SessionPermissions } from '../types';
import { ScreenShareConsentModal } from './ScreenShareConsentModal';

interface HostBroadcasterProps {
  localId: string;
  alias: string;
  isHosting: boolean;
  onStartHosting: () => void;
  onStopHosting: () => void;
  stream: MediaStream | null;
  permissions: SessionPermissions;
  setPermissions: React.Dispatch<React.SetStateAction<SessionPermissions>>;
  isRtl: boolean;
  openQrModal: () => void;
  incomingRequest?: {
    fromId: string;
    requesterName: string;
    requesterDevice: string;
  } | null;
  onAcceptIncomingRequest?: (permissions?: SessionPermissions) => void;
  onRejectIncomingRequest?: () => void;
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
  incomingRequest,
  onAcceptIncomingRequest,
  onRejectIncomingRequest
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [privacyScreen, setPrivacyScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const [connectedGuests, setConnectedGuests] = useState<Array<{
    id: string;
    name: string;
    device: string;
    connectedAt: string;
  }>>([]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(localId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerStartHosting = () => {
    setShowConsentModal(true);
  };

  const handleConsentApproved = (updatedPermissions: SessionPermissions, includeAudio: boolean) => {
    setPermissions(updatedPermissions);
    setMicEnabled(includeAudio);
    setShowConsentModal(false);
    onStartHosting();
  };

  const handleAcceptRequest = () => {
    if (incomingRequest) {
      setConnectedGuests(prev => [
        ...prev,
        {
          id: incomingRequest.fromId,
          name: incomingRequest.requesterName,
          device: incomingRequest.requesterDevice,
          connectedAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      onAcceptIncomingRequest?.(permissions);
    }
  };

  const handleRejectRequest = () => {
    onRejectIncomingRequest?.();
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
              <span className={`w-3 h-3 rounded-full ${isHosting ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isHosting ? (isRtl ? 'سرور اشتراک صفحه فعال است' : 'Hosting Active') : (isRtl ? 'آماده میزبانی و اشتراک تصویر' : 'Ready to Host')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {isRtl ? 'میزبانی صفحه این کامپیوتر در meh desk' : 'Host This Machine Screen on meh desk'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              {isRtl 
                ? 'قبل از ارسال تصویر، سطح دسترسی‌های مجاز (ماوس، کیبورد، صدا و انتقال فایل) از شما پرسیده می‌شود و پس از تایید، تصویر به صورت امن و WebRTC P2P استریم می‌گردد.'
                : 'Share your display securely via WebRTC with granular permission consent. Remote phones and workstations can connect instantly.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isHosting ? (
              <button
                onClick={handleTriggerStartHosting}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2.5 shadow-lg shadow-red-600/40 hover:scale-102 active:scale-98 transition-all"
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
                <span>{isRtl ? 'توقف میزبانی' : 'Stop Hosting'}</span>
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

      {/* Incoming Request Notification Modal/Bar */}
      {incomingRequest && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-500 rounded-2xl p-4 sm:p-5 shadow-2xl animate-bounce">
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
                onClick={handleRejectRequest}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-900/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>{isRtl ? 'رد اتصال' : 'Reject'}</span>
              </button>
              <button
                onClick={handleAcceptRequest}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isRtl ? 'تایید و برقراری ارتباط' : 'Accept Session'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Stream Preview & Host Control Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Video Feed / Screen Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#161922] border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="bg-[#1a1d27] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Tv className="w-4 h-4 text-red-400" />
                <span>{isRtl ? 'پیش‌نمایش تصویر زنده استریم' : 'Live Stream Video Monitor'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                  {isHosting ? 'WebRTC P2P 60 FPS' : 'Idle'}
                </span>
              </div>
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
                      ? 'روی دکمه "شروع اشتراک‌گذاری صفحه" کلیک کنید تا تمام صفحه یا یک نرم‌افزار خاص را به اشتراک بگذارید.'
                      : 'Click Start Sharing Screen to broadcast your entire desktop or a single window.'}
                  </p>
                  <button
                    onClick={onStartHosting}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-red-600/30"
                  >
                    {isRtl ? 'اشتراک صفحه با WebRTC' : 'Start WebRTC Broadcast'}
                  </button>
                </div>
              )}

              {privacyScreen && (
                <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <EyeOff className="w-8 h-8 text-slate-600 mb-2" />
                  <span>{isRtl ? 'پرده حریم خصوصی فعال است (نمایشگر محلی خاموش است)' : 'Privacy screen active (display blanked)'}</span>
                </div>
              )}
            </div>

            {/* Stream Action Toolbar */}
            <div className="p-3 bg-[#1a1d27] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMicEnabled(!micEnabled)}
                  className={`p-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
                    micEnabled 
                      ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40' 
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title={isRtl ? 'انتقال صدای میکروفون به مهمان' : 'Microphone audio broadcast'}
                >
                  {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  <span>{micEnabled ? (isRtl ? 'میکروفون فعال' : 'Mic ON') : (isRtl ? 'میکروفون خاموش' : 'Mic OFF')}</span>
                </button>

                <button
                  onClick={() => setPrivacyScreen(!privacyScreen)}
                  className={`p-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
                    privacyScreen 
                      ? 'bg-purple-600/20 text-purple-300 border-purple-500/40' 
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title={isRtl ? 'سیاه کردن مانیتور فیزیکی برای حفظ حریم خصوصی' : 'Privacy Blank Screen'}
                >
                  {privacyScreen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{isRtl ? 'پرده سیاه خصوصی' : 'Privacy Screen'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Host Connection Credentials & Active Guests */}
        <div className="space-y-4">
          {/* Host ID Card */}
          <div className="bg-[#161922] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-red-500" />
              <span>{isRtl ? 'اطلاعات اتصال این سیستم' : 'Your Machine Address'}</span>
            </h3>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {isRtl ? 'شناسه AnyDesk اختصاصی ۹ رقمی:' : 'Your 9-Digit AnyDesk ID:'}
              </label>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <span className="font-mono text-lg font-black text-red-400 flex-1 tracking-wider text-center">
                  {localId}
                </span>
                <button
                  onClick={handleCopyId}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="کپی شناسه"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {isRtl ? 'نام مستعار درون شبکه (Alias):' : 'Network Alias:'}
              </label>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-slate-200">
                {alias}
              </div>
            </div>
          </div>

          {/* Connected Guests List */}
          <div className="bg-[#161922] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{isRtl ? 'دستگاه‌های متصل به این سیستم' : 'Active Connected Guests'}</span>
              </h3>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                {connectedGuests.length}
              </span>
            </div>

            {connectedGuests.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800/80">
                {isRtl ? 'هیچ کاربری در حال حاضر متصل نیست.' : 'No active remote sessions.'}
              </div>
            ) : (
              <div className="space-y-2">
                {connectedGuests.map((guest, idx) => (
                  <div 
                    key={idx}
                    className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{guest.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {guest.device} • {guest.connectedAt}
                      </div>
                    </div>
                    <button
                      onClick={() => setConnectedGuests(prev => prev.filter((_, i) => i !== idx))}
                      className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-950/40 transition-colors"
                      title={isRtl ? 'قطع اتصال این کاربر' : 'Kick User'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
