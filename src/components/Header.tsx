import React from 'react';
import { 
  Tv, 
  Smartphone, 
  ShieldCheck, 
  Sparkles, 
  Settings, 
  Share2, 
  Globe, 
  Wifi, 
  Layers,
  Server,
  ShieldAlert,
  Bot
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: 'dashboard' | 'devices' | 'host' | 'terminal' | 'file-manager' | 'session';
  setActiveTab: (tab: any) => void;
  openQrModal: () => void;
  openSettingsModal: () => void;
  openAdminModal: () => void;
  openAiAssistant: () => void;
  openDeployModal: () => void;
  isHosting: boolean;
  localId: string;
  isRtl: boolean;
  setIsRtl: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  openQrModal,
  openSettingsModal,
  openAdminModal,
  openAiAssistant,
  openDeployModal,
  isHosting,
  localId,
  isRtl,
  setIsRtl
}) => {
  return (
    <header className="bg-[#161922] border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between select-none sticky top-0 z-40 shadow-lg shadow-black/20">
      {/* Brand & ID Info */}
      <div className="flex items-center gap-3">
        <div 
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-md shadow-red-600/30 group-hover:scale-105 transition-transform">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white font-['Plus_Jakarta_Sans']">meh desk</span>
              <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-500/30">v9.0</span>
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{isRtl ? 'آنلاین و آماده اتصال' : 'Online & Ready'}</span>
              <span className="text-slate-600 mx-1">|</span>
              <span className="text-slate-300 font-mono font-medium">{localId}</span>
            </div>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-medium mr-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'dashboard' 
                ? 'bg-red-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{isRtl ? 'داشبورد اصلی' : 'Dashboard'}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'devices' 
                ? 'bg-red-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isRtl ? 'دفترچه سیستم‌ها' : 'Address Book'}</span>
          </button>

          <button
            onClick={() => setActiveTab('host')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'host' 
                ? 'bg-red-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="relative">
              {isRtl ? 'میزبانی صفحه این سیستم' : 'Host My Screen'}
              {isHosting && (
                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              )}
            </span>
          </button>
        </nav>
      </div>

      {/* Action Utilities & Mobile QR */}
      <div className="flex items-center gap-2">
        {/* PWA Direct Install Button for Phone / PC */}
        <PWAInstallButton isRtl={isRtl} />

        {/* Admin Settings & Bot Console Button */}
        <button
          onClick={openAdminModal}
          className="flex items-center gap-1.5 bg-gradient-to-r from-red-950/60 to-slate-900 hover:bg-red-900/50 border border-red-500/40 text-red-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm group"
          title={isRtl ? 'پنل ادمین، ربات‌های بله/تلگرام و بکاپ' : 'Admin Console, Bale/Telegram Bots & Backup'}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">{isRtl ? 'پنل ادمین و بات‌ها' : 'Admin Bots'}</span>
        </button>

        {/* Linux / Windows Deployment Suite Button */}
        <button
          onClick={openDeployModal}
          className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm group"
          title={isRtl ? 'اسکریپت‌های نصب لینوکس، نسخه پورتابل Tauri و نصاب ویندوز' : 'Server Deployment Scripts & Tauri Suite'}
        >
          <Server className="w-3.5 h-3.5 text-slate-400 group-hover:scale-110 transition-transform" />
          <span className="hidden lg:inline">{isRtl ? 'اسکریپت و نصب سرور' : 'Deploy & Scripts'}</span>
        </button>

        {/* Mobile Quick Connect Button */}
        <button
          onClick={openQrModal}
          className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm group"
          title={isRtl ? 'اتصال سریع با گوشی موبایل' : 'Connect with Mobile Phone'}
        >
          <Smartphone className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">{isRtl ? 'ریموت با موبایل' : 'Mobile Connect'}</span>
        </button>

        {/* AI Assistant Button */}
        <button
          onClick={openAiAssistant}
          className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm"
          title={isRtl ? 'پشتیبان هوشمند IT و عیب‌یابی' : 'AI IT Helpdesk & Diagnostics'}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span className="hidden xl:inline">{isRtl ? 'دستیار AI' : 'AI Copilot'}</span>
        </button>

        {/* Language switch */}
        <button
          onClick={() => {
            const nextRtl = !isRtl;
            setIsRtl(nextRtl);
            document.documentElement.setAttribute('dir', nextRtl ? 'rtl' : 'ltr');
            document.documentElement.setAttribute('lang', nextRtl ? 'fa' : 'en');
          }}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1"
          title={isRtl ? 'تغییر زبان به English' : 'Change Language to Persian'}
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold">{isRtl ? 'FA' : 'EN'}</span>
        </button>

        {/* User Settings button */}
        <button
          onClick={openSettingsModal}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-colors"
          title={isRtl ? 'تنظیمات کاربر' : 'User Settings'}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

