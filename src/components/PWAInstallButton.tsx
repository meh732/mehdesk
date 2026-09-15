import React, { useState } from 'react';
import { Download, Smartphone, Check, X, Shield, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface PWAInstallButtonProps {
  isRtl?: boolean;
  className?: string;
  variant?: 'compact' | 'banner' | 'pill';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  isRtl = true,
  className = '',
  variant = 'compact'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If running inside standalone app, show clean badge or suppress
  if (isInstalled && !justInstalled) {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-400 font-medium ${className}`}>
        <Check className="w-3.5 h-3.5" />
        <span>{isRtl ? 'نصب شده (PWA فعال)' : 'App Installed'}</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setJustInstalled(true);
    }
  };

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-red-950/40 via-[#1a1d27] to-slate-900 border border-red-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{isRtl ? 'نرم‌افزار meh desk را روی گوشی یا ویندوز نصب کنید' : 'Install meh desk on Mobile or PC'}</h3>
              <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-1.5 py-0.5 rounded border border-red-500/40 font-mono">PWA v2.0</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isRtl 
                ? 'اجرای تمام‌صفحه بدون نوار مرورگر، دسترسی سریع از صفحه اصلی، کمترین تاخیر و مصرف بهینه باتری'
                : 'Standalone full-screen execution, home screen shortcut, minimal latency and instant launch.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isInstallable ? (
            <button
              onClick={handleInstallClick}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 hover:scale-102 active:scale-98 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{isRtl ? 'نصب مستقیم نرم‌افزار meh desk' : 'Install meh desk App'}</span>
            </button>
          ) : isIOS ? (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Smartphone className="w-4 h-4 text-slate-300" />
              <span>{isRtl ? 'راهنمای نصب روی آیفون / آیپد' : 'Install on iOS'}</span>
            </button>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-red-400" />
              <span>{isRtl ? 'افزودن به دسکتاپ و گوشی' : 'Add to Home / Desktop'}</span>
            </button>
          )}
        </div>

        {/* iOS Guide Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#1a1d27] border border-slate-700 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-red-400" />
                  <span>{isRtl ? 'نصب meh desk روی iOS (آیفون/آیپد)' : 'Install on iPhone / iPad'}</span>
                </h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="my-4 space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">۱</span>
                  <p>{isRtl ? 'در مرورگر Safari دکمه اشتراک‌گذاری (Share) در پایین صفحه را لمس کنید.' : 'Tap the Share icon at the bottom of Safari.'}</p>
                </div>
                <div className="flex items-start gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">۲</span>
                  <p>{isRtl ? 'منو را به پایین بکشید و گزینه «Add to Home Screen» (افزودن به صفحه اصلی) را انتخاب کنید.' : 'Scroll and select "Add to Home Screen".'}</p>
                </div>
                <div className="flex items-start gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">۳</span>
                  <p>{isRtl ? 'آیکون اختصاصی meh desk مانند یک اپلیکیشن بومی روی صفحه شما قرار خواهد گرفت.' : 'meh desk will launch as a standalone high-performance app.'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-xs font-bold text-white transition-colors"
              >
                {isRtl ? 'متوجه شدم' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact Header / Nav button
  return (
    <>
      <button
        onClick={isIOS ? () => setShowIOSGuide(true) : handleInstallClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-red-600/90 to-rose-600/90 hover:from-red-600 hover:to-rose-600 text-white shadow-md shadow-red-600/20 hover:scale-102 active:scale-98 transition-all ${className}`}
        title={isRtl ? 'نصب نرم‌افزار meh desk روی سیستم یا گوشی' : 'Install meh desk PWA'}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="whitespace-nowrap">{isRtl ? 'نصب اپلیکیشن' : 'Install PWA'}</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1a1d27] border border-slate-700 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-red-400" />
                <span>{isRtl ? 'نصب meh desk روی iOS' : 'Install on iPhone / iPad'}</span>
              </h3>
              <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="my-4 space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">۱</span>
                <p>{isRtl ? 'در Safari دکمه Share را بزنید.' : 'Tap Share in Safari.'}</p>
              </div>
              <div className="flex items-start gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">۲</span>
                <p>{isRtl ? 'گزینه «Add to Home Screen» را بزنید.' : 'Choose Add to Home Screen.'}</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-xs font-bold text-white transition-colors"
            >
              {isRtl ? 'بستن' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
