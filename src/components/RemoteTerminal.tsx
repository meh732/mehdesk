import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, 
  Play, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles, 
  Shield, 
  Server, 
  RotateCcw,
  Zap,
  Activity,
  X
} from 'lucide-react';

interface RemoteTerminalProps {
  remoteName?: string;
  remoteId?: string;
  isRtl: boolean;
  onClose?: () => void;
  onOpenAiHelp?: () => void;
}

export const RemoteTerminal: React.FC<RemoteTerminalProps> = ({
  remoteName = 'Accounting-PC',
  remoteId = '489 312 905',
  isRtl,
  onClose,
  onOpenAiHelp
}) => {
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState<Array<{
    type: 'input' | 'output' | 'error' | 'system';
    text: string;
    timestamp: string;
  }>>([
    {
      type: 'system',
      text: `Microsoft Windows [Version 10.0.22631.3880]\n(c) Microsoft Corporation. All rights reserved.\nConnected to remote workstation: ${remoteName} (ID: ${remoteId})\nAnyDesk Secure Shell Session Initialized (TLS 1.3 - 256-bit AES)`,
      timestamp: '11:30'
    },
    {
      type: 'input',
      text: 'systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"Total Physical Memory"',
      timestamp: '11:30'
    },
    {
      type: 'output',
      text: 'OS Name:                   Microsoft Windows 11 Pro\nOS Version:                10.0.22631 N/A Build 22631\nTotal Physical Memory:     32,698 MB',
      timestamp: '11:30'
    }
  ]);

  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = (cmdText?: string) => {
    const cmd = cmdText || inputCommand;
    if (!cmd.trim()) return;

    const time = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    setHistory(prev => [...prev, { type: 'input', text: cmd, timestamp: time }]);
    setInputCommand('');

    const cleanCmd = cmd.trim().toLowerCase();

    // Simulated realistic Windows/Linux command outputs
    setTimeout(() => {
      let outputText = '';

      if (cleanCmd.startsWith('ping')) {
        outputText = `Pinging remote host [8.8.8.8] with 32 bytes of data:\nReply from 8.8.8.8: bytes=32 time=14ms TTL=117\nReply from 8.8.8.8: bytes=32 time=15ms TTL=117\nReply from 8.8.8.8: bytes=32 time=13ms TTL=117\n\nPing statistics for 8.8.8.8:\n    Packets: Sent = 3, Received = 3, Lost = 0 (0% loss),\nApproximate round trip times in milli-seconds:\n    Minimum = 13ms, Maximum = 15ms, Average = 14ms`;
      } else if (cleanCmd === 'ipconfig' || cleanCmd === 'ipconfig /all') {
        outputText = `Windows IP Configuration\n\nEthernet adapter Office-LAN:\n   Connection-specific DNS Suffix  . : corp.internal\n   IPv4 Address. . . . . . . . . . . : 192.168.1.104\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.1.1\n   DHCP Server . . . . . . . . . . . : 192.168.1.1\n   DNS Servers . . . . . . . . . . . : 1.1.1.1\n                                       8.8.8.8`;
      } else if (cleanCmd === 'tasklist' || cleanCmd.includes('tasklist')) {
        outputText = `Image Name                     PID Session Name        Session#    Mem Usage\n========================= ======== ================ =========== ============\nSystem Idle Process              0 Services                   0          8 K\nSystem                           4 Services                   0      1,420 K\nexplorer.exe                  4120 Console                    1    142,320 K\nAnyDesk.exe                   8920 Console                    1     64,120 K\nSepidarFinancial.exe          9440 Console                    1    380,450 K\nEXCEL.EXE                    10240 Console                    1    210,180 K\nchrome.exe                   12480 Console                    1    520,300 K`;
      } else if (cleanCmd === 'netstat' || cleanCmd.includes('netstat')) {
        outputText = `Active Connections\n\n  Proto  Local Address          Foreign Address        State\n  TCP    192.168.1.104:7070     0.0.0.0:0              LISTENING (AnyDesk)\n  TCP    192.168.1.104:5432     0.0.0.0:0              LISTENING (PostgreSQL)\n  TCP    192.168.1.104:443      142.250.180.206:443    ESTABLISHED`;
      } else if (cleanCmd === 'sfc /scannow') {
        outputText = `Beginning system scan. This process will take some time.\nBeginning verification phase of system scan.\nVerification 100% complete.\nWindows Resource Protection did not find any integrity violations.`;
      } else if (cleanCmd.includes('restart') || cleanCmd.includes('reboot') || cleanCmd.includes('shutdown')) {
        outputText = `Initiating remote system reboot schedule in 30 seconds...\nBroadcast sent to all active users.`;
      } else if (cleanCmd === 'cls' || cleanCmd === 'clear') {
        setHistory([]);
        return;
      } else {
        outputText = `Command executed successfully on remote machine.\nReturn code: 0 (STATUS_SUCCESS)\nTarget: ${remoteName}`;
      }

      setHistory(prev => [...prev, { type: 'output', text: outputText, timestamp: time }]);
    }, 350);
  };

  const handleCopyLogs = () => {
    const fullLog = history.map(h => `[${h.timestamp}] ${h.type === 'input' ? '> ' : ''}${h.text}`).join('\n\n');
    navigator.clipboard.writeText(fullLog);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickCommands = [
    { name: 'ipconfig /all', desc: 'مشاهده IP و کارت شبکه' },
    { name: 'tasklist', desc: 'لیست برنامه‌های در حال اجرا' },
    { name: 'ping 8.8.8.8', desc: 'تست اتصال به اینترنت' },
    { name: 'netstat -ano', desc: 'پورت‌های باز سیستم' },
    { name: 'sfc /scannow', desc: 'اسکن سلامت فایل‌های ویندوز' },
    { name: 'ipconfig /flushdns', desc: 'پاکسازی کش DNS' }
  ];

  return (
    <div className="bg-[#0e1017] text-slate-100 rounded-2xl border border-slate-800 shadow-2xl flex flex-col h-[calc(100vh-100px)] max-w-6xl mx-auto overflow-hidden">
      {/* Terminal Title Bar */}
      <div className="bg-[#161922] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <TerminalIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{isRtl ? 'ترمینال و پاورشل ریموت' : 'Remote PowerShell & Terminal'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400 font-mono text-xs">{remoteName} ({remoteId})</span>
            </h2>
            <div className="text-[11px] text-slate-400 font-mono">
              Administrator Privileges • Elevation Enabled
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAiHelp && (
            <button
              onClick={onOpenAiHelp}
              className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{isRtl ? 'اسکریپت با هوش مصنوعی' : 'AI Script Generator'}</span>
            </button>
          )}

          <button
            onClick={handleCopyLogs}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="کپی لاگ‌ها"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setHistory([])}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="پاکسازی صفحه"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="bg-[#12141d] px-4 py-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[11px] text-slate-400 whitespace-nowrap flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>{isRtl ? 'دستورات سریع IT:' : 'Quick Commands:'}</span>
        </span>
        {quickCommands.map((cmd, idx) => (
          <button
            key={idx}
            onClick={() => executeCommand(cmd.name)}
            className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg font-mono text-[11px] whitespace-nowrap transition-colors flex items-center gap-1.5 group"
            title={cmd.desc}
          >
            <span>{cmd.name}</span>
          </button>
        ))}
      </div>

      {/* Terminal Screen Console */}
      <div className="flex-1 p-4 overflow-y-auto font-['JetBrains_Mono',monospace] text-xs leading-relaxed space-y-3 bg-[#0a0c12] text-slate-200 select-text">
        {history.map((item, idx) => (
          <div key={idx} className="space-y-1">
            {item.type === 'input' && (
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <span className="text-red-400">PS C:\Windows\system32&gt;</span>
                <span>{item.text}</span>
              </div>
            )}

            {item.type === 'output' && (
              <div className="text-slate-300 whitespace-pre-wrap pl-4 border-l-2 border-slate-800 py-1 font-normal">
                {item.text}
              </div>
            )}

            {item.type === 'system' && (
              <div className="text-slate-400 text-[11px] whitespace-pre-wrap bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
                {item.text}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Terminal Command Input */}
      <div className="p-3 bg-[#161922] border-t border-slate-800 flex items-center gap-2">
        <span className="font-mono text-xs font-bold text-red-400 pl-2">PS &gt;</span>
        <input
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
          placeholder={isRtl ? 'دستور خود را وارد کنید (مثال: ipconfig, ping, tasklist)...' : 'Type remote command (e.g., ipconfig, ping, tasklist)...'}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-red-500"
          autoFocus
        />
        <button
          onClick={() => executeCommand()}
          disabled={!inputCommand.trim()}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{isRtl ? 'اجرا' : 'Run'}</span>
        </button>
      </div>
    </div>
  );
};
