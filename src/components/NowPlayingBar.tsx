import React, { useState } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  X,
  FileText,
  Gauge,
} from 'lucide-react';
import { Cue, shapeForHue, formatTime, PLAYBACK_SPEEDS } from '../types';

interface NowPlayingBarProps {
  currentCue: Cue | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  onStop: () => void;
  onSeek: (fraction: number) => void;
  onOpenScript: () => void;
}

export const NowPlayingBar: React.FC<NowPlayingBarProps> = ({
  currentCue,
  isPlaying,
  isPaused,
  currentTime,
  duration,
  playbackSpeed,
  onChangeSpeed,
  onTogglePlay,
  onRestart,
  onStop,
  onSeek,
  onOpenScript,
}) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  if (!currentCue) return null;

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  return (
    <div
      className="fixed left-2 right-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-40 bg-[#1d1a17] border border-[#9a6a33] p-3 shadow-2xl transition-transform max-w-4xl mx-auto"
      style={{ borderLeftColor: currentCue.hue, borderLeftWidth: '4px' }}
    >
      {/* Top row: Cue label, script trigger, time display */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3.5 h-3.5 text-[9px] font-black text-[#121110] flex items-center justify-center font-mono leading-none flex-none"
            style={{ backgroundColor: currentCue.hue }}
          >
            {shapeForHue(currentCue.hue)}
          </span>
          <div
            onClick={currentCue.script ? onOpenScript : undefined}
            className={`font-bold text-sm text-[#ece6da] truncate flex items-center gap-2 ${
              currentCue.script ? 'cursor-pointer hover:text-[#c58b4a]' : ''
            }`}
          >
            <span className="truncate">{currentCue.name}</span>
            {currentCue.script && (
              <span className="text-[11px] font-mono text-[#c58b4a] bg-[#c58b4a]/10 border border-[#c58b4a]/30 px-1 py-0.2 flex items-center gap-0.5 flex-none">
                <FileText className="w-2.5 h-2.5" />
                <span>Script</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#c58b4a] flex-none">
          <span>{formatTime(currentTime)}</span>
          <span className="text-[#8d8478]">/</span>
          <span className="text-[#8d8478]">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Center row: Seek slider */}
      <div className="mb-2.5">
        <input
          type="range"
          min="0"
          max="1000"
          value={Math.round(progress * 1000)}
          onChange={(e) => onSeek(Number(e.target.value) / 1000)}
          aria-label="Audio scrubber"
          className="w-full h-1.5 bg-[#322d28] accent-[#c58b4a] cursor-pointer appearance-none outline-none"
        />
      </div>

      {/* Bottom row: Control buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Restart */}
          <button
            type="button"
            onClick={onRestart}
            className="w-9 h-9 border border-[#322d28] bg-[#262220] hover:bg-[#322d28] text-[#ece6da] flex items-center justify-center transition-colors active:scale-95"
            title="Restart cue"
            aria-label="Restart cue"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-10 h-10 bg-[#c58b4a] hover:bg-[#d4a359] text-[#171208] flex items-center justify-center transition-transform active:scale-95 font-bold shadow"
            title={isPlaying ? 'Pause' : 'Resume'}
            aria-label={isPlaying ? 'Pause' : 'Resume'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Speed Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="h-9 px-2.5 border border-[#322d28] bg-[#262220] hover:bg-[#322d28] text-[#ece6da] flex items-center gap-1 text-xs font-mono font-bold transition-colors"
              title="Playback speed"
            >
              <Gauge className="w-3.5 h-3.5 text-[#c58b4a]" />
              <span>{playbackSpeed}x</span>
            </button>

            {showSpeedMenu && (
              <div className="absolute bottom-11 left-0 bg-[#262220] border border-[#322d28] p-1 grid grid-cols-2 gap-1 z-50 shadow-xl w-32">
                {PLAYBACK_SPEEDS.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => {
                      onChangeSpeed(sp);
                      setShowSpeedMenu(false);
                    }}
                    className={`px-2 py-1 text-xs font-mono text-center transition-colors ${
                      playbackSpeed === sp
                        ? 'bg-[#c58b4a] text-[#171208] font-bold'
                        : 'text-[#ece6da] hover:bg-[#322d28]'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stop button */}
        <button
          type="button"
          onClick={onStop}
          className="w-9 h-9 border border-[#322d28] bg-[#262220] hover:bg-[#322d28] text-[#8d8478] hover:text-[#ece6da] flex items-center justify-center transition-colors active:scale-95"
          title="Stop playback"
          aria-label="Stop playback"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
