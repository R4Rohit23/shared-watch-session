import { YouTubeEvent, YouTubePlayer } from 'react-youtube';

export type YouTubePlayerRef = YouTubePlayer | null;

export interface YouTubePlayerEvent extends YouTubeEvent {
  target: YouTubePlayer;
}

export interface YouTubeOptions {
  height: string;
  width: string;
  playerVars: {
    autoplay: number;
    controls: number;
    rel: number;
    modestbranding: number;
  };
}

