import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Smartphone, Copy, Check, QrCode, Monitor, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

interface QrPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  localId: string;
  isRtl: boolean;
}

export const QrPairModal: React.FC<QrPairModalProps> = ({
  isOpen,
  onClose,
  localId,
  isRtl
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Generate pairing URL with localId as parameter
  const appUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';
  const connectUrl = `${appUrl}?connect=${localId.replace(/\s+/g, '')}&autojoin=true`;

  useEffect(() => {
    if (isOpen && connectUrl) {
      QRCode.toDataURL(connectUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#161922'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error(err));
    }
  }, [isOpen, connectUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(connectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1d27] border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">
            {isRtl ? 'اتصال مستقیم با گوشی موبایل' : 'Direct Mobile Remote Access'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl 
              ? 'دوربین گوشی خود را باز کرده و کد QR زیر را اسکن کنید تا فوراً به این کامپیوتر متصل شوید.'
              : 'Open your mobile camera and scan the QR code below to remotely control this PC.'}
          </p>
        </div>

        {/* QR Code Canvas */}
        <div className="bg-[#161922] p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center mb-4">
          {qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt="AnyDesk Mobile Pair QR" 
              className="w-52 h-52 rounded-lg shadow-inner"
            />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-slate-500">
              <QrCode className="w-12 h-12 animate-pulse" />
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span>{isRtl ? 'شناسه AnyDesk این سیستم:' : 'Your AnyDesk ID:'}</span>
            <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {localId}
            </span>
          </div>
        </div>

        {/* Mobile Features Highlights */}
        <div className="space-y-2 mb-4 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</div>
            <span>{isRtl ? 'تاچ‌پد مجازی لمسی و کنترل دقیق ماوس روی صفحه موبایل' : 'Virtual trackpad & touch gestures for mobile'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</div>
            <span>{isRtl ? 'کیبورد کامل با کلیدهای میانبر (Ctrl+Alt+Del, Win, F1-F12)' : 'Full mobile keyboard with system shortcuts'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</div>
            <span>{isRtl ? 'انتقال فایل دوطرفه و تبادل کلیپ‌بورد در لحظه' : 'Bidirectional file transfer & instant clipboard'}</span>
          </div>
        </div>

        {/* Copy Link button */}
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            readOnly 
            value={connectUrl} 
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 truncate focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
            <span>{copied ? (isRtl ? 'کپی شد' : 'Copied') : (isRtl ? 'کپی لینک' : 'Copy Link')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
