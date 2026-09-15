export type OSType = 'windows' | 'linux' | 'macos' | 'android' | 'ios';

export type DeviceStatus = 'online' | 'offline' | 'busy' | 'locked';

export interface Device {
  id: string;
  name: string;
  alias: string;
  department: string;
  location: string;
  os: OSType;
  status: DeviceStatus;
  ip: string;
  lastSeen: string;
  unattendedAccess: boolean;
  unattendedPassword?: string;
  specs: {
    cpu: string;
    ram: string;
    storage: string;
    resolution: string;
    monitorsCount: number;
    osVersion: string;
  };
  thumbnail?: string;
  isFavorite?: boolean;
}

export interface SessionPermissions {
  allowMouseKeyboard: boolean;
  allowClipboard: boolean;
  allowAudio: boolean;
  allowFileTransfer: boolean;
  allowTerminal: boolean;
  allowRecording: boolean;
  allowRestart: boolean;
  allowWhiteboard: boolean;
  allowPrivacyScreen: boolean;
}

export type QualityPreset = 'best' | 'balanced' | 'speed';
export type DisplayMode = 'fit' | 'original' | 'stretch' | 'fullscreen';
export type TouchInputMode = 'trackpad' | 'direct';

export interface SessionStats {
  fps: number;
  latencyMs: number;
  bitrateKbps: number;
  packetLoss: number;
  codec: string;
  resolution: string;
}

export interface RemoteFile {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  modified: string;
  type: string;
  extension?: string;
}

export interface FileTransferProgress {
  id: string;
  fileName: string;
  direction: 'upload' | 'download';
  totalBytes: number;
  transferredBytes: number;
  speed: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'local' | 'remote' | 'system';
  senderName: string;
  text: string;
  time: string;
}

export interface WhiteboardStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'arrow';
}
