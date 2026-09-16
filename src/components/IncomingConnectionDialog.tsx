import React, { useEffect, useState } from 'react';
import { 
  Radio, 
  ShieldCheck, 
  Check, 
  X, 
  Monitor, 
  Smartphone, 
  Lock, 
  Eye, 
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SessionPermissions } from '../types';

export interface IncomingRequestData {
  fromId: string;
  requesterName: string;
  requesterDevice: string;
  requiresPassword?: boolean;
  providedPassword?: string;
}

interface IncomingConnectionDialogProps {
  request: IncomingRequestData | null;
  onAccept: (customPermissions?: SessionPermissions) => void;
  onReject: () => void;
  isRtl: boolean;
  defaultPermissions: SessionPermissions;
}

export const IncomingConnectionDialog: React.FC<IncomingConnectionDialogProps> = ({
  request,
  onAccept,
  onReject,
  isRtl,
  defaultPermissions
}) => {
  const [permissions, setPermissions] = useState<SessionPermissions>(defaultPermissions);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!request) return;
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [request]);

  if (!request) return null;

  const togglePermission = (key: keyof SessionPermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#151824] border-2 border-red-500/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative text-slate-100 flex flex-col">
        {/* Animated Top Pulse Bar */}
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 w-full animate-pulse" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header & Icon */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-500 flex items-center justify-center shadow-lg shadow-red-500/10 shrink-0">
                <Radio className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                    {isRtl ? 'درخواست اتصال ورودی' : 'Incoming Remote Request'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {countdown}s
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {request.requesterName}
                </h3>
              </div>
            </div>

            <button
              onClick={onReject}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Caller Details Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{isRtl ? 'شناسه ریموت درخواست‌کننده:' : 'Requester Remote ID:'}</span>
              <span className="text-red-400 font-mono font-bold tracking-wider">{request.fromId}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{isRtl ? 'نوع دستگاه:' : 'Device Type:'}</span>
              <span className="text-slate-200 font-medium flex items-center gap-1.5">
                {request.requesterDevice.includes('Mobile') ? (
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {request.requesterDevice}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{isRtl ? 'پروتکل امنیتی:' : 'Security Protocol:'}</span>
              <span className="text-emerald-400 font-mono">TLS / WebRTC Direct P2P</span>
            </div>
          </div>

          {/* Permissions Accordion */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/50">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs text-slate-300 hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                {isRtl ? 'سطوح دسترسی و اختیارات سیستم مقصد' : 'Access Permissions Control'}
              </span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="p-4 border-t border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={permissions.allowMouseKeyboard}
                    onChange={() => togglePermission('allowMouseKeyboard')}
                    className="rounded accent-red-600"
                  />
                  <span>{isRtl ? 'کنترل ماوس و کیبورد' : 'Mouse & Keyboard'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={permissions.allowClipboard}
                    onChange={() => togglePermission('allowClipboard')}
                    className="rounded accent-red-600"
                  />
                  <span>{isRtl ? 'اشتراک کلیپ‌بورد' : 'Clipboard'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={permissions.allowFileTransfer}
                    onChange={() => togglePermission('allowFileTransfer')}
                    className="rounded accent-red-600"
                  />
                  <span>{isRtl ? 'انتقال فایل' : 'File Transfer'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={permissions.allowAudio}
                    onChange={() => togglePermission('allowAudio')}
                    className="rounded accent-red-600"
                  />
                  <span>{isRtl ? 'انتقال صدا (Audio)' : 'Sound Audio'}</span>
                </label>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onReject}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4 text-rose-500" />
              <span>{isRtl ? 'رد درخواست (Reject)' : 'Reject'}</span>
            </button>

            <button
              onClick={() => onAccept(permissions)}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4 text-white" />
              <span>{isRtl ? 'تایید و شروع اشتراک (Accept)' : 'Accept & Share'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
