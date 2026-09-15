import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  Cpu, 
  Terminal, 
  ShieldAlert, 
  CheckCircle2, 
  Copy, 
  Check, 
  Loader2, 
  Play,
  RotateCcw,
  Zap,
  Wrench
} from 'lucide-react';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isRtl: boolean;
  onExecuteCommand?: (cmd: string) => void;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  isRtl,
  onExecuteCommand
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{
    sender: 'user' | 'ai';
    text?: string;
    analysis?: string;
    suggestedCommands?: string[];
    preventativeTips?: string;
    script?: string;
    riskLevel?: string;
  }>>([
    {
      sender: 'ai',
      analysis: isRtl 
        ? 'سلام! من پشتیبان هوشمند IT و هلپ‌دسک AnyDesk شما هستم. می‌توانید هر مشکلی در سیستم‌های ریموت، خطای ویندوز/لینوکس، کاهش سرعت، یا دستورات ترمینال دارید بپرسید تا راهکار گام‌به‌گام و اسکریپت اجرایی ارائه دهم.'
        : 'Hello! I am your AnyDesk AI IT Support & Remote Diagnostic Assistant. Describe any remote PC issue, slow performance, or ask for PowerShell/Bash fix scripts!'
    }
  ]);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickPrompts = [
    { label: isRtl ? 'رفع کندی شدید سیستم' : 'Fix slow performance', text: 'سیستم مقصد به شدت کند شده و مصرف رم و پردازنده بالاست. چه دستوری اجرا کنم؟' },
    { label: isRtl ? 'اسکریپت پاکسازی Temp و کش' : 'Clean cache & temp files', text: 'یک اسکریپت پاورشل برای پاک کردن کش موقت و پوشه‌های Temp ویندوز بنویس.' },
    { label: isRtl ? 'بررسی پرینتر و Spooler' : 'Restart Print Spooler', text: 'سرویس پرینتر ویندوز گیر کرده و فاکتورها پرینت نمی‌شوند. چگونه راه‌اندازی مجدد کنم؟' },
    { label: isRtl ? 'بررسی قطعی اینترنت و پورت‌ها' : 'Fix network & DNS issues', text: 'اینترنت سیستم مقصد وصل است ولی شبکه‌ی داخلی قطع شده است. دستورات عیب‌یابی شبکه را بده.' }
  ];

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || prompt;
    if (!textToSend.trim() || loading) return;

    const userMsg = { sender: 'user' as const, text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemDescription: textToSend,
          os: 'Windows 11 Pro 64-bit',
          systemInfo: { ram: '16GB', cpu: 'Core i7', network: 'Office LAN 1Gbps' }
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            analysis: data.analysis,
            suggestedCommands: data.suggestedCommands,
            preventativeTips: data.preventativeTips
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            analysis: isRtl 
              ? 'متاسفانه خطایی در پردازش رخ داد، اما می‌توانید با دستورات زیر سیستم را بررسی کنید:\n1. tasklist\n2. sfc /scannow'
              : 'Error processing request. You can run `tasklist` or `sfc /scannow`.'
          }
        ]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          analysis: isRtl 
            ? 'خطا در ارتباط با سرور. راهکار پیشنهادی بررسی اتصالات شبکه با دستور ping 8.8.8.8 است.' 
            : 'Connection error. Check network with `ping 8.8.8.8`.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-full max-w-md bg-[#161922] border-r border-slate-700 shadow-2xl flex flex-col text-slate-100">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#1a1d27]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-600/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{isRtl ? 'پشتیبان هوشمند IT ریموت' : 'AI Remote IT Copilot'}</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">Gemini</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {isRtl ? 'عیب‌یابی خودکار و تولید دستورات ترمینال' : 'Automated diagnostics & script generation'}
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

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.sender === 'user' ? (
              <div className="bg-red-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[88%] shadow-sm leading-relaxed">
                {msg.text}
              </div>
            ) : (
              <div className="bg-[#1e2230] border border-slate-700/80 p-3.5 rounded-2xl rounded-tl-sm max-w-[96%] space-y-3 shadow-md">
                <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-[11px]">
                  <Bot className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'پاسخ هوشمند هوش مصنوعی:' : 'AI Diagnostic Result:'}</span>
                </div>

                <div className="text-slate-200 whitespace-pre-line leading-relaxed">
                  {msg.analysis}
                </div>

                {msg.suggestedCommands && msg.suggestedCommands.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-700/60">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-amber-400" />
                      {isRtl ? 'دستورات پیشنهادی برای اجرای ریموت:' : 'Suggested Terminal Commands:'}
                    </span>
                    {msg.suggestedCommands.map((cmd, cIdx) => {
                      const cmdId = `${i}-${cIdx}`;
                      return (
                        <div 
                          key={cIdx} 
                          className="bg-black/50 border border-slate-700 rounded-lg p-2 font-mono text-emerald-400 flex items-center justify-between text-[11px] group"
                        >
                          <span className="truncate">{cmd}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyToClipboard(cmd, cmdId)}
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                              title="کپی دستور"
                            >
                              {copiedIndex === cmdId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            {onExecuteCommand && (
                              <button
                                onClick={() => onExecuteCommand(cmd)}
                                className="px-1.5 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] font-sans flex items-center gap-1 transition-all"
                                title="اجرا در ترمینال ریموت"
                              >
                                <Play className="w-2.5 h-2.5" />
                                <span>{isRtl ? 'اجرا' : 'Run'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {msg.preventativeTips && (
                  <div className="bg-purple-950/30 border border-purple-800/40 rounded-lg p-2 text-purple-300 text-[11px]">
                    <span className="font-semibold">{isRtl ? 'توصیه نگهداری: ' : 'Maintenance Tip: '}</span>
                    {msg.preventativeTips}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-purple-400 bg-purple-950/20 border border-purple-800/30 p-3 rounded-xl">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{isRtl ? 'در حال تحلیل وضعیت سیستم ریموت و عیب‌یابی...' : 'Analyzing remote PC state & diagnosing...'}</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800">
        <div className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>{isRtl ? 'پرسش‌های متداول هلپ‌دسک:' : 'Quick IT queries:'}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp.text)}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] transition-colors"
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-slate-800 bg-[#1a1d27] flex items-center gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isRtl ? 'مشکل یا درخواست اسکریپت ریموت را بنویسید...' : 'Type remote issue or script request...'}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          disabled={loading}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !prompt.trim()}
          className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-md transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
