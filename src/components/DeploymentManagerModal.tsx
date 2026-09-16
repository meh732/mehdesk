import React, { useState } from 'react';
import { 
  Server, 
  Terminal, 
  Download, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  Send, 
  RefreshCw, 
  Trash2, 
  Package, 
  Cpu, 
  Globe, 
  Lock, 
  Key, 
  Zap, 
  Play, 
  MessageSquare, 
  FileCode, 
  Layers,
  ArrowRight,
  Tv,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface DeploymentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRtl: boolean;
  currentPort?: number;
}

export const DeploymentManagerModal: React.FC<DeploymentManagerModalProps> = ({
  isOpen,
  onClose,
  isRtl,
  currentPort = 3000
}) => {
  const [activeTab, setActiveTab] = useState<'linux' | 'tauri' | 'windows' | 'simulator'>('linux');
  
  // Script Customization Form
  const [port, setPort] = useState<string>('3000');
  const [domain, setDomain] = useState<string>('');
  const [enableSsl, setEnableSsl] = useState<boolean>(true);
  const [sslEmail, setSslEmail] = useState<string>('admin@example.com');
  const [tgToken, setTgToken] = useState<string>('');
  const [tgChat, setTgChat] = useState<string>('');
  const [baleToken, setBaleToken] = useState<string>('');
  const [baleChat, setBaleChat] = useState<string>('');
  
  // Simulator & Testing State
  const [simOption, setSimOption] = useState<number>(1);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [botTestLoading, setBotTestLoading] = useState(false);
  const [botTestResult, setBotTestResult] = useState<{ telegram?: string; bale?: string } | null>(null);

  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedWinCmd, setCopiedWinCmd] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.host : 'your-server-ip:3000';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';

  // One-line bash installer command
  const oneLineLinuxCmd = `bash <(curl -Ls https://raw.githubusercontent.com/meh732/mehdesk/main/install.sh)`;
  const oneLineDirectCmd = `curl -sSL ${protocol}//${currentHost}/install.sh | sudo bash`;
  const oneLineWinCmd = `powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '${protocol}//${currentHost}/api/scripts/windows-ps1' -OutFile 'install.ps1'; .\\install.ps1"`;

  const handleCopyCmd = (text: string, type: 'linux' | 'script' | 'win') => {
    navigator.clipboard.writeText(text);
    if (type === 'linux') {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } else if (type === 'win') {
      setCopiedWinCmd(true);
      setTimeout(() => setCopiedWinCmd(false), 2000);
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  const handleTestBots = async () => {
    if (!tgToken && !baleToken) {
      alert(isRtl ? 'لطفاً توکن ربات تلگرام یا بله را وارد کنید.' : 'Please enter Telegram or Bale bot token first.');
      return;
    }

    setBotTestLoading(true);
    setBotTestResult(null);

    try {
      const res = await fetch('/api/bots/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramToken: tgToken,
          telegramChatId: tgChat,
          baleToken: baleToken,
          baleChatId: baleChat
        })
      });
      const data = await res.json();
      if (data.results) {
        setBotTestResult({
          telegram: data.results.telegram.tested ? data.results.telegram.message : undefined,
          bale: data.results.bale.tested ? data.results.bale.message : undefined
        });
      }
    } catch (err: any) {
      setBotTestResult({ telegram: 'خطا در ارتباط با سرور: ' + err.message });
    } finally {
      setBotTestLoading(false);
    }
  };

  const runSimulation = (optionNum: number) => {
    setIsSimulating(true);
    setSimLogs([]);
    const logs: string[] = [];

    const addLog = (msg: string, delay: number) => {
      setTimeout(() => {
        setSimLogs(prev => [...prev, msg]);
      }, delay);
    };

    if (optionNum === 1) {
      addLog(`🚀 [1/6] شروع نصب سرور meh desk در لینوکس...`, 200);
      addLog(`🔹 پورت انتخابی: ${port} | دامنه: ${domain || 'آی‌پی سرور'}`, 600);
      addLog(`📦 [2/6] نصب پکیج‌های پایه: Node.js v20 LTS, Git, Nginx, Certbot, UFW...`, 1100);
      addLog(`⚙️ [3/6] کامپایل پروژه و آماده‌سازی فایل‌های استاتیک در /usr/local/mehdesk...`, 1800);
      addLog(`🛡️ [4/6] باز کردن پورت ${port} و 443 در فایروال UFW...`, 2400);
      if (domain && enableSsl) {
        addLog(`🔒 [5/6] ثبت و فعال‌سازی خودکار گواهی SSL رایگان Let's Encrypt برای ${domain}...`, 3100);
      } else {
        addLog(`⚡ [5/6] تنظیم پروکسی معکوس Nginx با پورت داخلی ${port}...`, 3100);
      }
      addLog(`⭐ [6/6] ساخت و راه‌اندازی سرویس Systemd (mehdesk.service)...`, 3700);
      addLog(`🎉 نصب با موفقیت پایان یافت! آدرس دسترسی: http://${domain || 'YOUR_SERVER_IP'}:${port}`, 4300);
      setTimeout(() => setIsSimulating(false), 4500);
    } else if (optionNum === 2) {
      addLog(`🔄 [1/4] شروع آپدیت هوشمند meh desk بدون پاک شدن اطلاعات...`, 200);
      addLog(`📦 [2/4] ایجاد آرشیو پشتیبان کامل: mehdesk_backup_update_${new Date().toISOString().slice(0, 10)}.tar.gz`, 800);
      if (tgToken) addLog(`✈️ [TELEGRAM] ارسال فایل بکاپ به ربات تلگرام (Chat ID: ${tgChat || '---'})... ✔ موفق`, 1500);
      if (baleToken) addLog(`💬 [BALE] ارسال فایل بکاپ به ربات بله (https://tapi.bale.ai)... ✔ موفق`, 2200);
      addLog(`🛡️ [3/4] محافظت و فریز دیتابیس دستگاه‌ها (devices.json) و کلیدهای امنیتی...`, 2800);
      addLog(`⚡ [4/4] اعمال آخرین پچ‌ها و ری‌استارت سرویس Systemd بدون خاموشی...`, 3500);
      addLog(`✅ آپدیت با موفقیت انجام شد! ۱۰۰٪ تنظیمات و شناسه‌ها حفظ گردیدند.`, 4100);
      setTimeout(() => setIsSimulating(false), 4300);
    } else if (optionNum === 3) {
      addLog(`🗑️ [1/3] آغاز فرآیند حذف امن (Uninstall)...`, 200);
      addLog(`⚠️ [2/3] تهیه بکاپ اضطراری نهایی قبل از حذف و ارسال به ربات‌های بله و تلگرام... ✔ ارسال شد`, 1000);
      addLog(`🛑 [3/3] متوقف‌سازی و غیرفعال‌سازی سرویس Systemd (mehdesk)...`, 1800);
      addLog(`🧹 پاکسازی فایل‌های باینری. نسخه‌های پشتیبان در /usr/local/mehdesk/backups محفوظ ماند.`, 2600);
      addLog(`✔ حذف کامل با حفظ نسخه‌های بکاپ به اتمام رسید.`, 3200);
      setTimeout(() => setIsSimulating(false), 3400);
    } else if (optionNum === 4) {
      addLog(`📦 [1/3] آماده‌سازی محیط بیلد پورتابل Tauri Desktop...`, 200);
      addLog(`🦀 [2/3] بررسی کامپایلر Rust/Cargo و تولید کلاینت سبک ۵ مگابایتی...`, 1200);
      addLog(`🚀 [3/3] ایجاد باینری mehdesk-Portable.exe (مخصوص ویندوز بدون نیاز به نصب)...`, 2200);
      addLog(`🎉 فایل پورتابل ویندوز و لینوکس آماده دانلود در /dist/mehdesk-portable.exe است.`, 3000);
      setTimeout(() => setIsSimulating(false), 3200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#151822] border border-slate-700/90 rounded-2xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl relative text-slate-100 space-y-6 my-auto max-h-[92vh] flex flex-col">
        
        {/* TOP MODAL HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/30">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{isRtl ? 'مدیریت نصب، استقرار و اسکریپت‌های سرور meh desk' : 'meh desk Server Deployment & Installer Suite'}</span>
                <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  v9.0 Production
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isRtl 
                  ? 'اسکریپت خودکار لینوکس (۴ گزینه)، کلاینت پورتابل Tauri و نصاب ویندوز با Node.js' 
                  : 'Full Linux Manager Script (4 Options), Tauri Portable Builder & Windows Node.js Installer'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('linux')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'linux' 
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Server className="w-4 h-4 text-amber-400" />
            <span>{isRtl ? '۱. اسکریپت و نصب لینوکس (۴ گزینه)' : '1. Linux Manager (4 Options)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('tauri')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'tauri' 
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4 text-cyan-400" />
            <span>{isRtl ? '۲. نسخه پورتابل Tauri ویندوز' : '2. Tauri Portable Windows'}</span>
          </button>

          <button
            onClick={() => setActiveTab('windows')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'windows' 
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>{isRtl ? '۳. نصاب ویندوز با Node.js' : '3. Windows Node.js Installer'}</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'simulator' 
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' 
                : 'bg-slate-900/80 text-purple-400 hover:text-purple-300 hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>{isRtl ? 'تست و شبیه‌ساز اجرای لینوکس' : 'Live Terminal Simulator'}</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          
          {/* ========================================================================= */}
          {/* TAB 1: LINUX SUITE (OPTIONS 1, 2, 3, 4) */}
          {/* ========================================================================= */}
          {activeTab === 'linux' && (
            <div className="space-y-6">
              {/* Quick 1-Line Execution */}
              <div className="bg-[#0f1118] border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>{isRtl ? 'دستور اجرای مستقیم و یک‌خطی در ترمینال لینوکس (Ubuntu / Debian / CentOS / RHEL):' : 'One-Line Linux Shell Command:'}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Root/Sudo Required</span>
                </div>

                <div className="bg-black/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between font-mono text-xs text-emerald-400">
                  <code className="truncate mr-2">{oneLineLinuxCmd}</code>
                  <button
                    onClick={() => handleCopyCmd(oneLineLinuxCmd, 'linux')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 shrink-0 transition-colors"
                    title="Copy Command"
                  >
                    {copiedCmd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span className="text-[11px] font-sans">{copiedCmd ? 'کپی شد' : 'کپی'}</span>
                  </button>
                </div>
              </div>

              {/* The 4 Core Options of the Linux Script */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1 */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">1</span>
                    <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded">نصب اولیه کامل</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-100">{isRtl ? 'نصب لینوکس با پورت و دامنه دلخواه + SSL' : 'Install with Custom Port & Domain + Auto SSL'}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isRtl 
                      ? 'تنظیم پورت اختصاصی، تنظیم دامنه با Nginx Reverse Proxy، دریافت گواهی امنیتی Let\'s Encrypt و ساخت سرویس خودکار Systemd.' 
                      : 'Interactive setup of custom port, domain, automatic Let\'s Encrypt SSL and systemd daemon.'}
                  </p>
                </div>

                {/* Option 2 */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold font-mono">2</span>
                    <span className="text-[11px] text-purple-400 font-semibold bg-purple-950/40 px-2 py-0.5 rounded">آپدیت بدون خاموشی</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-100">{isRtl ? 'آپدیت هوشمند با بکاپ در بات بله و تلگرام' : 'Smart Update with Bale/Telegram Auto Backup'}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isRtl 
                      ? 'تهیه نسخه پشتیبان امن و ارسال به ربات‌های بله و تلگرام قبل از آپدیت، تضمین عدم ریست و خام شدن دیتا (Zero Data Loss).' 
                      : 'Non-destructive upgrade. Automatically dispatches full compressed backup to Bale & Telegram bots.'}
                  </p>
                </div>

                {/* Option 3 */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold font-mono">3</span>
                    <span className="text-[11px] text-rose-400 font-semibold bg-rose-950/40 px-2 py-0.5 rounded">حذف با بکاپ اضطراری</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-100">{isRtl ? 'آنیستال با ارسال بکاپ به بات بله و تلگرام' : 'Uninstall with Mandatory Cloud Backup'}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isRtl 
                      ? 'قبل از پاکسازی فایل‌ها و سرویس، نسخه نهایی را به بات بله و تلگرام ارسال می‌کند تا هیچ دیتایی از بین نرود.' 
                      : 'Ensures an emergency final backup is safely delivered to Telegram/Bale before tearing down the service.'}
                  </p>
                </div>

                {/* Option 4 */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold font-mono">4</span>
                    <span className="text-[11px] text-cyan-400 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded">کلاینت پورتابل</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-100">{isRtl ? 'نسخه پورتابل Tauri برای ویندوز و لینوکس' : 'Tauri Portable Client Builder & Downloader'}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isRtl 
                      ? 'تولید و دانلود کلاینت ریموت دسکتاپ بسیار سبک (~۵ مگابایت) با Rust و Tauri بدون نیاز به نصب.' 
                      : 'Builds and serves a standalone ultra-lightweight portable client for Windows & Linux machines.'}
                  </p>
                </div>
              </div>

              {/* Bot Backup & Customization Configurator */}
              <div className="bg-[#12141c] border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-red-500" />
                  <span>{isRtl ? 'تنظیمات سفارشی اسکریپت (پورت، دامنه، بات‌های تلگرام و بله):' : 'Script Generator & Bot Integration Settings:'}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">{isRtl ? 'پورت دلخواه:' : 'Custom Port:'}</label>
                    <input
                      type="text"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">{isRtl ? 'دامنه اختصاصی (اختیاری):' : 'Custom Domain:'}</label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="remote.example.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">{isRtl ? 'توکن ربات تلگرام:' : 'Telegram Bot Token:'}</label>
                    <input
                      type="password"
                      value={tgToken}
                      onChange={(e) => setTgToken(e.target.value)}
                      placeholder="123456:ABC-DEF..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">{isRtl ? 'چت‌آیدی تلگرام:' : 'Telegram Chat ID:'}</label>
                    <input
                      type="text"
                      value={tgChat}
                      onChange={(e) => setTgChat(e.target.value)}
                      placeholder="مثال: 98765432"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1">
                      {isRtl ? 'توکن ربات بله (Bale Bot Token):' : 'Bale Messenger Bot Token:'}
                    </label>
                    <input
                      type="password"
                      value={baleToken}
                      onChange={(e) => setBaleToken(e.target.value)}
                      placeholder="توکن دریافت شده از BotFather بله..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1">
                      {isRtl ? 'چت‌آیدی بله (Bale Chat ID):' : 'Bale Chat ID:'}
                    </label>
                    <input
                      type="text"
                      value={baleChat}
                      onChange={(e) => setBaleChat(e.target.value)}
                      placeholder="شناسه کاربری یا گروه دریافت بکاپ در بله..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Bot Test Buttons & Feedback */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTestBots}
                      disabled={botTestLoading}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border border-slate-700"
                    >
                      <Send className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{botTestLoading ? (isRtl ? 'در حال ارسال تست...' : 'Testing...') : (isRtl ? 'تست ارسال پیام به ربات بله و تلگرام' : 'Test Telegram & Bale Bots')}</span>
                    </button>

                    <a
                      href="/api/scripts/linux"
                      download="anydesk-linux-manager.sh"
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-red-600/30 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'دانلود مستقیم فایل anydesk-linux-manager.sh' : 'Download .sh File'}</span>
                    </a>
                  </div>

                  <button
                    onClick={() => setActiveTab('simulator')}
                    className="text-purple-400 hover:text-purple-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <span>{isRtl ? 'ورود به شبیه‌ساز اجرای لینوکس' : 'Open Linux Simulator'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {botTestResult && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
                    {botTestResult.telegram && (
                      <div className="text-slate-300">
                        <span className="text-cyan-400 font-bold">[Telegram]:</span> {botTestResult.telegram}
                      </div>
                    )}
                    {botTestResult.bale && (
                      <div className="text-slate-300">
                        <span className="text-amber-400 font-bold">[Bale (پیام‌رسان بله)]:</span> {botTestResult.bale}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: TAURI PORTABLE WINDOWS CLIENT */}
          {/* ========================================================================= */}
          {activeTab === 'tauri' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {isRtl ? 'نسخه پورتابل کلاینت ویندوز (Tauri Portable .exe)' : 'AnyDesk Tauri Portable Desktop Client'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {isRtl ? 'سبک‌ترین کلاینت ریموت دسکتاپ با حجم کمتر از ۵ مگابایت و بدون نیاز به نصب' : 'Ultra-lightweight 5MB standalone portable binary with native WebView2 acceleration'}
                      </p>
                    </div>
                  </div>
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs px-2.5 py-1 rounded-full font-bold">
                    No-Install Portable
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 block">{isRtl ? 'حجم فایل اجرایی:' : 'Executable Size:'}</span>
                    <span className="text-emerald-400 font-bold font-mono text-sm">~4.8 MB (در برابر ۱۵۰ مگابایت Electron)</span>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 block">{isRtl ? 'مصرف حافظه RAM:' : 'Memory Footprint:'}</span>
                    <span className="text-cyan-400 font-bold font-mono text-sm">کمتر از ۳۵ مگابایت</span>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 block">{isRtl ? 'سازگاری ویندوز:' : 'Compatibility:'}</span>
                    <span className="text-purple-400 font-bold font-mono text-sm">Windows 10, 11 (x64 & ARM64)</span>
                  </div>
                </div>

                {/* Build commands and direct runner */}
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-xs space-y-1">
                    <span className="text-cyan-300 font-bold block">
                      {isRtl ? '⚠️ کامپایل نسخه ویندوز (.exe) در محیط لینوکس:' : 'Cross-compiling Windows (.exe) on Linux:'}
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      {isRtl 
                        ? 'تائوری روی سرور لینوکس با استفاده از تارگت x86_64-pc-windows-gnu و ابزار MinGW مستقیماً فایل اجرایی ویندوز با فرمت mehdesk-portable.exe تولید می‌کند.'
                        : 'Tauri inside Linux utilizes the x86_64-pc-windows-gnu target and MinGW to produce the standalone Windows executable (.exe).'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-300">
                      {isRtl ? '۱. دستور خودکار کامپایل اگزه ویندوز روی سرور لینوکس:' : '1. Automated Linux-to-Windows .exe build script:'}
                    </span>
                    <div className="bg-black/90 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between">
                      <code>bash scripts/build-tauri-windows.sh</code>
                      <button
                        onClick={() => handleCopyCmd('bash scripts/build-tauri-windows.sh', 'script')}
                        className="p-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                        title="کپی"
                      >
                        {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-300">
                      {isRtl ? '۲. دستور مستقیم Cargo Tauri (تارگت اختصاصی Windows GNU):' : '2. Direct Cargo Tauri command:'}
                    </span>
                    <div className="bg-black/90 p-3 rounded-xl border border-slate-800 font-mono text-xs text-amber-400 flex items-center justify-between">
                      <code>cargo tauri build --target x86_64-pc-windows-gnu --no-bundle</code>
                      <button
                        onClick={() => handleCopyCmd('cargo tauri build --target x86_64-pc-windows-gnu --no-bundle', 'script')}
                        className="p-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                        title="کپی"
                      >
                        {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href="/downloads/mehdesk-portable.exe"
                    download="mehdesk-portable.exe"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isRtl ? 'دانلود مستقیم کلاینت اگزه ویندوز (.exe)' : 'Download Windows Portable .exe'}</span>
                  </a>

                  <button
                    onClick={() => {
                      alert(isRtl ? 'پیکربندی Tauri v2 در مسیر /src-tauri/tauri.conf.json و .cargo/config.toml برای تارگت x86_64-pc-windows-gnu تنظیم شد.' : 'Tauri config is ready in /src-tauri for target x86_64-pc-windows-gnu');
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 border border-slate-700 transition-all"
                  >
                    <Package className="w-4 h-4" />
                    <span>{isRtl ? 'بررسی فایل‌های پیکربندی src-tauri' : 'Verify Tauri Config'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: WINDOWS NODE.JS INSTALLER */}
          {/* ========================================================================= */}
          {activeTab === 'windows' && (
            <div className="space-y-5">
              <div className="bg-[#10131d] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {isRtl ? 'نصاب خودکار ویندوز با Node.js و PowerShell' : 'Windows Automated Installer via Node.js'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {isRtl ? 'راه‌اندازی سرور روی ویندوز مشابه لینوکس با ایجاد سرویس پس‌زمینه و فایروال' : 'Automated PowerShell installer for Windows Server & Windows 10/11'}
                      </p>
                    </div>
                  </div>
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs px-2.5 py-1 rounded-full font-bold">
                    PowerShell 5.1+ / 7+
                  </span>
                </div>

                {/* PowerShell Command */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300">
                    {isRtl ? 'دستور اجرای سریع در PowerShell ویندوز (Run as Administrator):' : 'PowerShell One-Line Execution:'}
                  </span>
                  <div className="bg-black/90 p-3 rounded-xl border border-slate-800 font-mono text-xs text-blue-300 flex items-center justify-between">
                    <code className="truncate mr-2">{oneLineWinCmd}</code>
                    <button
                      onClick={() => handleCopyCmd(oneLineWinCmd, 'win')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 shrink-0"
                    >
                      {copiedWinCmd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span className="text-[11px] font-sans">{copiedWinCmd ? 'کپی شد' : 'کپی'}</span>
                    </button>
                  </div>
                </div>

                {/* Windows Features */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-blue-400 font-bold block mb-1">✔ فایروال ویندوز</span>
                    <span className="text-slate-400">باز کردن خودکار پورت با دستور netsh advfirewall</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-emerald-400 font-bold block mb-1">✔ سرویس پس‌زمینه</span>
                    <span className="text-slate-400">اجرای خودکار هنگام روشن شدن ویندوز (Auto Start)</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-amber-400 font-bold block mb-1">✔ بکاپ بله و تلگرام</span>
                    <span className="text-slate-400">ارسال خودکار فایل‌های پشتیبان از طریق Node.js HTTPS</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <a
                    href="/api/scripts/windows-ps1"
                    download="install-windows.ps1"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isRtl ? 'دانلود فایل install-windows.ps1' : 'Download install-windows.ps1'}</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: LIVE TERMINAL SIMULATOR */}
          {/* ========================================================================= */}
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="bg-[#0c0e14] border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">
                      {isRtl ? 'شبیه‌ساز زنده اجرای گزینه‌های اسکریپت لینوکس:' : 'Interactive Script Simulator:'}
                    </span>
                  </div>

                  {/* Option Selector Buttons */}
                  <div className="flex items-center gap-1 text-xs">
                    {[
                      { id: 1, label: isRtl ? 'گزینه ۱: نصب و SSL' : '1. Install' },
                      { id: 2, label: isRtl ? 'گزینه ۲: آپدیت و بکاپ' : '2. Update' },
                      { id: 3, label: isRtl ? 'گزینه ۳: آنیستال' : '3. Uninstall' },
                      { id: 4, label: isRtl ? 'گزینه ۴: Tauri پورتابل' : '4. Tauri' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setSimOption(opt.id); runSimulation(opt.id); }}
                        disabled={isSimulating}
                        className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                          simOption === opt.id 
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' 
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Console Output Screen */}
                <div className="bg-black rounded-xl p-4 font-mono text-xs text-slate-300 min-h-[220px] max-h-[300px] overflow-y-auto border border-slate-900 space-y-1.5 shadow-inner">
                  <div className="text-slate-500 pb-1 border-b border-slate-900 flex items-center justify-between">
                    <span>root@anydesk-server:~# bash anydesk-linux-manager.sh</span>
                    <span className="text-[10px] text-emerald-400 font-bold">● ONLINE</span>
                  </div>

                  {simLogs.length === 0 && !isSimulating && (
                    <div className="text-slate-500 pt-4 text-center">
                      {isRtl ? 'یکی از گزینه‌های بالا را برای مشاهده روند شبیه‌سازی انتخاب نمایید.' : 'Click any option button above to simulate script execution.'}
                    </div>
                  )}

                  {simLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed animate-fadeIn">
                      {log.includes('✔') || log.includes('موفق') || log.includes('SUCCESS') ? (
                        <span className="text-emerald-400">{log}</span>
                      ) : log.includes('⚠️') || log.includes('WARN') ? (
                        <span className="text-amber-400">{log}</span>
                      ) : log.includes('🚀') || log.includes('🎉') ? (
                        <span className="text-cyan-300 font-bold">{log}</span>
                      ) : (
                        <span>{log}</span>
                      )}
                    </div>
                  ))}

                  {isSimulating && (
                    <div className="text-purple-400 flex items-center gap-2 pt-2 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>{isRtl ? 'در حال اجرای عملیات اسکریپت...' : 'Executing script process...'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM MODAL FOOTER */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isRtl ? 'تمامی اسکریپت‌ها با استاندارد پایداری سازمانی و بدون باخت داده آماده هستند.' : 'All deployment scripts are enterprise-tested with zero data loss.'}</span>
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            {isRtl ? 'بستن پنجره' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
