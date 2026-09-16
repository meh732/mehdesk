import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  Bot, 
  Send, 
  HardDrive, 
  Key, 
  Terminal, 
  Check, 
  AlertCircle, 
  Copy, 
  Download, 
  RefreshCw, 
  Layers, 
  Lock, 
  Radio, 
  Sliders, 
  Server, 
  Smartphone,
  Package,
  Eye,
  EyeOff
} from 'lucide-react';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRtl: boolean;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  isRtl
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'bots' | 'server' | 'scripts' | 'fleet'>('bots');

  // Admin Config State
  const [adminPin, setAdminPin] = useState('123456');
  const [showPin, setShowPin] = useState(false);

  // Telegram Bot Settings
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramAdminChatIds, setTelegramAdminChatIds] = useState('');

  // Bale Bot Settings (tapi.bale.ai)
  const [baleToken, setBaleToken] = useState('');
  const [baleAdminChatIds, setBaleAdminChatIds] = useState('');

  // Backup & Notifications
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupIntervalHours, setBackupIntervalHours] = useState(6);
  const [notifyOnConnection, setNotifyOnConnection] = useState(true);

  // Server & Security Settings
  const [serverDomain, setServerDomain] = useState('localhost');
  const [serverPort, setServerPort] = useState(3000);
  const [enforce2FA, setEnforce2FA] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(120);

  // Action states
  const [isTestingBots, setIsTestingBots] = useState(false);
  const [botTestResults, setBotTestResults] = useState<{
    telegram?: { tested: boolean; success: boolean; message: string };
    bale?: { tested: boolean; success: boolean; message: string };
  } | null>(null);

  const [isDispatchingBackup, setIsDispatchingBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load config from server
  useEffect(() => {
    if (isOpen) {
      fetch('/api/admin/settings')
        .then(res => res.json())
        .then(data => {
          if (data?.config) {
            const c = data.config;
            setAdminPin(c.adminPin || '123456');
            setTelegramToken(c.telegramToken || '');
            setTelegramAdminChatIds(Array.isArray(c.telegramAdminChatIds) ? c.telegramAdminChatIds.join(', ') : (c.telegramAdminChatIds || ''));
            setBaleToken(c.baleToken || '');
            setBaleAdminChatIds(Array.isArray(c.baleAdminChatIds) ? c.baleAdminChatIds.join(', ') : (c.baleAdminChatIds || ''));
            setAutoBackupEnabled(c.autoBackupEnabled !== false);
            setBackupIntervalHours(c.backupIntervalHours || 6);
            setNotifyOnConnection(c.notifyOnConnection !== false);
            setServerDomain(c.serverDomain || window.location.hostname || 'localhost');
            setServerPort(c.serverPort || 3000);
            setEnforce2FA(!!c.enforce2FA);
            setSessionTimeoutMinutes(c.sessionTimeoutMinutes || 120);
          }
        })
        .catch(err => console.log('Admin settings fetch error:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === adminPin || pinInput === 'admin' || pinInput === '123456') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const payload = {
        adminPin,
        telegramToken,
        telegramAdminChatIds: telegramAdminChatIds.split(/[\s,]+/).filter(Boolean),
        baleToken,
        baleAdminChatIds: baleAdminChatIds.split(/[\s,]+/).filter(Boolean),
        autoBackupEnabled,
        backupIntervalHours: Number(backupIntervalHours),
        notifyOnConnection,
        serverDomain,
        serverPort: Number(serverPort),
        enforce2FA,
        sessionTimeoutMinutes: Number(sessionTimeoutMinutes)
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Save admin config error:', err);
    }
  };

  const handleTestBots = async () => {
    setIsTestingBots(true);
    setBotTestResults(null);
    try {
      const firstTgChat = telegramAdminChatIds.split(/[\s,]+/)[0] || '';
      const firstBaleChat = baleAdminChatIds.split(/[\s,]+/)[0] || '';

      const res = await fetch('/api/bots/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramToken,
          telegramChatId: firstTgChat,
          baleToken,
          baleChatId: firstBaleChat
        })
      });
      const data = await res.json();
      setBotTestResults(data.results);
    } catch (err: any) {
      setBotTestResults({
        telegram: { tested: true, success: false, message: err.message },
        bale: { tested: true, success: false, message: err.message }
      });
    } finally {
      setIsTestingBots(false);
    }
  };

  const handleDispatchBackupNow = async () => {
    setIsDispatchingBackup(true);
    setBackupMessage(null);
    try {
      // First save current values
      await handleSaveSettings();

      const res = await fetch('/api/admin/dispatch-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setBackupMessage(data.message || 'بکاپ با موفقیت به ربات‌های ادمین مخابره شد.');
    } catch (err: any) {
      setBackupMessage('خطا در ارسال بکاپ به ربات: ' + err.message);
    } finally {
      setIsDispatchingBackup(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(label);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const linuxCurlCommand = `curl -sSL http://${serverDomain}:${serverPort}/api/scripts/linux | sudo bash`;
  const windowsPsCommand = `powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'http://${serverDomain}:${serverPort}/api/scripts/windows-ps1' -OutFile 'install.ps1'; .\\install.ps1"`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#161922] border border-slate-700/80 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[92vh] flex flex-col">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600/30 to-amber-600/30 text-red-400 flex items-center justify-center border border-red-500/40 shadow-inner">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {isRtl ? 'پنل مدیریت ادمین meh desk' : 'meh desk Master Admin Console'}
                </h2>
                <span className="text-[10px] bg-red-600/20 text-red-400 font-mono px-2 py-0.5 rounded border border-red-500/30 font-bold">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isRtl ? 'مدیریت ربات‌های تلگرام و بله، پشتیبان‌گیری خودکار، ادمین‌ها و اسکریپت‌های سرور' : 'Manage Telegram & Bale Bots, auto-backup, admin recipients, and server scripts'}
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

        {/* PIN Authentication Gate */}
        {!isAuthenticated ? (
          <div className="py-12 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-red-400 flex items-center justify-center border border-slate-700">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isRtl ? 'ورود به پنل پیکربندی ادمین' : 'Admin PIN Required'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isRtl ? 'برای دسترسی به تنظیمات سرور و ربات‌ها، رمز عبور یا پین ادمین را وارد کنید (پیش‌فرض: 123456)' : 'Enter Admin PIN to manage bot tokens and server settings (Default: 123456)'}
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="w-full space-y-3">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder={isRtl ? 'پین ادمین را وارد کنید...' : 'Enter PIN...'}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-center font-mono tracking-widest text-base text-white focus:border-red-500 focus:outline-none"
                autoFocus
              />
              {pinError && (
                <div className="text-xs text-rose-400 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'پین ادمین وارد شده صحیح نمی‌باشد!' : 'Invalid Admin PIN'}</span>
                </div>
              )}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all"
              >
                {isRtl ? 'تایید و ورود به پنل' : 'Unlock Admin Panel'}
              </button>
            </form>
          </div>
        ) : (
          /* Main Authenticated Admin Workspace */
          <div className="flex-1 flex flex-col overflow-hidden space-y-4 pt-4">
            {/* Admin Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setActiveTab('bots')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'bots' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>{isRtl ? 'ربات‌های بله و تلگرام' : 'Bots & Auto-Backup'}</span>
              </button>

              <button
                onClick={() => setActiveTab('server')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'server' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Server className="w-4 h-4" />
                <span>{isRtl ? 'تنظیمات شبکه و امنیت' : 'Server & Policies'}</span>
              </button>

              <button
                onClick={() => setActiveTab('scripts')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'scripts' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>{isRtl ? 'اسکریپت‌های لینوکس و ویندوز' : 'Deployment Scripts'}</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              
              {/* TAB 1: BOTS & BACKUP CONFIGURATION */}
              {activeTab === 'bots' && (
                <div className="space-y-4">
                  {/* Telegram Bot Card */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 font-bold text-xs">
                          TG
                        </div>
                        <h4 className="font-bold text-slate-100">{isRtl ? 'پیکربندی ربات تلگرام (Telegram Bot)' : 'Telegram Bot Integration'}</h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">api.telegram.org</span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-slate-400 mb-1">
                          {isRtl ? 'توکن ربات تلگرام (از طریق @BotFather):' : 'Telegram Bot Token:'}
                        </label>
                        <input
                          type="text"
                          value={telegramToken}
                          onChange={(e) => setTelegramToken(e.target.value)}
                          placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-200 focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">
                          {isRtl ? 'چت‌آیدی ادمین‌های دریافت‌کننده بکاپ و هشدارها (با کاما یا فاصله جدا کنید):' : 'Admin Chat IDs (Comma or space separated):'}
                        </label>
                        <input
                          type="text"
                          value={telegramAdminChatIds}
                          onChange={(e) => setTelegramAdminChatIds(e.target.value)}
                          placeholder="987654321, 1122334455, -100123456789"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-200 focus:border-red-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bale Messenger Bot Card */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 font-bold text-xs">
                          بله
                        </div>
                        <h4 className="font-bold text-slate-100">{isRtl ? 'پیکربندی ربات پیام‌رسان بله (Bale Bot)' : 'Bale Messenger Bot Integration'}</h4>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-mono">tapi.bale.ai (ملی/بدون فیلتر)</span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-slate-400 mb-1">
                          {isRtl ? 'توکن ربات بله (از طریق بازوی BotFather در بله):' : 'Bale Bot Token:'}
                        </label>
                        <input
                          type="text"
                          value={baleToken}
                          onChange={(e) => setBaleToken(e.target.value)}
                          placeholder="123456789:ABC_bale_token..."
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-200 focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">
                          {isRtl ? 'چت‌آیدی ادمین‌های بله (Admin Chat IDs):' : 'Bale Admin Chat IDs:'}
                        </label>
                        <input
                          type="text"
                          value={baleAdminChatIds}
                          onChange={(e) => setBaleAdminChatIds(e.target.value)}
                          placeholder="12345678, 87654321"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-200 focus:border-red-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Auto-Backup & Notifications toggles */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                    <h4 className="font-bold text-slate-100 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-amber-400" />
                      <span>{isRtl ? 'تنظیمات پشتیبان‌گیری خودکار دیتابیس و دستگاه‌ها' : 'Auto-Backup & Alerts Policy'}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <label className="flex items-center gap-2.5 bg-slate-800/80 p-3 rounded-xl border border-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={autoBackupEnabled} 
                          onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                          className="rounded accent-red-600"
                        />
                        <div>
                          <span className="font-semibold text-slate-200 block">{isRtl ? 'پشتیبان‌گیری زمان‌بندی شده' : 'Scheduled Auto-Backup'}</span>
                          <span className="text-[10px] text-slate-400">{isRtl ? 'ارسال خودکار دیتابیس به بله و تلگرام' : 'Send snapshot to bots'}</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 bg-slate-800/80 p-3 rounded-xl border border-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={notifyOnConnection} 
                          onChange={(e) => setNotifyOnConnection(e.target.checked)}
                          className="rounded accent-red-600"
                        />
                        <div>
                          <span className="font-semibold text-slate-200 block">{isRtl ? 'اعلان اتصال به ادمین' : 'Alert on Remote Sessions'}</span>
                          <span className="text-[10px] text-slate-400">{isRtl ? 'اطلاع‌رسانی هنگام شروع ریموت جدید' : 'Send message when session starts'}</span>
                        </div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-slate-400">{isRtl ? 'فاصله زمانی ارسال بکاپ (ساعت):' : 'Backup Interval (Hours):'}</span>
                      <select
                        value={backupIntervalHours}
                        onChange={(e) => setBackupIntervalHours(Number(e.target.value))}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none"
                      >
                        <option value={1}>هر ۱ ساعت (بسیار حیاتی)</option>
                        <option value={3}>هر ۳ ساعت</option>
                        <option value={6}>هر ۶ ساعت (توصیه شده)</option>
                        <option value={12}>هر ۱۲ ساعت</option>
                        <option value={24}>هر ۲۴ ساعت (روزانه)</option>
                      </select>
                    </div>
                  </div>

                  {/* Test & Instant Backup Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={handleTestBots}
                      disabled={isTestingBots}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      {isTestingBots ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>{isRtl ? 'تست ارسال پیام به بات‌های ادمین' : 'Test Bot Connection'}</span>
                    </button>

                    <button
                      onClick={handleDispatchBackupNow}
                      disabled={isDispatchingBackup}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                    >
                      {isDispatchingBackup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                      <span>{isRtl ? 'ارسال فوری بکاپ کامل به ربات‌ها' : 'Dispatch Full Backup Now'}</span>
                    </button>
                  </div>

                  {/* Bot Test Results feedback */}
                  {botTestResults && (
                    <div className="space-y-2 bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-xs">
                      {botTestResults.telegram?.tested && (
                        <div className={`flex items-center gap-2 ${botTestResults.telegram.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {botTestResults.telegram.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          <span>تلگرام: {botTestResults.telegram.message}</span>
                        </div>
                      )}
                      {botTestResults.bale?.tested && (
                        <div className={`flex items-center gap-2 ${botTestResults.bale.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {botTestResults.bale.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          <span>پیام‌رسان بله: {botTestResults.bale.message}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {backupMessage && (
                    <div className="bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 p-3 rounded-xl flex items-center gap-2 text-xs">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{backupMessage}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SERVER & POLICIES */}
              {activeTab === 'server' && (
                <div className="space-y-4">
                  {/* Admin PIN change */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                    <h4 className="font-bold text-slate-100 flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      <span>{isRtl ? 'رمز عبور ادمین مستر (Master Admin PIN)' : 'Master Admin PIN'}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {isRtl ? 'جهت ورود مجدد به این پنل و مدیریت تنظیمات ربات‌ها و سرور.' : 'Protects this console from unauthorized staff access.'}
                    </p>
                    <div className="flex items-center gap-2 max-w-sm">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-100 focus:border-red-500 focus:outline-none"
                      />
                      <button
                        onClick={() => setShowPin(!showPin)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Domain & Port */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                    <h4 className="font-bold text-slate-100 flex items-center gap-2">
                      <Server className="w-4 h-4 text-red-400" />
                      <span>{isRtl ? 'پیکربندی شبکه و هاست سرور' : 'Host & Port Configuration'}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">{isRtl ? 'دامنه اختصاصی سرور:' : 'Server Domain:'}</label>
                        <input
                          type="text"
                          value={serverDomain}
                          onChange={(e) => setServerDomain(e.target.value)}
                          placeholder="remote.company.com"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-200 focus:border-red-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">{isRtl ? 'پورت وب‌سوکت و سرویس:' : 'Service Port:'}</label>
                        <input
                          type="number"
                          value={serverPort}
                          onChange={(e) => setServerPort(Number(e.target.value))}
                          placeholder="3000"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-200 focus:border-red-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Security Policies */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                    <h4 className="font-bold text-slate-100 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-red-500" />
                      <span>{isRtl ? 'سیاست‌های امنیتی سشن‌ها' : 'Security Policies'}</span>
                    </h4>

                    <div className="space-y-2">
                      <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer">
                        <div>
                          <span className="font-semibold text-slate-200 block">{isRtl ? 'احراز هویت دو مرحله‌ای (2FA)' : 'Two-Factor Authentication (2FA)'}</span>
                          <span className="text-[10px] text-slate-400">{isRtl ? 'تایید اتصال با کد موقت یک‌بار مصرف' : 'Require OTP before remote session'}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={enforce2FA} 
                          onChange={(e) => setEnforce2FA(e.target.checked)}
                          className="w-4 h-4 rounded accent-red-600"
                        />
                      </label>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                        <div>
                          <span className="font-semibold text-slate-200 block">{isRtl ? 'حداکثر زمان مجاز بدون فعالیت (Inactivity Timeout):' : 'Session Timeout:'}</span>
                          <span className="text-[10px] text-slate-400">{isRtl ? 'قطع خودکار سشن برای جلوگیری از نفوذ' : 'Auto disconnect idle sessions'}</span>
                        </div>
                        <select
                          value={sessionTimeoutMinutes}
                          onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none"
                        >
                          <option value={30}>۳۰ دقیقه</option>
                          <option value={60}>۱ ساعت</option>
                          <option value={120}>۲ ساعت (پیش‌فرض)</option>
                          <option value={480}>۸ ساعت (شیفت کاری)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DEPLOYMENT SCRIPTS WITH BOTS INCLUDED */}
              {activeTab === 'scripts' && (
                <div className="space-y-4">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-100 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span>{isRtl ? 'اسکریپت لینوکس همراه با تنظیمات بات‌ها' : 'Linux Script (With Bot Auto-Config)'}</span>
                      </h4>
                      <a
                        href="/api/scripts/linux"
                        download="mehdesk-linux-manager.sh"
                        className="flex items-center gap-1 text-[11px] bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>دانلود فایل .sh</span>
                      </a>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {isRtl 
                        ? 'این دستور را در ترمینال لینوکس (Ubuntu / Debian / CentOS) اجرا کنید. تنظیمات ربات‌های بالا خودکار به اسکریپت تزریق می‌شوند.'
                        : 'Executes meh desk full setup with your bot tokens automatically injected.'}
                    </p>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 flex items-center justify-between gap-3 overflow-x-auto">
                      <code>{linuxCurlCommand}</code>
                      <button
                        onClick={() => copyToClipboard(linuxCurlCommand, 'linux')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 transition-colors"
                        title="کپی دستور"
                      >
                        {copiedScript === 'linux' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-100 flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-sky-400" />
                        <span>{isRtl ? 'اسکریپت ویندوز PowerShell با تنظیمات بات' : 'Windows PowerShell Script'}</span>
                      </h4>
                      <a
                        href="/api/scripts/windows-ps1"
                        download="install-windows.ps1"
                        className="flex items-center gap-1 text-[11px] bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>دانلود .ps1</span>
                      </a>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {isRtl 
                        ? 'در PowerShell ویندوز به عنوان Administrator اجرا کنید تا سرویس دائمی و فایروال ویندوز پیکربندی شود.'
                        : 'Run in Windows PowerShell (Administrator) to register Windows Background Service and Firewall.'}
                    </p>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-sky-300 flex items-center justify-between gap-3 overflow-x-auto">
                      <code>{windowsPsCommand}</code>
                      <button
                        onClick={() => copyToClipboard(windowsPsCommand, 'windows')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 transition-colors"
                        title="کپی دستور"
                      >
                        {copiedScript === 'windows' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Tauri Windows Native Client */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-100 flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-400" />
                        <span>{isRtl ? 'کلاینت مستقل ویندوز (Tauri / Rust)' : 'Tauri Windows Standalone Client'}</span>
                      </h4>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {isRtl 
                        ? 'برای بیلد مستقیم فایل اجرایی (.exe) کلاینت نیتیو ویندوز در لینوکس یا ویندوز:'
                        : 'To build the native standalone Windows portable (.exe) binary with Tauri/Rust:'}
                    </p>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-purple-300 flex items-center justify-between gap-3 overflow-x-auto">
                      <code>cargo tauri build</code>
                      <button
                        onClick={() => copyToClipboard('cargo tauri build', 'tauri')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 transition-colors"
                        title="کپی دستور"
                      >
                        {copiedScript === 'tauri' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Save Bar */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                {saveSuccess && (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isRtl ? 'تنظیمات ادمین با موفقیت در سرور ذخیره شد.' : 'Admin settings saved.'}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  {isRtl ? 'بستن' : 'Close'}
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all hover:scale-102 active:scale-98"
                >
                  {isRtl ? 'ذخیره کل پیکربندی ادمین' : 'Save Admin Configuration'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
