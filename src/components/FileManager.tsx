import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  Clock,
  Monitor,
  Laptop,
  X,
  Database,
  Search,
  FolderUp,
  Plus,
  AlertCircle
} from 'lucide-react';
import { RemoteFile, FileTransferProgress } from '../types';
import { LocalFileEntry } from '../utils/fileTransfer';
import { isTauriRuntime, invokeTauri } from '../utils/serverConfig';

interface FileManagerProps {
  remoteName?: string;
  remoteId: string;
  isRtl: boolean;
  onClose?: () => void;
  connectionStatus: string;
  connectionError?: string | null;
  localFiles: LocalFileEntry[];
  onAddLocalFiles: (files: FileList | File[]) => void;
  remoteFiles: RemoteFile[];
  remotePath: string;
  remoteIsTauri: boolean;
  remoteLoading: boolean;
  onRequestRemoteList: (path?: string) => void;
  onUploadFile: (file: LocalFileEntry) => void;
  onDownloadRemoteFile: (file: RemoteFile) => void;
  transfers: FileTransferProgress[];
  activeTransfer: FileTransferProgress | null;
}

export const FileManager: React.FC<FileManagerProps> = ({
  remoteName = 'Remote PC',
  remoteId,
  isRtl,
  onClose,
  connectionStatus,
  connectionError,
  localFiles,
  onAddLocalFiles,
  remoteFiles,
  remotePath,
  remoteIsTauri,
  remoteLoading,
  onRequestRemoteList,
  onUploadFile,
  onDownloadRemoteFile,
  transfers,
  activeTransfer
}) => {
  const [tauriLocalPath, setTauriLocalPath] = useState<string>('');
  const [tauriLocalEntries, setTauriLocalEntries] = useState<LocalFileEntry[]>([]);
  const [tauriLocalLoading, setTauriLocalLoading] = useState(false);

  const [selectedLocal, setSelectedLocal] = useState<LocalFileEntry | null>(null);
  const [selectedRemote, setSelectedRemote] = useState<RemoteFile | null>(null);

  const [searchLocal, setSearchLocal] = useState('');
  const [searchRemote, setSearchRemote] = useState('');
  const [mobilePane, setMobilePane] = useState<'local' | 'remote'>('local');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inTauri = isTauriRuntime();

  const loadTauriLocalDir = async (dirPath?: string) => {
    if (!inTauri) return;
    setTauriLocalLoading(true);
    try {
      const res = await invokeTauri<[string, RemoteFile[]]>('list_directory', {
        path: dirPath ?? ''
      });
      if (res && Array.isArray(res)) {
        setTauriLocalPath(res[0]);
        setTauriLocalEntries(res[1] || []);
      }
    } catch (err) {
      console.warn('Local list_directory failed:', err);
    } finally {
      setTauriLocalLoading(false);
    }
  };

  useEffect(() => {
    if (inTauri) {
      loadTauriLocalDir('');
    }
  }, [inTauri]);

  // Fetch remote directory list once session is accepted/connected
  useEffect(() => {
    if (connectionStatus === 'connected' || connectionStatus === 'accepted') {
      onRequestRemoteList('');
    }
  }, [connectionStatus]);

  const effectiveLocalFiles: LocalFileEntry[] = inTauri
    ? [
        ...tauriLocalEntries,
        ...localFiles.filter((lf) => !tauriLocalEntries.some((te) => te.path === lf.path))
      ]
    : localFiles;

  const getFileIcon = (file: RemoteFile) => {
    if (file.isDir) return <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20 shrink-0" />;
    const ext = (file.extension || file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />;
    if (ext === 'pdf' || ext === 'docx' || ext === 'doc' || ext === 'txt') return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
    if (ext === 'zip' || ext === 'rar' || ext === '7z' || ext === 'tar' || ext === 'gz') return <Archive className="w-4 h-4 text-yellow-500 shrink-0" />;
    if (ext === 'ps1' || ext === 'sh' || ext === 'js' || ext === 'ts' || ext === 'py') return <FileCode className="w-4 h-4 text-purple-400 shrink-0" />;
    if (ext === 'bak' || ext === 'sql' || ext === 'db') return <Database className="w-4 h-4 text-rose-400 shrink-0" />;
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />;
    return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getParentPath = (p: string) => {
    if (!p || p === 'Computer' || p === '/' || /^[A-Z]:\\?$/i.test(p)) return '__ROOTS__';
    const sep = p.includes('\\') ? '\\' : '/';
    const cleaned = p.replace(/[\\/]+$/, '');
    const idx = cleaned.lastIndexOf(sep);
    if (idx <= 0) return sep === '/' ? '/' : '__ROOTS__';
    const parent = cleaned.slice(0, idx);
    if (/^[A-Z]:$/i.test(parent)) return parent + '\\';
    return parent;
  };

  const filteredLocal = effectiveLocalFiles.filter((f) =>
    f.name.toLowerCase().includes(searchLocal.toLowerCase())
  );
  const filteredRemote = remoteFiles.filter((f) =>
    f.name.toLowerCase().includes(searchRemote.toLowerCase())
  );

  const isPeerReady = connectionStatus === 'connected' || connectionStatus === 'accepted';

  return (
    <div className="bg-[#12141c] text-slate-100 rounded-2xl border border-slate-800 shadow-2xl flex flex-col h-[calc(100vh-110px)] max-w-7xl mx-auto overflow-hidden">
      {/* Hidden Real File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddLocalFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Top Header Bar */}
      <div className="bg-[#161922] px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              <span>{isRtl ? 'انتقال واقعی فایل meh desk' : 'meh desk Real File Transfer'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-red-400 font-mono text-xs">{remoteId}</span>
            </h2>
            <div className="text-[11px] flex items-center gap-2 truncate">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isPeerReady ? 'bg-emerald-500' : connectionStatus === 'error' || connectionStatus === 'rejected' ? 'bg-rose-500' : 'bg-amber-400 animate-ping'
                }`}
              />
              <span className={isPeerReady ? 'text-emerald-400' : 'text-slate-400'}>
                {isPeerReady
                  ? isRtl
                    ? `متصل و آماده تبادل فایل با ${remoteName}`
                    : `Connected to ${remoteName}`
                  : connectionError ||
                    (isRtl ? 'در حال برقراری تونل امن با کامپیوتر مقصد...' : 'Establishing secure peer tunnel...')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isRtl ? 'انتخاب فایل برای ارسال' : 'Pick Files'}</span>
            <span className="sm:hidden">{isRtl ? 'افزودن فایل' : 'Add'}</span>
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

      {/* Mobile Pane Switcher */}
      <div className="md:hidden grid grid-cols-2 bg-[#161922] border-b border-slate-800 p-1 gap-1 text-xs">
        <button
          onClick={() => setMobilePane('local')}
          className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 ${
            mobilePane === 'local' ? 'bg-blue-600 text-white' : 'text-slate-400'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>{isRtl ? 'سیستم من' : 'Local'}</span>
        </button>
        <button
          onClick={() => setMobilePane('remote')}
          className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 ${
            mobilePane === 'remote' ? 'bg-red-600 text-white' : 'text-slate-400'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>{isRtl ? 'سیستم مقابل' : 'Remote'}</span>
        </button>
      </div>

      {/* Active Transfer Progress Banner */}
      {activeTransfer && (
        <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/80 border-b border-red-900/60 p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <RefreshCw className="w-4 h-4 text-red-400 animate-spin shrink-0" />
            <div className="text-xs truncate">
              <span className="font-semibold text-white">
                {activeTransfer.direction === 'upload'
                  ? isRtl
                    ? 'در حال ارسال: '
                    : 'Uploading: '
                  : isRtl
                  ? 'در حال دریافت: '
                  : 'Downloading: '}
              </span>
              <span className="text-slate-200 font-mono">{activeTransfer.fileName}</span>
              <span className="text-emerald-400 text-[11px] mx-2 font-mono">({activeTransfer.speed})</span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-48 shrink-0">
            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-red-500 h-full transition-all duration-150 rounded-full"
                style={{
                  width: `${
                    activeTransfer.totalBytes > 0
                      ? Math.min(100, (activeTransfer.transferredBytes / activeTransfer.totalBytes) * 100)
                      : 100
                  }%`
                }}
              />
            </div>
            <span className="text-[11px] font-mono text-slate-300">
              {activeTransfer.totalBytes > 0
                ? Math.round((activeTransfer.transferredBytes / activeTransfer.totalBytes) * 100)
                : 100}
              %
            </span>
          </div>
        </div>
      )}

      {/* Dual Pane Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-800 overflow-hidden">
        {/* Local Machine Pane */}
        <div
          className={`${mobilePane === 'local' ? 'flex' : 'hidden'} md:flex flex-col h-full bg-[#141720] overflow-hidden ${
            isDragging ? 'ring-2 ring-inset ring-blue-500 bg-blue-950/20' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              onAddLocalFiles(e.dataTransfer.files);
            }
          }}
        >
          {/* Pane Header */}
          <div className="p-3 bg-[#181c26] border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Laptop className="w-4 h-4 text-blue-400" />
                <span>
                  {inTauri
                    ? isRtl
                      ? 'فایل‌های این کامپیوتر (دیسک محلی)'
                      : 'Local Filesystem'
                    : isRtl
                    ? 'فایل‌های آماده ارسال / دریافت‌شده'
                    : 'Local Files (Ready & Received)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {inTauri && (
                  <>
                    <button
                      onClick={() => loadTauriLocalDir(getParentPath(tauriLocalPath))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={isRtl ? 'پوشه قبلی' : 'Up'}
                    >
                      <FolderUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => loadTauriLocalDir(tauriLocalPath)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={isRtl ? 'بروزرسانی' : 'Refresh'}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${tauriLocalLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </>
                )}
                <span className="text-[11px] text-slate-400">{filteredLocal.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300 truncate">
                {inTauri ? tauriLocalPath || 'Computer' : isRtl ? 'مرورگر (فایل‌های انتخابی و دریافتی)' : 'Browser File Staging'}
              </div>
              <div className="relative w-32 sm:w-36">
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
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center border-2 border-dashed border-slate-800 rounded-xl cursor-pointer hover:border-blue-500/50 hover:bg-slate-900/40 transition-colors"
              >
                <Upload className="w-9 h-9 text-blue-400/80 mb-2" />
                <span className="text-xs font-bold text-slate-200">
                  {isRtl ? 'فایل‌ها را اینجا بکشید و رها کنید یا کلیک کنید' : 'Drop files here or click to pick'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  {isRtl
                    ? 'پس از انتخاب فایل واقعی از سیستم، دکمه «ارسال به ریموت» فعال می‌شود'
                    : 'Select any real file from your computer or phone to send'}
                </span>
              </div>
            ) : (
              filteredLocal.map((file, idx) => (
                <div
                  key={`${file.path}-${idx}`}
                  onClick={() => setSelectedLocal(file)}
                  onDoubleClick={() => {
                    if (file.isDir && inTauri) {
                      loadTauriLocalDir(file.path);
                      setSelectedLocal(null);
                    }
                  }}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    selectedLocal?.path === file.path
                      ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    {getFileIcon(file)}
                    <span className="font-medium truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono shrink-0">
                    <span>{formatSize(file.size)}</span>
                    {file.downloadUrl && (
                      <a
                        href={file.downloadUrl}
                        download={file.name}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40 font-sans"
                      >
                        {isRtl ? 'ذخیره' : 'Save'}
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Local Bottom Action Bar */}
          <div className="p-2.5 bg-[#181c26] border-t border-slate-800 flex items-center justify-between gap-2">
            <div className="text-[11px] text-slate-400 truncate">
              {selectedLocal
                ? `${selectedLocal.name} (${formatSize(selectedLocal.size)})`
                : isRtl
                ? 'فایلی انتخاب نشده است'
                : 'No file selected'}
            </div>
            <button
              onClick={() => selectedLocal && !selectedLocal.isDir && onUploadFile(selectedLocal)}
              disabled={!isPeerReady || !selectedLocal || selectedLocal.isDir || !!activeTransfer}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shrink-0"
            >
              <span>{isRtl ? 'ارسال واقعی به ریموت' : 'Send to Remote'}</span>
              <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>

        {/* Remote Host Pane */}
        <div className={`${mobilePane === 'remote' ? 'flex' : 'hidden'} md:flex flex-col h-full bg-[#141720] overflow-hidden`}>
          {/* Pane Header */}
          <div className="p-3 bg-[#181c26] border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 truncate">
                <Monitor className="w-4 h-4 text-red-400 shrink-0" />
                <span className="truncate">{isRtl ? `کامپیوتر مقصد (${remoteName})` : `Remote Host (${remoteName})`}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {remoteIsTauri && (
                  <button
                    onClick={() => onRequestRemoteList(getParentPath(remotePath))}
                    disabled={!isPeerReady || remoteLoading}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                    title={isRtl ? 'پوشه قبلی' : 'Up'}
                  >
                    <FolderUp className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onRequestRemoteList(remotePath)}
                  disabled={!isPeerReady || remoteLoading}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                  title={isRtl ? 'دریافت لیست فایل‌ها از سیستم مقابل' : 'Refresh Remote Files'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${remoteLoading ? 'animate-spin' : ''}`} />
                </button>
                <span className="text-[11px] text-slate-400">{filteredRemote.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300 truncate">
                {remotePath || (remoteIsTauri ? 'Computer' : isRtl ? 'فایل‌های اشتراکی سیستم مقابل' : 'Remote Shared Files')}
              </div>
              <div className="relative w-32 sm:w-36">
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
            {!isPeerReady ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2">
                {connectionStatus === 'error' || connectionStatus === 'rejected' ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                    <span className="text-xs font-bold text-rose-300">
                      {connectionError || (isRtl ? 'اتصال برقرار نشد' : 'Connection failed')}
                    </span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
                    <span className="text-xs">
                      {isRtl ? 'در انتظار تایید اتصال توسط سیستم مقصد...' : 'Waiting for remote host approval...'}
                    </span>
                  </>
                )}
              </div>
            ) : filteredRemote.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center space-y-2">
                <Folder className="w-8 h-8 text-slate-600" />
                <span className="text-xs text-slate-300">
                  {remoteIsTauri
                    ? isRtl
                      ? 'این پوشه در سیستم مقابل خالی است'
                      : 'Remote folder is empty'
                    : isRtl
                    ? 'در سیستم مقابل هنوز فایلی به لیست اشتراک اضافه نشده است.'
                    : 'No files shared yet on remote browser.'}
                </span>
                {!remoteIsTauri && (
                  <span className="text-[11px] text-slate-500 max-w-xs">
                    {isRtl
                      ? 'شما همین الان می‌توانید از پنل سمت چپ فایل انتخاب کرده و برای کامپیوتر مقابل ارسال کنید.'
                      : 'You can still pick files in the left pane and send them directly to the remote computer.'}
                  </span>
                )}
              </div>
            ) : (
              filteredRemote.map((file, idx) => (
                <div
                  key={`${file.path}-${idx}`}
                  onClick={() => setSelectedRemote(file)}
                  onDoubleClick={() => {
                    if (file.isDir && remoteIsTauri) {
                      onRequestRemoteList(file.path);
                      setSelectedRemote(null);
                    }
                  }}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    selectedRemote?.path === file.path
                      ? 'bg-red-600/20 border border-red-500/40 text-white'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    {getFileIcon(file)}
                    <span className="font-medium truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono shrink-0">
                    <span>{formatSize(file.size)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Remote Bottom Action Bar */}
          <div className="p-2.5 bg-[#181c26] border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => selectedRemote && !selectedRemote.isDir && onDownloadRemoteFile(selectedRemote)}
              disabled={!isPeerReady || !selectedRemote || selectedRemote.isDir || !!activeTransfer}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRtl ? 'دانلود واقعی از ریموت' : 'Download to Local'}</span>
            </button>
            <div className="text-[11px] text-slate-400 truncate font-mono">
              {selectedRemote ? selectedRemote.name : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Transfer History Log Drawer */}
      <div className="bg-[#10121a] border-t border-slate-800 p-2.5 max-h-28 overflow-y-auto">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 px-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{isRtl ? 'تاریخچه انتقال واقعی فایل‌ها' : 'Real Transfer History'}</span>
          </div>
          <span>
            {transfers.length} {isRtl ? 'عملیات' : 'transfers'}
          </span>
        </div>

        <div className="space-y-1">
          {transfers.map((tx) => (
            <div
              key={tx.id}
              className="bg-slate-900/80 border border-slate-800/80 rounded-lg px-2.5 py-1 flex items-center justify-between text-[11px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2
                  className={`w-3.5 h-3.5 shrink-0 ${tx.status === 'completed' ? 'text-emerald-400' : 'text-rose-400'}`}
                />
                <span className="text-slate-200 font-mono truncate">{tx.fileName}</span>
                <span className="text-slate-500 shrink-0">
                  ({tx.direction === 'upload' ? 'Upload' : 'Download'})
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 font-mono shrink-0">
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
