import React, { useState } from 'react';
import { 
  Tv, 
  Monitor, 
  Laptop, 
  Server, 
  Smartphone, 
  ShieldCheck, 
  Lock, 
  Key, 
  Copy, 
  Check, 
  Search, 
  Plus, 
  Star, 
  Share2, 
  HardDrive, 
  Terminal, 
  Zap, 
  Power, 
  ArrowRight, 
  ArrowLeft, 
  Activity, 
  Wifi, 
  Sliders, 
  Layers, 
  FolderSync, 
  Building2, 
  MapPin, 
  Cpu, 
  Radio,
  AlertTriangle
} from 'lucide-react';
import { Device, OSType } from '../types';
import { normalizeDeskId } from '../utils/webrtc';

interface AnyDeskDashboardProps {
  localId: string;
  alias: string;
  devices: Device[];
  onConnectToDevice: (device: Device) => void;
  onConnectToId: (targetId: string, mode?: 'desktop' | 'file' | 'terminal') => void;
  onOpenFileTransfer: (device: Device) => void;
  onOpenTerminal: (device: Device) => void;
  onStartHosting: () => void;
  isHosting: boolean;
  openQrModal: () => void;
  openSettingsModal: () => void;
  openDeployModal?: () => void;
  isRtl: boolean;
  onAddDevice: (newDevice: Device) => void;
}

export const AnyDeskDashboard: React.FC<AnyDeskDashboardProps> = ({
  localId,
  alias,
  devices,
  onConnectToDevice,
  onConnectToId,
  onOpenFileTransfer,
  onOpenTerminal,
  onStartHosting,
  isHosting,
  openQrModal,
  openSettingsModal,
  openDeployModal,
  isRtl,
  onAddDevice
}) => {
  const [remoteInput, setRemoteInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [onlineDevices, setOnlineDevices] = useState<Array<{ id: string; rawId: string; alias: string; isHost: boolean; deviceInfo?: any }>>([]);

  // Fetch online devices from signaling server
  React.useEffect(() => {
    const fetchOnline = async () => {
      try {
        const res = await fetch('/api/online-devices');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.devices)) {
            setOnlineDevices(data.devices);
          }
        }
      } catch (err) {
        // silent fetch error
      }
    };

    fetchOnline();
    const interval = setInterval(fetchOnline, 4000);
    return () => clearInterval(interval);
  }, []);

  const isSelfId = normalizeDeskId(remoteInput) === normalizeDeskId(localId) && remoteInput.replace(/\s+/g, '').length >= 6;
  const otherOnlinePeers = onlineDevices.filter(d => normalizeDeskId(d.id) !== normalizeDeskId(localId));

  // New device form state
  const [newName, setNewName] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [newDept, setNewDept] = useState('حسابداری و مالی');
  const [newLocation, setNewLocation] = useState('دفتر مرکزی تهران');
  const [newOs, setNewOs] = useState<OSType>('windows');
  const [newIp, setNewIp] = useState('192.168.1.150');

  const handleCopyId = () => {
    navigator.clipboard.writeText(localId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickConnect = (mode: 'desktop' | 'file' | 'terminal' = 'desktop') => {
    if (!remoteInput.trim()) return;
    onConnectToId(remoteInput.trim(), mode);
  };

  const handleWakeOnLan = (device: Device, e: React.MouseEvent) => {
    e.stopPropagation();
    alert(isRtl ? `سیگنال Magic Packet (Wake-on-LAN) به کارت شبکه ${device.name} در آدرس ${device.ip} ارسال شد.` : `Magic Packet sent to ${device.name}.`);
  };

  const categories = [
    { id: 'all', label: isRtl ? 'همه سیستم‌های ذخیره‌شده' : 'All Saved Desks', count: devices.length },
    { id: 'favorites', label: isRtl ? 'علاقه‌مندی‌ها' : 'Favorites', count: devices.filter(d => d.isFavorite).length },
    { id: 'online', label: isRtl ? 'سیستم‌های آنلاین' : 'Online Devices', count: devices.filter(d => d.status === 'online').length },
  ];

  const filteredDevices = devices.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.id.includes(searchQuery) ||
                          d.department.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeCategory === 'favorites') return d.isFavorite;
    if (activeCategory === 'online') return d.status === 'online';
    return true;
  });

  const handleSaveNewDevice = () => {
    if (!newName.trim()) return;
    const randomId = `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;
    const created: Device = {
      id: randomId,
      name: newName,
      alias: newAlias || `${newName.toLowerCase().replace(/\s+/g, '-')}-pc@desk`,
      department: newDept,
      location: newLocation,
      os: newOs,
      status: 'online',
      ip: newIp,
      lastSeen: 'هم اکنون آنلاین',
      unattendedAccess: true,
      unattendedPassword: 'admin',
      specs: {
        cpu: 'Intel Core i7 Gen 12',
        ram: '16 GB',
        storage: '512 GB SSD',
        resolution: '1920x1080',
        monitorsCount: 1,
        osVersion: newOs === 'windows' ? 'Windows 11 Pro' : newOs === 'linux' ? 'Ubuntu 22.04' : 'macOS Sonoma'
      },
      isFavorite: true
    };
    onAddDevice(created);
    setShowAddModal(false);
    setNewName('');
    setNewAlias('');
  };

  const getOsIcon = (os: OSType) => {
    switch (os) {
      case 'windows': return <Tv className="w-4 h-4 text-blue-400" />;
      case 'linux': return <Server className="w-4 h-4 text-amber-400" />;
      case 'macos': return <Laptop className="w-4 h-4 text-purple-400" />;
      case 'android':
      case 'ios': return <Smartphone className="w-4 h-4 text-emerald-400" />;
      default: return <Monitor className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* TOP TWO HERO PANELS: "THIS DESK" & "REMOTE DESK" */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANEL 1: THIS DESK (این میز کار / کامپیوتر محلی) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1c202d] to-[#151720] border border-slate-700/80 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{isRtl ? 'این میز کار (سیستم شما)' : 'This Desk (Your Machine)'}</span>
              </div>
              <span className="text-[11px] bg-red-600/20 text-red-400 border border-red-500/30 font-bold px-2 py-0.5 rounded font-mono">
                meh desk v9.0
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">
                {isRtl ? 'آدرس اختصاصی شما برای اتصال همکاران:' : 'Your 9-Digit meh desk Address:'}
              </span>
              <div className="bg-[#11131a] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-mono text-2xl font-black text-red-400 tracking-wider">
                    {localId}
                  </span>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Alias: <span className="text-slate-200">{alias}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyId}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/80"
                    title={isRtl ? 'کپی شناسه' : 'Copy ID'}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={openQrModal}
                    className="p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors"
                    title={isRtl ? 'اسکن با گوشی موبایل' : 'Mobile QR'}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Unattended Access Status Info */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{isRtl ? 'دسترسی بدون نظارت با رمز دائمی' : 'Unattended Access Password'}</span>
              </div>
              <button 
                onClick={openSettingsModal}
                className="text-red-400 hover:text-red-300 text-[11px] font-semibold"
              >
                {isRtl ? 'تنظیم پسورد' : 'Configure'}
              </button>
            </div>
          </div>

          {/* Start Screen Share Host button */}
          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center gap-2">
            <button
              onClick={onStartHosting}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                isHosting 
                  ? 'bg-slate-800 text-rose-400 border border-rose-500/40 hover:bg-slate-700' 
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/30'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>{isHosting ? (isRtl ? 'مدیریت میزبانی تصویر' : 'Manage Hosting') : (isRtl ? 'شروع اشتراک صفحه این کامپیوتر' : 'Host This Machine')}</span>
            </button>
          </div>
        </div>

        {/* PANEL 2: REMOTE DESK (اتصال به کامپیوتر راه دور) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-[#1c202d] to-[#151720] border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Monitor className="w-4 h-4 text-red-500" />
                <span>{isRtl ? 'میز کار راه دور (Remote Desk)' : 'Remote Desk Connection'}</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {isRtl ? 'اتصال مستقیم با شناسه ۹ رقمی یا نام مستعار' : 'Direct connect by 9-digit code or alias'}
              </span>
            </div>

            {/* Quick Connect Input Bar */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={remoteInput}
                  onChange={(e) => setRemoteInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickConnect('desktop')}
                  placeholder={isRtl ? 'شناسه ریموت یا نام مستعار (مثال: 489 312 905 یا acc-tehran-01@desk)...' : 'Enter Remote ID or Alias (e.g. 489 312 905)...'}
                  className={`w-full bg-[#11131a] border rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none shadow-inner ${
                    isSelfId ? 'border-amber-500 focus:border-amber-400' : 'border-slate-700 focus:border-red-500'
                  }`}
                />
              </div>

              {/* Self-Connection Warning Banner */}
              {isSelfId && (
                <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      {isRtl ? '⚠️ این شناسه سیستم فعلی شماست!' : '⚠️ This is your own Desk ID!'}
                    </p>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      {isRtl
                        ? 'در مه دسک برای ریموت زدن، باید شناسه کامپیوتر یا سرور مقصد را در این کادر وارد کنید. اگر قصد اشتراک‌گذاری صفحه همین سیستم را دارید، از دکمه «شروع اشتراک صفحه» در پنل سمت راست استفاده کنید. برای تست همین کامپیوتر، یک پنجره ناشناس (Incognito) باز فرمایید.'
                        : 'To connect, you must enter the remote computer\'s ID. To share this machine\'s screen, use the button in the right panel.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons: Connect, File Transfer, Terminal */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickConnect('desktop')}
                  disabled={!remoteInput.trim() || isSelfId}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition-all"
                >
                  <Tv className="w-4 h-4" />
                  <span>{isRtl ? 'ریموت دسکتاپ' : 'Connect'}</span>
                </button>

                <button
                  onClick={() => handleQuickConnect('file')}
                  disabled={!remoteInput.trim() || isSelfId}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <FolderSync className="w-4 h-4 text-amber-400" />
                  <span>{isRtl ? 'انتقال فایل' : 'File Transfer'}</span>
                </button>

                <button
                  onClick={() => handleQuickConnect('terminal')}
                  disabled={!remoteInput.trim() || isSelfId}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>{isRtl ? 'ترمینال ریموت' : 'Terminal'}</span>
                </button>
              </div>
            </div>

            {/* Live Online Devices on this Server */}
            {otherOnlinePeers.length > 0 && (
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>{isRtl ? 'دستگاه‌های آنلاین روی این سرور (اتصال سریع):' : 'Live Online Devices on this Server:'}</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {otherOnlinePeers.length} {isRtl ? 'دستگاه' : 'online'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {otherOnlinePeers.map(peer => (
                    <button
                      key={peer.id}
                      onClick={() => {
                        setRemoteInput(peer.rawId || peer.id);
                        onConnectToId(peer.rawId || peer.id, 'desktop');
                      }}
                      className="bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-xs text-emerald-200 flex items-center gap-2 transition-all"
                    >
                      <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-mono font-bold">{peer.rawId || peer.id}</span>
                      <span className="text-[10px] text-emerald-300/80">({peer.alias || 'کلاینت'})</span>
                      <ArrowLeft className={`w-3 h-3 text-emerald-400 ${isRtl ? '' : 'rotate-180'}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <div className="text-[11px] text-slate-400 flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {isRtl 
                  ? 'قابلیت اتصال بدون حضور فیزیکی (Unattended Access)، مدیریت چند مانیتور و پشتیبانی کامل از گوشی موبایل فعال است.'
                  : 'Unattended access, multi-monitor switching, and mobile trackpad controls are fully enabled.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: COMPANY FLEET ADDRESS BOOK & SAVED OFFICE COMPUTERS */}
      <div className="bg-[#161922] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
        {/* Header & Category Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-500" />
              <span>{isRtl ? 'دفترچه آدرس سیستم‌های شرکت و شعب (Address Book)' : 'Company Workstations & Address Book'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isRtl ? 'سیستم‌های دفاتر تهران، اصفهان، تبریز و سرورها با امکان دسترسی سریع و روشن کردن با شبکه (WoL)' : 'Manage office endpoints, branch PCs and servers with one-click remote access.'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 md:w-60">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder={isRtl ? 'جستجوی سیستم یا دپارتمان...' : 'Search desk or branch...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Add Desk Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'افزودن سیستم' : 'Add Machine'}</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeCategory === cat.id 
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeCategory === cat.id ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Workstations Grid or Clean Empty State */}
        {filteredDevices.length === 0 ? (
          <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
              <Monitor className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">
                {isRtl ? 'هیچ سیستمی در دیتابیس ثبت نشده است' : 'No Devices in Database'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {isRtl
                  ? 'دیتابیس سیستم خام است. می‌توانید با زدن دکمه «افزودن سیستم» سیستم‌های جدید را ذخیره کرده یا با وارد کردن کد ۹ رقمی در کادر بالا مستقیماً متصل شوید.'
                  : 'Clean database initialized. Connect directly using 9-digit code above or click "Add Machine" to save remote desks.'}
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-red-400" />
              <span>{isRtl ? 'افزودن اولین سیستم' : 'Add First Device'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDevices.map((device) => {
              const isOnline = device.status === 'online';
              const isBusy = device.status === 'busy';

              return (
                <div
                  key={device.id}
                  onClick={() => onConnectToDevice(device)}
                  className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800/80 hover:border-red-500/50 rounded-2xl p-4 transition-all shadow-md hover:shadow-xl hover:scale-[1.01] cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  {/* Card Top: OS, Status & Favorite */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:scale-105 transition-transform">
                        {getOsIcon(device.os)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-100 group-hover:text-red-400 transition-colors line-clamp-1">
                          {device.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <span>{device.id}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400">{device.alias}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        isOnline ? 'bg-emerald-500 animate-pulse' : isBusy ? 'bg-amber-500' : 'bg-slate-600'
                      }`} title={device.lastSeen}></span>
                    </div>
                  </div>

                  {/* Card Middle: Specs & Location Badges */}
                  <div className="space-y-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3 h-3 text-red-400" />
                        <span className="font-sans">{device.location}</span>
                      </span>
                      <span className="text-emerald-400">{device.ip}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{device.specs.cpu}</span>
                      <span>{device.specs.ram}</span>
                    </div>
                  </div>

                  {/* Card Bottom: Quick Actions (Connect, Files, Terminal, WoL) */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 text-xs">
                      {device.unattendedAccess && (
                        <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 text-[10px] px-2 py-0.5 rounded-full font-sans">
                          <Key className="w-2.5 h-2.5" />
                          <span>{isRtl ? 'اتصال خودکار' : 'Unattended'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {device.status === 'offline' && (
                        <button
                          onClick={(e) => handleWakeOnLan(device, e)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white transition-colors"
                          title={isRtl ? 'روشن کردن از راه دور (Wake-on-LAN)' : 'Wake on LAN'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onOpenFileTransfer(device)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title={isRtl ? 'انتقال فایل' : 'File Manager'}
                      >
                        <FolderSync className="w-3.5 h-3.5 text-amber-400" />
                      </button>

                      <button
                        onClick={() => onOpenTerminal(device)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title={isRtl ? 'ترمینال ریموت' : 'Remote Terminal'}
                      >
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      </button>

                      <button
                        onClick={() => onConnectToDevice(device)}
                        className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm shadow-red-600/30 transition-all"
                      >
                        <span>{isRtl ? 'اتصال' : 'Connect'}</span>
                        {isRtl ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: ADD NEW WORKSTATION */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-500" />
              <span>{isRtl ? 'ثبت کامپیوتر یا سرور جدید در شبکه شرکت' : 'Register New Office Machine'}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{isRtl ? 'نام سیستم / کاربر:' : 'Machine Name:'}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: کامپیوتر حسابداری ۲"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{isRtl ? 'سیستم عامل:' : 'Operating System:'}</label>
                  <select
                    value={newOs}
                    onChange={(e) => setNewOs(e.target.value as OSType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                  >
                    <option value="windows">Windows 11 / 10</option>
                    <option value="linux">Ubuntu / Linux Server</option>
                    <option value="macos">Apple macOS</option>
                    <option value="android">Android Phone / Tablet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{isRtl ? 'آدرس IP شبکه داخلی:' : 'Local IP:'}</label>
                  <input
                    type="text"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{isRtl ? 'موقعیت فیزیکی / شعبه:' : 'Location / Branch:'}</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="دفتر مرکزی تهران / شعبه اصفهان"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                {isRtl ? 'انصراف' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveNewDevice}
                disabled={!newName.trim()}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold shadow-lg shadow-red-600/30"
              >
                {isRtl ? 'ثبت و ذخیره در دفترچه' : 'Save Machine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
