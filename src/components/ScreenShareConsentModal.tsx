import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Tv, 
  Volume2, 
  MousePointer, 
  FileSpreadsheet, 
  Clipboard, 
  Lock, 
  Check, 
  X, 
  AlertTriangle,
  Sparkles,
  Info
} from 'lucide-react';
import { SessionPermissions } from '../types';

interface ScreenShareConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: {
    includeAudio: boolean;
    permissions: SessionPermissions;
  }) => void;
  currentPermissions: SessionPermissions;
  isRtl: boolean;
}

export const ScreenShareConsentModal: React.FC<ScreenShareConsentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentPermissions,
  isRtl
}) => {
  const [includeAudio, setIncludeAudio] = useState(true);
  const [permissions, setPermissions] = useState<SessionPermissions>({ ...currentPermissions });

  if (!isOpen) return null;

  const togglePermission = (key: keyof SessionPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleApprove = () => {
    onConfirm({
      includeAudio,
      permissions
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#181b24] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 flex flex-col space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <ShieldCheck className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isRtl ? 'درخواست مجوز و تایید اشتراک صفحه' : 'Screen Sharing & Security Consent'}
              </h2>
              <p className="text-xs text-slate-400">
                {isRtl ? 'فقط دسترسی‌های مجاز و تایید شده توسط شما به اشتراک گذاشته خواهند شد' : 'Only permissions explicitly authorized by you will be granted'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3 text-xs text-slate-300">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300 block mb-0.5">
              {isRtl ? 'حفظ حریم خصوصی و امنیت meh desk:' : 'meh desk Privacy & Security:'}
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {isRtl 
                ? 'پس از تایید این پنجره، مرورگر از شما مانیتور یا پنجره موردنظر را جهت استریم خواهد پرسید. شما هر لحظه می‌توانید اشتراک‌گذاری را متوقف کنید.'
                : 'After your approval, your browser will prompt to choose the screen or window. You can stop sharing at any second.'}
            </p>
          </div>
        </div>

        {/* Permission List */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold text-slate-300 block">
            {isRtl ? 'تعیین مجوزهای مجاز برای کاربر ریموت:' : 'Configured Remote Permissions:'}
          </span>

          {/* Screen Video - Mandatory */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2.5 text-xs">
              <Tv className="w-4 h-4 text-red-400" />
              <div>
                <div className="font-semibold text-slate-200">{isRtl ? 'تصویر زنده مانیتور یا پنجره' : 'Live Screen/Window Video'}</div>
                <div className="text-[10px] text-slate-500">{isRtl ? 'دسترسی اجباری جهت پخش تصویر' : 'Mandatory for screen broadcasting'}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              {isRtl ? 'اجباری' : 'Required'}
            </span>
          </div>

          {/* Audio toggle */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-900 cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5 text-xs">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="font-semibold text-slate-200">{isRtl ? 'انتقال صدای سیستم و نرم‌افزارها' : 'Share System & Tab Audio'}</div>
                <div className="text-[10px] text-slate-500">{isRtl ? 'پخش صدای سیستم مبدا برای کلاینت ریموت' : 'Broadcast audio output to remote viewer'}</div>
              </div>
            </div>
            <input 
              type="checkbox" 
              checked={includeAudio} 
              onChange={(e) => setIncludeAudio(e.target.checked)}
              className="w-4 h-4 rounded accent-red-600 cursor-pointer"
            />
          </label>

          {/* Mouse & Keyboard */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-900 cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5 text-xs">
              <MousePointer className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-semibold text-slate-200">{isRtl ? 'کنترل ورودی ماوس و کیبورد' : 'Remote Mouse & Keyboard Input'}</div>
                <div className="text-[10px] text-slate-500">{isRtl ? 'اجازه کلیک و تایپ از راه دور' : 'Allow clicks and keystrokes from remote'}</div>
              </div>
            </div>
            <input 
              type="checkbox" 
              checked={permissions.allowMouseKeyboard} 
              onChange={() => togglePermission('allowMouseKeyboard')}
              className="w-4 h-4 rounded accent-red-600 cursor-pointer"
            />
          </label>

          {/* Clipboard Sync */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-900 cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5 text-xs">
              <Clipboard className="w-4 h-4 text-amber-400" />
              <div>
                <div className="font-semibold text-slate-200">{isRtl ? 'همگام‌سازی کلیپ‌بورد و متون' : 'Clipboard Synchronization'}</div>
                <div className="text-[10px] text-slate-500">{isRtl ? 'کپی و پیست متون بین دو سیستم' : 'Copy and paste text across devices'}</div>
              </div>
            </div>
            <input 
              type="checkbox" 
              checked={permissions.allowClipboard} 
              onChange={() => togglePermission('allowClipboard')}
              className="w-4 h-4 rounded accent-red-600 cursor-pointer"
            />
          </label>

          {/* File Transfer */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-900 cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5 text-xs">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="font-semibold text-slate-200">{isRtl ? 'انتقال و مدیریت فایل' : 'File Transfer & Downloads'}</div>
                <div className="text-[10px] text-slate-500">{isRtl ? 'اجازه دانلود و ارسال فایل در طول سشن' : 'Allow upload/download during remote session'}</div>
              </div>
            </div>
            <input 
              type="checkbox" 
              checked={permissions.allowFileTransfer} 
              onChange={() => togglePermission('allowFileTransfer')}
              className="w-4 h-4 rounded accent-red-600 cursor-pointer"
            />
          </label>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            {isRtl ? 'انصراف' : 'Cancel'}
          </button>
          <button
            onClick={handleApprove}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 flex items-center gap-2 hover:scale-102 active:scale-98 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{isRtl ? 'تایید دسترسی‌ها و شروع اشتراک صفحه' : 'Approve & Start Sharing'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
