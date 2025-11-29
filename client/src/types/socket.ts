import { Socket } from 'socket.io-client';

export interface SessionState {
  videoUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  timestamp: number;
}

export interface VideoChangedData {
  videoUrl: string;
  timestamp: number;
}

export interface PlayPauseSeekData {
  currentTime: number;
  timestamp: number;
}

export interface TimeSyncData {
  currentTime: number;
  timestamp: number;
}

export type SocketType = Socket;

