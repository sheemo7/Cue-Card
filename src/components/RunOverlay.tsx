import React, { useEffect, useRef, useState } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  X,
  Eye,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Cue, shapeForHue, formatTime } from '../types';

interface RunOverlayProps {
  isOpen: boolean;
  deckName: string;
  cues: Cue[];
  currentIndex: number;
  currentCue: Cue | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  isGapCountdown: boolean;
  gapRemaining: number;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSkipNext: () => void;
  onEndRun: () => void;
}

export const RunOverlay: React.FC<RunOverlayProps> = ({
  isOpen,
  deckName,
  cues,
  currentIndex,
  currentCue,
  isPlaying,
  isPaused,
  currentTime,
  duration,
  isGapCountdown,
  gapRemaining,
  onTogglePlay,
  onRestart,
  onSkipNext,
  onEndRun,
}) => {
  const [oledMode, setOledMode] = useState(false);
  const scriptContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll script to match audio progress
  useEffect(() => {
    if (!isOpen || isGapCountdown || !scriptContainerRef.current || duration <= 0) return;
    const container = scriptContainerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll > 0) {
      const progress = Math.min(1, Math.max(0, currentTime / duration));
      container.scrollTop = maxScroll * progress;
    }
  }, [isOpen, isGapCountdown, currentTime, duration]);

  // Keyboard navigation for presentation clickers and keyboards
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'Enter') {
        e.preventDefault();
        onSkipNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        onRestart();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onEndRun();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onTogglePlay, onSkipNext, onRestart, onEndRun]);

  if (!isOpen) return null;

  const nextCue = currentIndex + 1 < cues.length ? cues[currentIndex + 1] : null;
  const remaining = Math.max(0, duration - currentTime);
  const isOverTarget = currentCue?.target && currentTime > currentCue.target;
  const targetDiff = currentCue?.target ? Math.abs(currentTime - currentCue.target) : 0;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col p-4 sm:p-6 transition-colors select-none ${
        oledMode ? 'bg-black text-[#d4975a]' : 'bg-[#121110] text-[#ece6da]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 text-xs tracking-widest uppercase font-mono pb-3 border-b border-[#322d28]">
        <div className="flex items-center gap-2 text-[#8d8478]">
          <span className="font-bold text-[#c58b4a]">
            CUE {currentIndex + 1} OF {cues.length}
          </span>
          <span>·</span>
          <span className="truncate max-w-[200px]">{deckName}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOledMode(!oledMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 border text-[11px] font-bold uppercase transition-colors ${
              oledMode
                ? 'border-[#c58b4a] text-[#c58b4a] bg-[#c58b4a]/10'
                : 'border-[#322d28] text-[#8d8478] hover:text-[#ece6da]'
            }`}
            title="Stage / Backstage true-black mode to eliminate ambient screen glare"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{oledMode ? 'Stage OLED On' : 'Stage OLED'}</span>
          </button>

          <button
            type="button"
            onClick={onEndRun}
            className="w-8 h-8 border border-[#322d28] hover:border-[#c58b4a] text-[#8d8478] hover:text-[#ece6da] flex items-center justify-center transition-colors"
            title="Exit run mode"
            aria-label="Exit run mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isGapCountdown ? (
        /* Gap Countdown Between Cues */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
          <span className="text-xs uppercase tracking-[0.25em] text-[#8d8478] font-mono">
            Upcoming Cue
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold max-w-xl text-[#ece6da]">
            {nextCue ? nextCue.name : 'Finished'}
          </h2>
          <div className="text-7xl sm:text-9xl font-mono font-black text-[#c58b4a] tracking-tight animate-pulse">
            {gapRemaining}
          </div>
          <p className="text-xs text-[#8d8478] font-mono">
            Ready your voice · Tap skip or wait for auto-advance
          </p>
        </div>
      ) : (
        /* Active Cue Playing / Reading */
        <div className="flex-1 flex flex-col min-h-0 pt-4 pb-2">
          {/* Cue Title */}
          <div className="flex items-center gap-2 mb-2">
            {currentCue && (
              <span
                className="w-4 h-4 text-[10px] font-black text-[#121110] flex items-center justify-center font-mono leading-none flex-none"
                style={{ backgroundColor: currentCue.hue }}
              >
                {shapeForHue(currentCue.hue)}
              </span>
            )}
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight truncate text-[#ece6da]">
              {currentCue?.name}
            </h1>
          </div>

          {/* Clock Display */}
          <div className="flex items-baseline gap-4 mb-2 font-mono">
            <span className="text-5xl sm:text-7xl font-extrabold text-[#c58b4a] tracking-tight">
              {formatTime(remaining)}
            </span>

            {/* Target pacing telemetry */}
            {currentCue?.target ? (
              <div
                className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 ${
                  isOverTarget ? 'text-[#b05a4e]' : 'text-[#8d8478]'
                }`}
              >
                {isOverTarget ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-[#b05a4e]" />
                    <span>Over target by +{formatTime(targetDiff)}</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-[#c58b4a]" />
                    <span>
                      Target {formatTime(currentCue.target)} ({formatTime(targetDiff)} left)
                    </span>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {/* Script Reader Body */}
          <div
            ref={scriptContainerRef}
            className="flex-1 overflow-y-auto border-t border-[#322d28] py-4 pr-2 font-sans text-lg sm:text-2xl leading-relaxed whitespace-pre-wrap scroll-smooth"
          >
            {currentCue?.script ? (
              <p className={oledMode ? 'text-[#e5b375]' : 'text-[#ece6da]'}>
                {currentCue.script}
              </p>
            ) : (
              <div className="h-full flex items-center justify-center text-[#8d8478] italic text-sm">
                No script text for this cue. Listen to the in-ear prompt.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Stage Controls */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#322d28]">
        <div className="flex items-center gap-2">
          {/* Restart */}
          <button
            type="button"
            onClick={onRestart}
            className="w-12 h-12 border border-[#322d28] bg-[#1d1a17] hover:bg-[#262220] text-[#ece6da] flex items-center justify-center transition-transform active:scale-95"
            title="Restart cue (Left Arrow / PageUp)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-14 h-14 bg-[#c58b4a] hover:bg-[#d4a359] text-[#171208] flex items-center justify-center transition-transform active:scale-95 font-black shadow-lg"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-0.5" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Skip Next */}
          <button
            type="button"
            onClick={onSkipNext}
            className="px-4 h-12 border border-[#322d28] bg-[#1d1a17] hover:bg-[#262220] text-[#ece6da] flex items-center gap-2 font-bold uppercase tracking-wider text-xs transition-transform active:scale-95"
            title="Next cue (Right Arrow / PageDown / Enter)"
          >
            <span>Next Cue</span>
            <SkipForward className="w-4 h-4" />
          </button>

          {/* End Run */}
          <button
            type="button"
            onClick={onEndRun}
            className="w-12 h-12 border border-[#322d28] bg-[#1d1a17] hover:bg-[#262220] text-[#8d8478] hover:text-[#ece6da] flex items-center justify-center transition-transform active:scale-95"
            title="End run (Escape)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
