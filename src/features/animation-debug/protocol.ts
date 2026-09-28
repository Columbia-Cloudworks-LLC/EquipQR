export interface StageSnapshot {
  type: 'animation-snapshot';
  time: number;
  tracks: { name: string; time: number; duration: string; state: string }[];
  tweens: number;
  tweenTracks: { name: string; time: number; duration: string; state: string }[];
  markers: string[];
  events: string[];
  error?: string;
}

export const FRAME_MS = 1000 / 60;
