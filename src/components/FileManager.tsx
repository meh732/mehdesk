import React, { useState } from 'react';
import { 
  Folder, 
  FileText, 
  FileSpreadsheet, 
  Archive, 
  FileCode, 
  Image as ImageIcon, 
  HardDrive, 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  Download, 
  RefreshCw, 
  FolderPlus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Monitor, 
  Laptop, 
  X,
  Database,
  Search
} from 'lucide-react';
import { RemoteFile, FileTransferProgress } from '../types';
import { INITIAL_LOCAL_FILES, INITIAL_REMOTE_FILES } from '../utils/mockDevices';

interface FileManagerProps {
  remoteName?: string;
  remoteId?: string;
  isRtl: boolean;
  onClose?: () => void;
}

export const FileManager: React.FC<FileManagerProps> = ({
  remoteName = 'Accounting-PC (Windows 11)',
  remoteId = '489 312 905',
  isRtl,
  onClose
}) => {
  const [localFiles, setLocalFiles] = useState<RemoteFile[]>(INITIAL_LOCAL_FILES);
  const [remoteFiles, setRemoteFiles] = useState<RemoteFile[]>(INITIAL_REMOTE_FILES);
  
  const [selectedLocal, setSelectedLocal] = useState<RemoteFile | null>(null);
  const [selectedRemote, setSelectedRemote] = useState<RemoteFile | null>(null);

  const [localPath, setLocalPath] = useState('Local/Downloads');
  const [remotePath, setRemotePath] = useState('Remote/Root');

  const [searchLocal, setSearchLocal] = useState('');
  const [searchRemote, setSearchRemote] = useState('');

  const [transfers, setTransfers] = useState<FileTransferProgress[]>([]);

  const [activeTransfer, setActiveTransfer] = useState<FileTransferProgress | null>(null);

  const getFileIcon = (file: RemoteFile) => {
    if (file.isDir) return <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />;
    if (file.extension === 'xlsx' || file.extension === 'xls') return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    if (file.extension === 'pdf' || file.extension === 'docx') return <FileText className="w-4 h-4 text-blue-400" />;
    if (file.extension === 'zip' || file.extension === 'rar') return <Archive className="w-4 h-4 text-yellow-500" />;
    if (file.extension === 'ps1' || file.extension === 'sh') return <FileCode className="w-4 h-4 text-purple-400" />;
    if (file.extension === 'bak') return <Database className="w-4 h-4 text-rose-400" />;
    if (file.extension === 'png' || file.extension === 'jpg') return <ImageIcon className="w-4 h-4 text-cyan-400" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Transfer from Local to Remote (Upload)
  const handleUploadToRemote = () => {
    if (!selectedLocal || selectedLocal.isDir) return;

    const newTransfer: FileTransferProgress = {
      id: `tx-${Date.now()}`,
      fileName: selectedLocal.name,
      direction: 'upload',
      totalBytes: selectedLocal.size || 15000000,
      transferredBytes: 0,
      speed: '32.4 MB/s',
      status: 'in_progress',
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    setActiveTransfer(newTransfer);
    setTransfers(prev => [newTransfer, ...prev]);

    // Simulate transfer progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.25;
      if (progress >= 1) {
        clearInterval(interval);
        setActiveTransfer(null);
        setTransfers(prev => prev.map(t => t.id === newTransfer.id ? { ...t, status: 'completed', transferredBytes: t.totalBytes } : t));
        
        // Add to remote files list
        setRemoteFiles(prev => [
          ...prev,
          {
            name: selectedLocal.name,
            path: `${remotePath}/${selectedLocal.name}`,
            size: selectedLocal.size,
            isDir: false,
            modified: 'هم اکنون',
            type: selectedLocal.type,
            extension: selectedLocal.extension
          }
        ]);
      } else {
        setActiveTransfer(prev => prev ? { ...prev, transferredBytes: Math.floor(prev.totalBytes * progress) } : null);
      }
    }, 400);
  };

  // Transfer from Remote to Local (Download)
  const handleDownloadToLocal = () => {
    if (!selectedRemote || selectedRemote.isDir) return;

    const newTransfer: FileTransferProgress = {
      id: `tx-${Date.now()}`,
      fileName: selectedRemote.name,
      direction: 'download',
      totalBytes: selectedRemote.size || 25000000,
      transferredBytes: 0,
      speed: '45.1 MB/s',
      status: 'in_progress',
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    setActiveTransfer(newTransfer);
    setTransfers(prev => [newTransfer, ...prev]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.25;
      if (progress >= 1) {
        clearInterval(interval);
        setActiveTransfer(null);
        setTransfers(prev => prev.map(t => t.id === newTransfer.id ? { ...t, status: 'completed', transferredBytes: t.totalBytes } : t));
        
        // Add to local files
        setLocalFiles(prev => [
          ...prev,
          {
            name: selectedRemote.name,
            path: `${localPath}/${selectedRemote.name}`,
            size: selectedRemote.size,
            isDir: false,
            modified: 'هم اکنون',
            type: selectedRemote.type,
            extension: selectedRemote.extension
          }
        ]);
      } else {
        setActiveTransfer(prev => prev ? { ...prev, transferredBytes: Math.floor(prev.totalBytes * progress) } : null);
      }
    }, 400);
  };

  const filteredLocal = localFiles.filter(f => f.name.toLowerCase().includes(searchLocal.toLowerCase()));
  const filteredRemote = remoteFiles.filter(f => f.name.toLowerCase().includes(searchRemote.toLowerCase()));

  return (
    <div className="bg-[#12141c] text-slate-100 rounded-2xl border border-slate-800 shadow-2xl flex flex-col h-[calc(100vh-100px)] max-w-7xl mx-auto overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-[#161922] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{isRtl ? 'مدیریت انتقال فایل AnyDesk' : 'AnyDesk File Manager'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-red-400 font-mono text-xs">{remoteId}</span>
            </h2>
            <div className="text-[11px] text-slate-400">
              {isRtl ? `اتصال برقرار است با: ${remoteName}` : `Connected to: ${remoteName}`}
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Active Transfer Progress Banner */}
      {activeTransfer && (
        <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/80 border-b border-red-900/60 p-3 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-red-400 animate-spin" />
            <div className="text-xs">
              <span className="font-semibold text-white">
                {activeTransfer.direction === 'upload' ? (isRtl ? 'در حال ارسال: ' : 'Uploading: ') : (isRtl ? 'در حال دانلود: ' : 'Downloading: ')}
              </span>
              <span className="text-slate-300 font-mono">{activeTransfer.fileName}</span>
              <span className="text-slate-500 text-[11px] mx-2">({activeTransfer.speed})</span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-48">
            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-red-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, (activeTransfer.transferredBytes / activeTransfer.totalBytes) * 100)}%` }}
              ></div>
            </div>
            <span className="text-[11px] font-mono text-slate-300">
              {Math.round((activeTransfer.transferredBytes / activeTransfer.totalBytes) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Dual Pane Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-800 overflow-hidden">
        {/* Left Pane: Local Machine */}
        <div className="flex flex-col h-full bg-[#141720]">
          {/* Pane Header */}
          <div className="p-3 bg-[#181c26] border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Laptop className="w-4 h-4 text-blue-400" />
                <span>{isRtl ? 'این سیستم (دستگاه محلی شما)' : 'Local Machine (This Device)'}</span>
              </div>
              <span className="text-[11px] text-slate-400">{filteredLocal.length} {isRtl ? 'آیتم' : 'items'}</span>
            </div>

            {/* Path breadcrumbs & search */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300 truncate">
                {localPath}
              </div>
              <div className="relative w-36">
                <Search className="w-3 h-3 text-slate-500 absolute right-2.5 top-2" />
                <input
                  type="text"
                  placeholder={isRtl ? 'جستجو...' : 'Search...'}
                  value={searchLocal}
                  onChange={(e) => setSearchLocal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pr-7 pl-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Local File List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
            {filteredLocal.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                <Folder className="w-8 h-8 text-slate-600 mb-2" />
                <span className="text-xs">{isRtl ? 'پوشه خالی است' : 'Folder is empty'}</span>
              </div>
            ) : (
              filteredLocal.map((file, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedLocal(file)}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    selectedLocal?.name === file.name 
                      ? 'bg-blue-600/20 border border-blue-500/40 text-white' 
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {getFileIcon(file)}
                    <span className="font-medium truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                    <span>{formatSize(file.size)}</span>
                    <span className="hidden sm:inline text-slate-500">{file.modified}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Local Bottom Action Bar */}
          <div className="p-2.5 bg-[#181c26] border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 truncate">
              {selectedLocal ? `${selectedLocal.name} (${formatSize(selectedLocal.size)})` : (isRtl ? 'فایلی انتخاب نشده است' : 'No file selected')}
            </div>
            <button
              onClick={handleUploadToRemote}
              disabled={!selectedLocal || selectedLocal.isDir || !!activeTransfer}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
            >
              <span>{isRtl ? 'ارسال به ریموت' : 'Upload to Remote'}</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Pane: Remote Host */}
        <div className="flex flex-col h-full bg-[#141720]">
          {/* Pane Header */}
          <div className="p-3 bg-[#181c26] border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Monitor className="w-4 h-4 text-red-400" />
                <span>{isRtl ? `کامپیوتر مقصد (${remoteName})` : `Remote Host (${remoteName})`}</span>
              </div>
              <span className="text-[11px] text-slate-400">{filteredRemote.length} {isRtl ? 'آیتم' : 'items'}</span>
            </div>

            {/* Path breadcrumbs & search */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300 truncate">
                {remotePath}
              </div>
              <div className="relative w-36">
                <Search className="w-3 h-3 text-slate-500 absolute right-2.5 top-2" />
                <input
                  type="text"
                  placeholder={isRtl ? 'جستجو...' : 'Search...'}
                  value={searchRemote}
                  onChange={(e) => setSearchRemote(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pr-7 pl-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Remote File List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
            {filteredRemote.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                <Folder className="w-8 h-8 text-slate-600 mb-2" />
                <span className="text-xs">{isRtl ? 'پوشه ریموت خالی است' : 'Remote folder is empty'}</span>
              </div>
            ) : (
              filteredRemote.map((file, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedRemote(file)}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    selectedRemote?.name === file.name 
                      ? 'bg-red-600/20 border border-red-500/40 text-white' 
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {getFileIcon(file)}
                    <span className="font-medium truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                    <span>{formatSize(file.size)}</span>
                    <span className="hidden sm:inline text-slate-500">{file.modified}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Remote Bottom Action Bar */}
          <div className="p-2.5 bg-[#181c26] border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={handleDownloadToLocal}
              disabled={!selectedRemote || selectedRemote.isDir || !!activeTransfer}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{isRtl ? 'دانلود به سیستم محلی' : 'Download to Local'}</span>
            </button>
            <div className="text-[11px] text-slate-400 truncate text-left font-mono">
              {selectedRemote ? `${selectedRemote.name}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Transfer History Log Drawer */}
      <div className="bg-[#10121a] border-t border-slate-800 p-2.5 max-h-28 overflow-y-auto">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 px-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{isRtl ? 'تاریخچه انتقال فایل‌ها' : 'Transfer History'}</span>
          </div>
          <span>{transfers.length} {isRtl ? 'عملیات' : 'transfers'}</span>
        </div>

        <div className="space-y-1">
          {transfers.map((tx) => (
            <div key={tx.id} className="bg-slate-900/80 border border-slate-800/80 rounded-lg px-2.5 py-1 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-200 font-mono">{tx.fileName}</span>
                <span className="text-slate-500">({tx.direction === 'upload' ? 'Upload' : 'Download'})</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 font-mono">
                <span>{formatSize(tx.totalBytes)}</span>
                <span className="text-emerald-400">{tx.speed}</span>
                <span className="text-slate-500">{tx.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
