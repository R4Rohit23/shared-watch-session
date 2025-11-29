import { Socket } from 'socket.io';

export interface SessionState {
  videoUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  lastUpdateTime: number;
  userCount: number;
}

export interface ChangeVideoData {
  videoUrl: string;
}

export interface PlayPauseSeekData {
  currentTime: number;
}

export interface TimeUpdateData {
  currentTime: number;
}

export interface SessionStateResponse {
  videoUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  timestamp: number;
}

export interface VideoChangedResponse {
  videoUrl: string;
  timestamp: number;
}

export interface PlayPauseSeekResponse {
  currentTime: number;
  timestamp: number;
}

export interface TimeSyncResponse {
  currentTime: number;
  timestamp: number;
}

export type SocketType = Socket;

