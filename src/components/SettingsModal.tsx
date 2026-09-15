import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Key, 
  Sliders, 
  Tv, 
  HardDrive, 
  Volume2, 
  Check, 
  AlertCircle,
  EyeOff,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import { SessionPermissions } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  localId: string;
  alias: string;
  setAlias: (val: string) => void;
  unattendedPassword: string;
  setUnattendedPassword: (val: string) => void;
  permissions: SessionPermissions;
  setPermissions: React.Dispatch<React.SetStateAction<SessionPermissions>>;
  isRtl: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  localId,
  alias,
  setAlias,
  unattendedPassword,
  setUnattendedPassword,
  permissions,
  setPermissions,
  isRtl
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'security' | 'display' | 'audio' | 'connection'>('security');
  const [savedAlert, setSavedAlert] = useState(false);

  if (!isOpen) return null;

  const handleTogglePermission = (key: keyof SessionPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    setSavedAlert(true);
    setTimeout(() => {
      setSavedAlert(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1d27] border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isRtl ? 'تنظیمات و پیکربندی AnyDesk' : 'AnyDesk Configuration & Settings'}
              </h2>
              <p className="text-xs text-slate-400">
                {isRtl ? 'مدیریت امنیت، دسترسی بدون نظارت و کیفیت استریم' : 'Manage security, unattended access and streaming presets'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 my-4 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('security')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'security' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isRtl ? 'امنیت و گذرواژه' : 'Security'}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('display')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'display' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{isRtl ? 'نمایش و کیفیت' : 'Display & Video'}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('audio')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'audio' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isRtl ? 'صدا و انتقال' : 'Audio & Transfer'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {activeSubTab === 'security' && (
            <div className="space-y-4">
              {/* ID and Custom Alias */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{isRtl ? 'شناسه و نام مستعار سیستم' : 'Client ID & Custom Alias'}</span>
                  <span className="font-mono bg-slate-800 px-2.5 py-1 rounded text-red-400 font-bold border border-slate-700">{localId}</span>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">{isRtl ? 'نام مستعار درون سازمانی (Alias):' : 'Custom Alias:'}</label>
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="my-pc-01@desk"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isRtl ? 'همکاران می‌توانند با این نام مستعار به جای کد ۹ رقمی متصل شوند.' : 'Colleagues can connect via this alias instead of 9-digit code.'}
                  </p>
                </div>
              </div>

              {/* Unattended Access Password */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-slate-200">
                    {isRtl ? 'دسترسی بدون نظارت (Unattended Access)' : 'Unattended Access Password'}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  {isRtl 
                    ? 'با تنظیم رمز عبور دائمی، می‌توانید حتی در صورتی که کسی پشت سیستم نباشد (مثلاً شب‌ها یا تعطیلات با گوشی) با وارد کردن این پسورد وارد شوید.'
                    : 'Allows remote connection without host manual confirmation using a fixed security password.'}
                </p>
                <div>
                  <label className="block text-slate-400 mb-1">{isRtl ? 'گذرواژه دسترسی بدون نظارت:' : 'Permanent Password:'}</label>
                  <input
                    type="password"
                    value={unattendedPassword}
                    onChange={(e) => setUnattendedPassword(e.target.value)}
                    placeholder={isRtl ? 'رمز عبور قوی وارد کنید...' : 'Enter strong password...'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Default Permissions for Incoming Guests */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="font-semibold text-slate-200 block">
                  {isRtl ? 'مجوزهای پیش‌فرض ریموت (Access Control List):' : 'Default Guest Permissions:'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800">
                    <input 
                      type="checkbox" 
                      checked={permissions.allowMouseKeyboard} 
                      onChange={() => handleTogglePermission('allowMouseKeyboard')}
                      className="rounded accent-red-600"
                    />
                    <span>{isRtl ? 'کنترل ماوس و کیبورد' : 'Allow Mouse & Keyboard'}</span>
                  </label>

                  <label className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800">
                    <input 
                      type="checkbox" 
                      checked={permissions.allowClipboard} 
                      onChange={() => handleTogglePermission('allowClipboard')}
                      className="rounded accent-red-600"
                    />
                    <span>{isRtl ? 'همگام‌سازی کلیپ‌بورد' : 'Synchronize Clipboard'}</span>
                  </label>

                  <label className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800">
                    <input 
                      type="checkbox" 
                      checked={permissions.allowFileTransfer} 
                      onChange={() => handleTogglePermission('allowFileTransfer')}
                      className="rounded accent-red-600"
                    />
                    <span>{isRtl ? 'انتقال و دانلود فایل' : 'Allow File Transfer'}</span>
                  </label>

                  <label className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800">
                    <input 
                      type="checkbox" 
                      checked={permissions.allowAudio} 
                      onChange={() => handleTogglePermission('allowAudio')}
                      className="rounded accent-red-600"
                    />
                    <span>{isRtl ? 'انتقال صدای سیستم' : 'Transmit Audio'}</span>
                  </label>

                  <label className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800">
                    <input 
                      type="checkbox" 
                      checked={permissions.allowRestart} 
                      onChange={() => handleTogglePermission('allowRestart')}
                      className="rounded accent-red-600"
                    />
                    <span>{isRtl ? 'اجازه ریستارت سیستم ریموت' : 'Allow Remote Restart'}</span>
                  </label>

                  <label className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800">
                    <input 
                      type="checkbox" 
                      checked={permissions.allowWhiteboard} 
                      onChange={() => handleTogglePermission('allowWhiteboard')}
                      className="rounded accent-red-600"
                    />
                    <span>{isRtl ? 'ابزار نقاشی و تخته وایت‌برد' : 'Allow On-Screen Whiteboard'}</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'display' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="font-semibold text-slate-200 block">
                  {isRtl ? 'کدک تصویر و الگوریتم فشرده‌سازی (DeskRT)' : 'Video Codec & Compression:'}
                </span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                    <div>
                      <div className="font-medium text-slate-200">DeskRT High Efficiency (توصیه شده)</div>
                      <div className="text-[11px] text-slate-400">تاخیر فوق‌العاده پایین (کمتر از ۱۶ میلی‌ثانیه)، مناسب اینترنت موبایل و دفتر</div>
                    </div>
                    <span className="text-emerald-400 text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50">
                    <div>
                      <div className="font-medium text-slate-200">H.264 / AV1 Hardware Accelerated</div>
                      <div className="text-[11px] text-slate-400">بهره‌گیری از پردازنده گرافیکی GPU برای کیفیت رنگ ۴:۴:۴ دقیق</div>
                    </div>
                    <span className="text-slate-400 text-xs">Ready</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-slate-200 block">
                  {isRtl ? 'صفحه خصوصی (Privacy Mode / Blank Screen)' : 'Privacy Mode (Blank Screen)'}
                </span>
                <p className="text-slate-400 text-[11px]">
                  {isRtl 
                    ? 'هنگامی که با موبایل یا سیستم دیگر ریموت می‌زنید، مانیتور فیزیکی کامپیوتر مقصد سیاه می‌شود تا افراد حاضر در دفتر متوجه کارهای شما نشوند.'
                    : 'Turns the physical remote display black during session so local users cannot see your activity.'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="privacy-toggle" defaultChecked className="rounded accent-red-600" />
                  <label htmlFor="privacy-toggle" className="text-slate-300">
                    {isRtl ? 'امکان فعال‌سازی پرده سیاه خصوصی در نوار ابزار' : 'Enable Privacy Screen button in toolbar'}
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'audio' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="font-semibold text-slate-200 block">
                  {isRtl ? 'انتقال صدای باکیفیت استریو Opus' : 'Opus High Quality Stereo Audio'}
                </span>
                <p className="text-slate-400 text-[11px]">
                  {isRtl 
                    ? 'صدای نرم‌افزارهای کامپیوتر مقصد با کیفیت ۴۸ کیلوهرتز به موبایل یا سیستم کنترل‌کننده مخابره می‌شود.'
                    : 'Streams remote PC audio to your client device with 48kHz sampling rate.'}
                </p>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800">
                  <span>{isRtl ? 'کیفیت صدای سیستم ریموت' : 'Audio Bitrate'}</span>
                  <span className="font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded">128 kbps Stereo</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            {savedAlert && (
              <>
                <Check className="w-4 h-4" />
                <span>{isRtl ? 'تنظیمات با موفقیت ذخیره شد.' : 'Settings saved successfully.'}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              {isRtl ? 'انصراف' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition-all"
            >
              {isRtl ? 'ذخیره و اعمال' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
