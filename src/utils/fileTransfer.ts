// Real Bidirectional Chunked File Transfer Engine (WebRTC DataChannel + WebSocket Relay + Tauri Native FS)
import { RemoteFile, FileTransferProgress } from '../types';
import { WebRtcClient } from './webrtc';
import { isTauriRuntime, invokeTauri, TauriFileChunkResult } from './serverConfig';

export interface LocalFileEntry extends RemoteFile {
  browserFile?: File;
  downloadUrl?: string;
}

export interface IncomingTransferBuffer {
  transferId: string;
  fileName: string;
  totalBytes: number;
  totalChunks: number;
  receivedChunks: number;
  receivedBytes: number;
  senderId: string;
  destDir?: string;
  mimeType: string;
  startedAt: number;
  chunks: Uint8Array[];
  savedPath?: string;
}

export const CHUNK_SIZE = 48 * 1024; // 48KB raw bytes (~64KB base64) - safe for both WebRTC DataChannel & WS

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function formatTransferSpeed(bytesTransferred: number, elapsedMs: number): string {
  if (elapsedMs <= 0) return '...';
  const bps = (bytesTransferred / elapsedMs) * 1000;
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
}

export function triggerBrowserDownload(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return url;
}

// Stream a browser File object to a remote peer in real chunks
export async function sendBrowserFileToPeer(
  rtc: WebRtcClient,
  file: File,
  targetId: string,
  onProgress: (progress: FileTransferProgress) => void,
  isCancelled?: () => boolean
): Promise<boolean> {
  const transferId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const totalBytes = file.size;
  const totalChunks = Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE));
  const startedAt = Date.now();
  const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  onProgress({
    id: transferId,
    fileName: file.name,
    direction: 'upload',
    totalBytes,
    transferredBytes: 0,
    speed: '0 KB/s',
    status: 'in_progress',
    timestamp
  });

  rtc.sendPeerMessage(
    {
      type: 'file_meta',
      transferId,
      fileName: file.name,
      totalBytes,
      totalChunks,
      mimeType: file.type || 'application/octet-stream'
    },
    targetId
  );

  let sentBytes = 0;
  for (let index = 0; index < totalChunks; index++) {
    if (isCancelled?.()) {
      rtc.sendPeerMessage({ type: 'file_cancel', transferId }, targetId);
      onProgress({
        id: transferId,
        fileName: file.name,
        direction: 'upload',
        totalBytes,
        transferredBytes: sentBytes,
        speed: '0 B/s',
        status: 'failed',
        timestamp
      });
      return false;
    }

    const start = index * CHUNK_SIZE;
    const end = Math.min(totalBytes, start + CHUNK_SIZE);
    const slice = file.slice(start, end);
    const buf = await slice.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);

    await rtc.sendPeerMessageWithBackpressure(
      {
        type: 'file_chunk',
        transferId,
        index,
        data: base64
      },
      targetId
    );

    sentBytes = end;
    onProgress({
      id: transferId,
      fileName: file.name,
      direction: 'upload',
      totalBytes,
      transferredBytes: sentBytes,
      speed: formatTransferSpeed(sentBytes, Date.now() - startedAt),
      status: 'in_progress',
      timestamp
    });
  }

  rtc.sendPeerMessage({ type: 'file_complete', transferId }, targetId);

  onProgress({
    id: transferId,
    fileName: file.name,
    direction: 'upload',
    totalBytes,
    transferredBytes: totalBytes,
    speed: formatTransferSpeed(totalBytes, Math.max(1, Date.now() - startedAt)),
    status: 'completed',
    timestamp
  });

  return true;
}

// Stream a native Tauri OS file path to a remote peer in real chunks
export async function sendTauriFileToPeer(
  rtc: WebRtcClient,
  filePath: string,
  fileName: string,
  totalBytesHint: number,
  targetId: string,
  onProgress: (progress: FileTransferProgress) => void,
  isCancelled?: () => boolean
): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  const transferId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const startedAt = Date.now();
  const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const firstChunk = await invokeTauri<TauriFileChunkResult>('read_file_chunk', {
    path: filePath,
    offset: 0,
    length: CHUNK_SIZE
  });
  if (!firstChunk) return false;

  const totalBytes = firstChunk.total_size || totalBytesHint;
  const totalChunks = Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE));

  onProgress({
    id: transferId,
    fileName,
    direction: 'upload',
    totalBytes,
    transferredBytes: 0,
    speed: '0 KB/s',
    status: 'in_progress',
    timestamp
  });

  rtc.sendPeerMessage(
    {
      type: 'file_meta',
      transferId,
      fileName,
      totalBytes,
      totalChunks,
      mimeType: 'application/octet-stream'
    },
    targetId
  );

  let offset = 0;
  let index = 0;
  let current = firstChunk;

  while (true) {
    if (isCancelled?.()) {
      rtc.sendPeerMessage({ type: 'file_cancel', transferId }, targetId);
      onProgress({
        id: transferId,
        fileName,
        direction: 'upload',
        totalBytes,
        transferredBytes: offset,
        speed: '0 B/s',
        status: 'failed',
        timestamp
      });
      return false;
    }

    if (current.bytes_read > 0 || index === 0) {
      await rtc.sendPeerMessageWithBackpressure(
        {
          type: 'file_chunk',
          transferId,
          index,
          data: current.data_base64
        },
        targetId
      );
    }

    offset += current.bytes_read;
    onProgress({
      id: transferId,
      fileName,
      direction: 'upload',
      totalBytes,
      transferredBytes: offset,
      speed: formatTransferSpeed(offset, Date.now() - startedAt),
      status: 'in_progress',
      timestamp
    });

    if (current.eof) break;
    index++;

    const next = await invokeTauri<TauriFileChunkResult>('read_file_chunk', {
      path: filePath,
      offset,
      length: CHUNK_SIZE
    });
    if (!next) break;
    current = next;
  }

  rtc.sendPeerMessage({ type: 'file_complete', transferId }, targetId);

  onProgress({
    id: transferId,
    fileName,
    direction: 'upload',
    totalBytes,
    transferredBytes: totalBytes,
    speed: formatTransferSpeed(totalBytes, Math.max(1, Date.now() - startedAt)),
    status: 'completed',
    timestamp
  });

  return true;
}
