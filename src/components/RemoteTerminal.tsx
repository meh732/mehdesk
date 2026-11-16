import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Zap,
  X,
  AlertCircle
} from 'lucide-react';

export interface TerminalLogEntry {
  id?: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  timestamp: string;
}

interface RemoteTerminalProps {
  remoteName?: string;
  remoteId?: string;
  isRtl: boolean;
  connectionStatus: string;
  connectionError?: string | null;
  history: TerminalLogEntry[];
  onClearHistory: () => void;
  onExecuteCommand: (command: string) => void;
  isExecuting?: boolean;
  onClose?: () => void;
  onOpenAiHelp?: () => void;
}

export const RemoteTerminal: React.FC<RemoteTerminalProps> = ({
  remoteName = 'Remote Host',
  remoteId = '',
  isRtl,
  connectionStatus,
  connectionError,
  history,
  onClearHistory,
  onExecuteCommand,
  isExecuting = false,
  onClose,
  onOpenAiHelp
}) => {
  const [inputCommand, setInputCommand] = useState('');
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const isPeerReady = connectionStatus === 'connected' || connectionStatus === 'accepted';

  const handleRun = (cmdText?: string) => {
    const cmd = (cmdText ?? inputCommand).trim();
    if (!cmd) return;
    if (cmd.toLowerCase() === 'cls' || cmd.toLowerCase() === 'clear') {
      onClearHistory();
      setInputCommand('');
      return;
    }
    onExecuteCommand(cmd);
    if (!cmdText) setInputCommand('');
  };

  const handleCopyLogs = () => {
    const fullLog = history
      .map((h) => `[${h.timestamp}] ${h.type === 'input' ? '> ' : ''}${h.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(fullLog);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickCommands = [
    { name: 'hostname', desc: isRtl ? 'نام سیستم مقصد' : 'Host name' },
    { name: 'whoami', desc: isRtl ? 'کاربر فعال سیستم' : 'Current user' },
    { name: 'ipconfig', desc: isRtl ? 'آدرس شبکه (Windows)' : 'Network IP (Windows)' },
    { name: 'uname -a', desc: isRtl ? 'اطلاعات هسته (Linux/Mac)' : 'Kernel info (Linux/Mac)' },
    { name: 'dir', desc: isRtl ? 'لیست فایل‌های پوشه جاری' : 'Directory listing' },
    { name: 'Get-Process | Select-Object -First 10', desc: isRtl ? '۱۰ پردازش اول (PowerShell)' : 'Top processes' }
  ];

  return (
    <div className="bg-[#0e1017] text-slate-100 rounded-2xl border border-slate-800 shadow-2xl flex flex-col h-[calc(100vh-110px)] max-w-6xl mx-auto overflow-hidden">
      {/* Terminal Title Bar */}
      <div className="bg-[#161922] px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <TerminalIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              <span>{isRtl ? 'ترمینال واقعی ریموت' : 'Real Remote Shell & PowerShell'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400 font-mono text-xs truncate">
                {remoteName} ({remoteId})
              </span>
            </h2>
            <div className="text-[11px] flex items-center gap-1.5 font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isPeerReady ? 'bg-emerald-500' : connectionStatus === 'error' || connectionStatus === 'rejected' ? 'bg-rose-500' : 'bg-amber-400 animate-ping'
                }`}
              />
              <span className={isPeerReady ? 'text-emerald-400' : 'text-slate-400'}>
                {isPeerReady
                  ? isRtl
                    ? 'متصل — دستورات مستقیماً روی سیستم مقصد اجرا می‌شوند'
                    : 'Connected — Commands execute directly on target host'
                  : connectionError || (isRtl ? 'در انتظار تایید اتصال...' : 'Waiting for host connection...')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenAiHelp && (
            <button
              onClick={onOpenAiHelp}
              className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">{isRtl ? 'اسکریپت با هوش مصنوعی' : 'AI Script'}</span>
            </button>
          )}

          <button
            onClick={handleCopyLogs}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isRtl ? 'کپی لاگ‌ها' : 'Copy logs'}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={onClearHistory}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isRtl ? 'پاکسازی صفحه' : 'Clear'}
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
          <span>{isRtl ? 'دستورات سریع:' : 'Quick Commands:'}</span>
        </span>
        {quickCommands.map((cmd, idx) => (
          <button
            key={idx}
            disabled={!isPeerReady || isExecuting}
            onClick={() => handleRun(cmd.name)}
            className="bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg font-mono text-[11px] whitespace-nowrap transition-colors"
            title={cmd.desc}
          >
            {cmd.name}
          </button>
        ))}
      </div>

      {/* Terminal Screen Console */}
      <div
        dir="ltr"
        className="flex-1 p-4 overflow-y-auto font-['JetBrains_Mono',monospace] text-xs leading-relaxed space-y-3 bg-[#0a0c12] text-slate-200 select-text text-left"
      >
        {!isPeerReady && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center gap-2 text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {connectionError ||
                (isRtl
                  ? 'در انتظار برقراری ارتباط با سیستم مقصد... (برای اجرای دستور واقعی، سیستم مقصد باید با اپلیکیشن دسکتاپ تائوری یا ایجنت بومی متصل باشد).'
                  : 'Waiting for connection to target machine...')}
            </span>
          </div>
        )}

        {history.map((item, idx) => (
          <div key={idx} className="space-y-1">
            {item.type === 'input' && (
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <span className="text-red-400">&gt;</span>
                <span>{item.text}</span>
              </div>
            )}

            {item.type === 'output' && (
              <div className="text-slate-200 whitespace-pre-wrap pl-4 border-l-2 border-emerald-700/60 py-1 font-normal">
                {item.text}
              </div>
            )}

            {item.type === 'error' && (
              <div className="text-rose-400 whitespace-pre-wrap pl-4 border-l-2 border-rose-700/60 py-1 font-normal">
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
        <span className="font-mono text-xs font-bold text-red-400 pl-2">&gt;</span>
        <input
          type="text"
          dir="ltr"
          value={inputCommand}
          disabled={!isPeerReady || isExecuting}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRun()}
          placeholder={
            isPeerReady
              ? isRtl
                ? 'دستور واقعی را تایپ کنید (مثلاً: dir, hostname, ipconfig)...'
                : 'Type real OS command...'
              : isRtl
              ? 'در انتظار اتصال به سیستم مقصد...'
              : 'Waiting for connection...'
          }
          className="flex-1 bg-slate-900 border border-slate-700 disabled:opacity-50 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-red-500 text-left"
          autoFocus
        />
        <button
          onClick={() => handleRun()}
          disabled={!isPeerReady || !inputCommand.trim() || isExecuting}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{isExecuting ? (isRtl ? 'در حال اجرا...' : 'Running...') : isRtl ? 'اجرا' : 'Run'}</span>
        </button>
      </div>
    </div>
  );
};
