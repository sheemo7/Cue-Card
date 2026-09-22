export interface Cue {
  id: string;
  name: string;
  hue: string;
  blob?: Blob;
  url: string;
  dur: number;          // full duration in seconds
  trimStart?: number;   // optional non-destructive trim start
  trimEnd?: number;     // optional non-destructive trim end
  target?: number;      // target time (seconds)
  script?: string;      // teleprompter text / notes
  created: number;
}

export interface DeckSession {
  id: number;
  name: string;
  savedAt: number;
  cues: Array<{
    id: string;
    name: string;
    hue: string;
    dur: number;
    trimStart?: number;
    trimEnd?: number;
    target?: number;
    script?: string;
    blob: Blob;
  }>;
}

export interface ExportDeckFile {
  app: 'sottocue';
  version: 2;
  name: string;
  exportedAt: number;
  cues: Array<{
    id: string;
    name: string;
    hue: string;
    dur: number;
    trimStart?: number;
    trimEnd?: number;
    target?: number;
    script?: string;
    type: string;
    b64: string;
  }>;
}

export const HUES = [
  '#c58b4a', // Bronze
  '#7e8e6f', // Sage
  '#6e7f95', // Slate Blue
  '#b05a4e', // Rust Terra
  '#8a7a9b', // Heather
  '#d4a359', // Ochre Amber
  '#599e82', // Malachite
  '#b2738a', // Mauve
];

export const SHAPES = ['●', '▲', '■', '◆', '★', '✦', '⬢', '◈'];

export function shapeForHue(hue: string): string {
  const idx = HUES.indexOf(hue);
  return idx >= 0 ? SHAPES[idx % SHAPES.length] : '●';
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

export function formatTimeMs(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00.0';
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  const parts = sec.split('.');
  return `${m}:${parts[0].padStart(2, '0')}.${parts[1]}`;
}

export function parseTargetTime(str: string): number {
  const clean = (str || '').trim();
  if (!clean) return 0;
  const parts = clean.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

export function cleanCueName(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim() || 'Untitled cue';
}

export const PLAYBACK_SPEEDS = [0.75, 0.9, 1.0, 1.15, 1.25, 1.5, 1.75, 2.0];
