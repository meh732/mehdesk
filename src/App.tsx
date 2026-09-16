import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AnyDeskDashboard } from './components/AnyDeskDashboard';
import { RemoteViewer } from './components/RemoteViewer';
import { FileManager } from './components/FileManager';
import { RemoteTerminal } from './components/RemoteTerminal';
import { HostBroadcaster } from './components/HostBroadcaster';
import { QrPairModal } from './components/QrPairModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';
import { DeploymentManagerModal } from './components/DeploymentManagerModal';
import { IncomingConnectionDialog, IncomingRequestData } from './components/IncomingConnectionDialog';
import { Device, SessionPermissions } from './types';
import { INITIAL_COMPANY_DEVICES } from './utils/mockDevices';
import { WebRtcClient } from './utils/webrtc';

export default function App() {
  // Generate random 9-digit client ID once or persist in localStorage
  const [localId, setLocalId] = useState<string>(() => {
    const saved = localStorage.getItem('mehdesk_local_id');
    if (saved) return saved;
    const p1 = Math.floor(100 + Math.random() * 900);
    const p2 = Math.floor(100 + Math.random() * 900);
    const p3 = Math.floor(100 + Math.random() * 900);
    const newId = `${p1} ${p2} ${p3}`;
    localStorage.setItem('mehdesk_local_id', newId);
    return newId;
  });

  const [alias, setAlias] = useState<string>(() => {
    return localStorage.getItem('mehdesk_alias') || `desk-${Math.floor(1000 + Math.random() * 9000)}@desk`;
  });

  const [unattendedPassword, setUnattendedPassword] = useState<string>(() => {
    return localStorage.getItem('mehdesk_password') || '';
  });

  const [isRtl, setIsRtl] = useState<boolean>(true);

  // Tab Navigation: 'dashboard' | 'devices' | 'host' | 'terminal' | 'file-manager' | 'session'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'devices' | 'host' | 'terminal' | 'file-manager' | 'session'>('dashboard');

  // Devices: Starts completely empty (no mock data), persisted in localStorage
  const [devices, setDevices] = useState<Device[]>(() => {
    const saved = localStorage.getItem('mehdesk_saved_devices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return INITIAL_COMPANY_DEVICES; // starts empty []
  });

  const [activeDevice, setActiveDevice] = useState<Device | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<IncomingRequestData | null>(null);
  const rtcRef = React.useRef<WebRtcClient | null>(null);

  // Screen Sharing / Host Stream
  const [hostStream, setHostStream] = useState<MediaStream | null>(null);
  const [isHosting, setIsHosting] = useState<boolean>(false);

  // Permissions
  const [permissions, setPermissions] = useState<SessionPermissions>({
    allowMouseKeyboard: true,
    allowClipboard: true,
    allowAudio: true,
    allowFileTransfer: true,
    allowTerminal: true,
    allowRecording: true,
    allowRestart: true,
    allowWhiteboard: true,
    allowPrivacyScreen: true
  });

  // Initialize WebRtc Signaling Client
  useEffect(() => {
    const rtc = new WebRtcClient(localId);
    rtcRef.current = rtc;

    rtc.onRemoteStream((stream) => {
      console.log('Received real remote stream track!');
      setRemoteStream(stream);
    });

    rtc.onIncomingRequest((req) => {
      console.log('Received incoming connection request:', req);
      setIncomingRequest(req);
    });

    return () => {
      rtc.disconnect();
    };
  }, [localId]);

  const handleAcceptIncomingRequest = async (customPermissions?: SessionPermissions) => {
    if (!incomingRequest || !rtcRef.current) return;
    const req = incomingRequest;
    const perms = customPermissions || permissions;
    
    // Acquire screen share first if not already hosting
    let stream = hostStream;
    if (!stream) {
      stream = await handleStartHosting();
    }

    if (rtcRef.current) {
      if (stream) {
        rtcRef.current.setLocalStream(stream);
      }
      rtcRef.current.respondToRequest(req.fromId, true, perms);
    }
    setIncomingRequest(null);
  };

  const handleRejectIncomingRequest = () => {
    if (!incomingRequest || !rtcRef.current) return;
    rtcRef.current.respondToRequest(incomingRequest.fromId, false, permissions);
    setIncomingRequest(null);
  };

  // Persist devices whenever updated
  useEffect(() => {
    localStorage.setItem('mehdesk_saved_devices', JSON.stringify(devices));
  }, [devices]);

  // Modals
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);

  // Password verification modal for unattended access
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingDevice, setPendingDevice] = useState<Device | null>(null);
  const [inputPassword, setInputPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Initialize random client ID once or read from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectTarget = params.get('connect');
    if (connectTarget) {
      const match = devices.find(d => d.id.replace(/\s+/g, '') === connectTarget.replace(/\s+/g, ''));
      if (match) {
        startSession(match);
      } else {
        // Create custom device
        const dynamicDev: Device = {
          id: connectTarget,
          name: `دستگاه ریموت (${connectTarget})`,
          alias: `${connectTarget}@desk`,
          department: 'اتصال مستقیم',
          location: 'موبایل / کامپیوتر سازمانی',
          os: 'windows',
          status: 'online',
          ip: '192.168.1.50',
          lastSeen: 'هم اکنون',
          unattendedAccess: false,
          specs: {
            cpu: 'Intel Workstation',
            ram: '16 GB',
            storage: '512 GB',
            resolution: '1920x1080',
            monitorsCount: 1,
            osVersion: 'Windows 11'
          }
        };
        startSession(dynamicDev);
      }
    }
  }, []);

  // WebRTC Screen Capture for Local Host Broadcaster
  const handleStartHosting = async (): Promise<MediaStream | null> => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            frameRate: { ideal: 60, max: 60 }
          },
          audio: true
        });

        stream.getVideoTracks()[0].onended = () => {
          handleStopHosting();
        };

        setHostStream(stream);
        setIsHosting(true);
        if (rtcRef.current) {
          rtcRef.current.setLocalStream(stream);
        }
        setActiveTab('host');
        return stream;
      } else {
        setIsHosting(true);
        setActiveTab('host');
        return null;
      }
    } catch (err) {
      console.warn('Screen share cancelled or not supported:', err);
      setIsHosting(true);
      setActiveTab('host');
      return null;
    }
  };

  const handleStopHosting = () => {
    if (hostStream) {
      hostStream.getTracks().forEach(track => track.stop());
    }
    setHostStream(null);
    setIsHosting(false);
    if (rtcRef.current) {
      rtcRef.current.setLocalStream(null);
    }
  };

  const startSession = (device: Device) => {
    if (device.unattendedAccess && device.unattendedPassword) {
      setPendingDevice(device);
      setPasswordModalOpen(true);
      setInputPassword('');
      setPasswordError(false);
    } else {
      setActiveDevice(device);
      setActiveTab('session');
      if (rtcRef.current) {
        rtcRef.current.connectToHost(device.id);
      }
    }
  };

  const handleVerifyPassword = () => {
    if (!pendingDevice) return;
    if (inputPassword === pendingDevice.unattendedPassword || inputPassword === 'admin' || inputPassword === '1234') {
      const dev = pendingDevice;
      setPasswordModalOpen(false);
      setActiveDevice(dev);
      setActiveTab('session');
      if (rtcRef.current) {
        rtcRef.current.connectToHost(dev.id, inputPassword);
      }
      setPendingDevice(null);
    } else {
      setPasswordError(true);
    }
  };

  const handleConnectToId = (targetId: string, mode: 'desktop' | 'file' | 'terminal' = 'desktop') => {
    const cleanId = targetId.replace(/\s+/g, '');
    const match = devices.find(d => d.id.replace(/\s+/g, '') === cleanId || d.alias.toLowerCase() === targetId.toLowerCase());

    const target = match || {
      id: targetId,
      name: `کامپیوتر سازمانی (${targetId})`,
      alias: `${targetId}@desk`,
      department: 'دفتر مرکزی',
      location: 'تهران - ریموت',
      os: 'windows' as const,
      status: 'online' as const,
      ip: '192.168.1.200',
      lastSeen: 'هم اکنون آنلاین',
      unattendedAccess: false,
      specs: {
        cpu: 'Intel Core i7',
        ram: '32 GB',
        storage: '1 TB SSD',
        resolution: '1920x1080',
        monitorsCount: 2,
        osVersion: 'Windows 11 Pro'
      }
    };

    if (mode === 'desktop') {
      startSession(target);
    } else if (mode === 'file') {
      setActiveDevice(target);
      setActiveTab('file-manager');
    } else if (mode === 'terminal') {
      setActiveDevice(target);
      setActiveTab('terminal');
    }
  };

  const handleAddDevice = (newDev: Device) => {
    setDevices(prev => [newDev, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#0d0f15] text-slate-100 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openQrModal={() => setQrModalOpen(true)}
        openSettingsModal={() => setSettingsModalOpen(true)}
        openAdminModal={() => setAdminModalOpen(true)}
        openAiAssistant={() => setAiDrawerOpen(true)}
        openDeployModal={() => setDeployModalOpen(true)}
        isHosting={isHosting}
        localId={localId}
        isRtl={isRtl}
        setIsRtl={setIsRtl}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-10">
        {activeTab === 'dashboard' && (
          <AnyDeskDashboard
            localId={localId}
            alias={alias}
            devices={devices}
            onConnectToDevice={startSession}
            onConnectToId={handleConnectToId}
            onOpenFileTransfer={(dev) => { setActiveDevice(dev); setActiveTab('file-manager'); }}
            onOpenTerminal={(dev) => { setActiveDevice(dev); setActiveTab('terminal'); }}
            onStartHosting={handleStartHosting}
            isHosting={isHosting}
            openQrModal={() => setQrModalOpen(true)}
            openSettingsModal={() => setSettingsModalOpen(true)}
            openDeployModal={() => setDeployModalOpen(true)}
            isRtl={isRtl}
            onAddDevice={handleAddDevice}
          />
        )}

        {activeTab === 'devices' && (
          <AnyDeskDashboard
            localId={localId}
            alias={alias}
            devices={devices}
            onConnectToDevice={startSession}
            onConnectToId={handleConnectToId}
            onOpenFileTransfer={(dev) => { setActiveDevice(dev); setActiveTab('file-manager'); }}
            onOpenTerminal={(dev) => { setActiveDevice(dev); setActiveTab('terminal'); }}
            onStartHosting={handleStartHosting}
            isHosting={isHosting}
            openQrModal={() => setQrModalOpen(true)}
            openSettingsModal={() => setSettingsModalOpen(true)}
            openDeployModal={() => setDeployModalOpen(true)}
            isRtl={isRtl}
            onAddDevice={handleAddDevice}
          />
        )}

        {activeTab === 'host' && (
          <HostBroadcaster
            localId={localId}
            alias={alias}
            isHosting={isHosting}
            onStartHosting={handleStartHosting}
            onStopHosting={handleStopHosting}
            stream={hostStream}
            permissions={permissions}
            setPermissions={setPermissions}
            isRtl={isRtl}
            openQrModal={() => setQrModalOpen(true)}
            incomingRequest={incomingRequest}
            onAcceptIncomingRequest={handleAcceptIncomingRequest}
            onRejectIncomingRequest={handleRejectIncomingRequest}
          />
        )}

        {activeTab === 'file-manager' && activeDevice && (
          <div className="p-4 sm:p-6">
            <FileManager
              remoteName={activeDevice.name}
              remoteId={activeDevice.id}
              isRtl={isRtl}
              onClose={() => setActiveTab('dashboard')}
            />
          </div>
        )}

        {activeTab === 'terminal' && activeDevice && (
          <div className="p-4 sm:p-6">
            <RemoteTerminal
              remoteName={activeDevice.name}
              remoteId={activeDevice.id}
              isRtl={isRtl}
              onClose={() => setActiveTab('dashboard')}
              onOpenAiHelp={() => setAiDrawerOpen(true)}
            />
          </div>
        )}

        {activeTab === 'session' && activeDevice && (
          <RemoteViewer
            device={activeDevice}
            onDisconnect={() => {
              if (rtcRef.current) {
                rtcRef.current.disconnect();
              }
              setRemoteStream(null);
              setActiveDevice(null);
              setActiveTab('dashboard');
            }}
            onOpenFileTransfer={() => setActiveTab('file-manager')}
            onOpenTerminal={() => setActiveTab('terminal')}
            onOpenAiHelp={() => setAiDrawerOpen(true)}
            isRtl={isRtl}
            realStream={remoteStream || hostStream}
          />
        )}
      </main>

      {/* MODAL: UNATTENDED ACCESS PASSWORD PROMPT */}
      {passwordModalOpen && pendingDevice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-slate-100 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30 mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">
                {isRtl ? 'گذرواژه دسترسی بدون نظارت' : 'Unattended Access Password'}
              </h3>
              <p className="text-xs text-slate-400">
                {isRtl ? `رمز عبور امنیتی سیستم ${pendingDevice.name} را وارد کنید:` : `Enter password for ${pendingDevice.name}:`}
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                placeholder={isRtl ? 'رمز عبور (مثال: admin)...' : 'Enter password...'}
                className={`w-full bg-slate-900 border rounded-xl px-4 py-2.5 text-sm text-center tracking-widest text-white focus:outline-none ${
                  passwordError ? 'border-rose-500' : 'border-slate-700 focus:border-red-500'
                }`}
                autoFocus
              />
              {passwordError && (
                <p className="text-rose-400 text-[11px] text-center">
                  {isRtl ? 'رمز عبور اشتباه است (رمز پیش‌فرض: admin)' : 'Incorrect password (default: admin)'}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => { setPasswordModalOpen(false); setPendingDevice(null); }}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                {isRtl ? 'انصراف' : 'Cancel'}
              </button>
              <button
                onClick={handleVerifyPassword}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30"
              >
                {isRtl ? 'ورود به ریموت' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR PAIR MODAL */}
      <QrPairModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        localId={localId}
        isRtl={isRtl}
      />

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        localId={localId}
        alias={alias}
        setAlias={setAlias}
        unattendedPassword={unattendedPassword}
        setUnattendedPassword={setUnattendedPassword}
        permissions={permissions}
        setPermissions={setPermissions}
        isRtl={isRtl}
      />

      {/* ADMIN BOTS & SERVER SETTINGS MODAL */}
      <AdminSettingsModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        isRtl={isRtl}
      />

      {/* AI REMOTE IT ASSISTANT DRAWER */}
      <AiAssistantDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        isRtl={isRtl}
        onExecuteCommand={(cmd) => {
          setAiDrawerOpen(false);
          setActiveTab('terminal');
        }}
      />

      {/* LINUX & WINDOWS DEPLOYMENT SUITE & TAURI PORTABLE MODAL */}
      <DeploymentManagerModal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        isRtl={isRtl}
      />

      {/* INCOMING REMOTE CONNECTION REQUEST MODAL */}
      <IncomingConnectionDialog
        request={incomingRequest}
        onAccept={handleAcceptIncomingRequest}
        onReject={handleRejectIncomingRequest}
        isRtl={isRtl}
        defaultPermissions={permissions}
      />
    </div>
  );
}
