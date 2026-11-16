// Server URL, Runtime Environment (Web / Mobile / Tauri Desktop) & Native Bridge Helper

export interface TauriSystemInfo {
  os: string;
  hostname: string;
  username: string;
  screen_width: number;
  screen_height: number;
  home_dir: string;
  downloads_dir: string;
}

export interface TauriShellResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  cwd: string;
}

export interface TauriFileChunkResult {
  data_base64: string;
  bytes_read: number;
  total_size: number;
  eof: boolean;
}

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(
    w.__TAURI_INTERNALS__ ||
      w.__TAURI__ ||
      window.location.protocol === 'tauri:' ||
      window.location.hostname === 'tauri.localhost' ||
      window.location.hostname.endsWith('.tauri.localhost')
  );
}

export async function invokeTauri<T = any>(cmd: string, args?: Record<string, any>): Promise<T | null> {
  if (!isTauriRuntime()) return null;
  const w = window as any;
  try {
    if (w.__TAURI__?.core?.invoke) {
      return await w.__TAURI__.core.invoke(cmd, args);
    }
    if (w.__TAURI_INTERNALS__?.invoke) {
      return await w.__TAURI_INTERNALS__.invoke(cmd, args);
    }
  } catch (err) {
    console.warn(`[Tauri] invoke('${cmd}') failed:`, err);
    throw err;
  }
  return null;
}

export function normalizeServerBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Default to http:// for IP:port or localhost, https:// for domain names
  if (/^(localhost|127\.0\.0\.1|\d{1,3}(\.\d{1,3}){3})(:\d+)?$/i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

export function getServerBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const saved = localStorage.getItem('mehdesk_server_url');
  if (saved && saved.trim()) {
    return normalizeServerBaseUrl(saved);
  }
  const envUrl = (import.meta as any).env?.VITE_SERVER_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return normalizeServerBaseUrl(envUrl);
  }
  if (!isTauriRuntime()) {
    return window.location.origin;
  }
  return '';
}

export function setServerBaseUrl(url: string): string {
  const normalized = normalizeServerBaseUrl(url);
  if (normalized) {
    localStorage.setItem('mehdesk_server_url', normalized);
  } else {
    localStorage.removeItem('mehdesk_server_url');
  }
  return normalized;
}

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = getServerBaseUrl();
  if (!base) return cleanPath;
  return `${base}${cleanPath}`;
}

export function getWebSocketUrl(): string {
  const base = getServerBaseUrl();
  if (base) {
    const parsed = new URL(base);
    const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${parsed.host}/ws`;
  }
  if (typeof window !== 'undefined' && !isTauriRuntime()) {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.host}/ws`;
  }
  return '';
}
