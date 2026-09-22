import { Cue } from '../types';

export class AudioEngine {
  private audio: HTMLAudioElement;
  private wakeLock: WakeLockSentinel | null = null;
  private currentCue: Cue | null = null;
  private outputDeviceId: string | null = null;
  private speed = 1.0;
  private isPaused = false;
  private animationFrameId: number | null = null;

  public onTimeUpdate?: (currentTime: number, duration: number, progress: number) => void;
  public onEnded?: () => void;
  public onStateChange?: (isPlaying: boolean, isPaused: boolean, currentCue: Cue | null) => void;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    (this.audio as any).preservesPitch = true;

    this.audio.addEventListener('timeupdate', () => {
      this.handleTimeUpdate();
    });

    this.audio.addEventListener('ended', () => {
      this.handleEnded();
    });

    this.audio.addEventListener('play', () => {
      this.updateState();
      this.acquireWakeLock();
    });

    this.audio.addEventListener('pause', () => {
      this.updateState();
    });

    this.setupMediaSession();
  }

  public get audioElement(): HTMLAudioElement {
    return this.audio;
  }

  public getCurrentCue(): Cue | null {
    return this.currentCue;
  }

  public getIsPlaying(): boolean {
    return !this.audio.paused && !this.audio.ended && this.audio.currentTime > 0;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getPlaybackSpeed(): number {
    return this.speed;
  }

  public setPlaybackSpeed(speed: number) {
    this.speed = Math.max(0.5, Math.min(3.0, speed));
    this.audio.playbackRate = this.speed;
  }

  public async setOutputDevice(deviceId: string | null): Promise<boolean> {
    this.outputDeviceId = deviceId;
    if (typeof (this.audio as any).setSinkId === 'function') {
      try {
        await (this.audio as any).setSinkId(deviceId || '');
        return true;
      } catch (err) {
        console.warn('Failed to set audio sink ID:', err);
        return false;
      }
    }
    return false;
  }

  public getOutputDeviceId(): string | null {
    return this.outputDeviceId;
  }

  public async play(cue: Cue, deckName = 'Sotto Cue'): Promise<void> {
    this.currentCue = cue;
    this.isPaused = false;

    if (this.audio.src !== cue.url) {
      this.audio.src = cue.url;
      this.audio.load();
    }

    if (this.outputDeviceId && typeof (this.audio as any).setSinkId === 'function') {
      try {
        await (this.audio as any).setSinkId(this.outputDeviceId);
      } catch {
        // ignore
      }
    }

    this.audio.playbackRate = this.speed;

    const startPoint = cue.trimStart || 0;
    this.audio.currentTime = startPoint;

    this.updateMediaSessionMetadata(cue, deckName);

    try {
      await this.audio.play();
      this.updateState();
      this.startRAF();
    } catch (err) {
      console.warn('Audio play interrupted or blocked:', err);
    }
  }

  public pause(): void {
    if (!this.audio.paused) {
      this.audio.pause();
      this.isPaused = true;
      this.updateState();
      this.stopRAF();
    }
  }

  public resume(): void {
    if (this.currentCue && this.audio.paused) {
      this.isPaused = false;
      this.audio.play().catch(() => {});
      this.updateState();
      this.startRAF();
    }
  }

  public toggle(cue?: Cue, deckName?: string): void {
    if (!this.currentCue && cue) {
      this.play(cue, deckName);
      return;
    }

    if (cue && this.currentCue?.id !== cue.id) {
      this.play(cue, deckName);
      return;
    }

    if (this.getIsPlaying()) {
      this.pause();
    } else {
      this.resume();
    }
  }

  public stop(): void {
    this.stopRAF();
    this.audio.pause();
    this.audio.currentTime = 0;
    this.currentCue = null;
    this.isPaused = false;
    this.updateState();
    this.releaseWakeLock();

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }

    if (this.onTimeUpdate) {
      this.onTimeUpdate(0, 0, 0);
    }
  }

  public restart(): void {
    if (!this.currentCue) return;
    const startPoint = this.currentCue.trimStart || 0;
    this.audio.currentTime = startPoint;
    if (this.isPaused) {
      this.resume();
    } else {
      this.audio.play().catch(() => {});
    }
  }

  public seek(positionFraction: number): void {
    if (!this.currentCue) return;
    const dur = this.getEffectiveDuration();
    const start = this.currentCue.trimStart || 0;
    const target = start + positionFraction * dur;
    this.audio.currentTime = Math.max(start, Math.min(start + dur, target));
    this.handleTimeUpdate();
  }

  public seekSeconds(seconds: number): void {
    if (!this.currentCue) return;
    const start = this.currentCue.trimStart || 0;
    const end = this.currentCue.trimEnd && this.currentCue.trimEnd > start
      ? this.currentCue.trimEnd
      : this.audio.duration || this.currentCue.dur;
    const clamped = Math.max(start, Math.min(end, seconds));
    this.audio.currentTime = clamped;
    this.handleTimeUpdate();
  }

  public getEffectiveDuration(): number {
    if (!this.currentCue) return 0;
    const start = this.currentCue.trimStart || 0;
    const end = this.currentCue.trimEnd && this.currentCue.trimEnd > start
      ? this.currentCue.trimEnd
      : (this.audio.duration || this.currentCue.dur || 0);
    return Math.max(0.1, end - start);
  }

  public getEffectiveCurrentTime(): number {
    if (!this.currentCue) return 0;
    const start = this.currentCue.trimStart || 0;
    return Math.max(0, this.audio.currentTime - start);
  }

  private handleTimeUpdate(): void {
    if (!this.currentCue) return;
    const start = this.currentCue.trimStart || 0;
    const end = this.currentCue.trimEnd && this.currentCue.trimEnd > start
      ? this.currentCue.trimEnd
      : (this.audio.duration || this.currentCue.dur || 0);

    const effCur = Math.max(0, this.audio.currentTime - start);
    const effDur = Math.max(0.1, end - start);
    const progress = Math.min(1, Math.max(0, effCur / effDur));

    if (this.onTimeUpdate) {
      this.onTimeUpdate(effCur, effDur, progress);
    }

    if (end > 0 && this.audio.currentTime >= end - 0.05) {
      this.handleEnded();
    }
  }

  private handleEnded(): void {
    this.stopRAF();
    if (this.onEnded) {
      this.onEnded();
    } else {
      this.stop();
    }
  }

  private updateState(): void {
    const isPlaying = this.getIsPlaying();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : (this.isPaused ? 'paused' : 'none');
    }
    if (this.onStateChange) {
      this.onStateChange(isPlaying, this.isPaused, this.currentCue);
    }
  }

  private startRAF(): void {
    this.stopRAF();
    const loop = () => {
      if (this.currentCue && !this.audio.paused) {
        this.handleTimeUpdate();
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stopRAF(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private async acquireWakeLock(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !this.wakeLock) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch {
        // wakeLock failed or denied
      }
    }
  }

  private releaseWakeLock(): void {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {
        // ignore
      }
      this.wakeLock = null;
    }
  }

  private setupMediaSession(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        this.resume();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        this.stop();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seekSeconds(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 5;
        this.seekSeconds(this.audio.currentTime - offset);
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 5;
        this.seekSeconds(this.audio.currentTime + offset);
      });
    } catch (e) {
      console.warn('Failed to set up MediaSession handlers', e);
    }
  }

  public setMediaSessionNextPrev(onNext?: () => void, onPrev?: () => void): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      if (onNext) {
        navigator.mediaSession.setActionHandler('nexttrack', onNext);
      } else {
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }

      if (onPrev) {
        navigator.mediaSession.setActionHandler('previoustrack', onPrev);
      } else {
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    } catch {
      // ignore
    }
  }

  private updateMediaSessionMetadata(cue: Cue, deckName: string): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: cue.name,
        artist: 'Sotto Cue Prompter',
        album: deckName,
      });
    } catch {
      // ignore
    }
  }
}

export const haptic = (pattern: number | number[] = 10) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
};
