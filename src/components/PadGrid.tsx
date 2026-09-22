import React from 'react';
import {
  MoreVertical,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Volume2,
  Pause,
  Play,
  FileText,
} from 'lucide-react';
import { Cue, shapeForHue, formatTime } from '../types';

interface PadGridProps {
  cues: Cue[];
  currentCue: Cue | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentProgress: number; // 0 to 1
  currentTime: number;
  isEditing: boolean;
  onTapPad: (cue: Cue) => void;
  onEditCue: (cue: Cue) => void;
  onDeleteCue: (cue: Cue) => void;
  onMoveCue: (index: number, direction: 'up' | 'down') => void;
  onOpenEmptyImport: () => void;
}

export const PadGrid: React.FC<PadGridProps> = ({
  cues,
  currentCue,
  isPlaying,
  isPaused,
  currentProgress,
  currentTime,
  isEditing,
  onTapPad,
  onEditCue,
  onDeleteCue,
  onMoveCue,
  onOpenEmptyImport,
}) => {
  if (cues.length === 0) {
    return (
      <div className="mt-16 text-center px-6 text-[#8d8478] max-w-md mx-auto">
        <div className="w-14 h-14 mx-auto mb-4 border border-[#322d28] bg-[#1d1a17] flex items-center justify-center text-[#c58b4a]">
          <Volume2 className="w-6 h-6" />
        </div>
        <h2 className="text-[#ece6da] text-lg font-bold mb-2">No cues in deck</h2>
        <p className="text-sm leading-relaxed mb-6 text-[#8d8478]">
          Import audio tracks, record your voice, or load a drill session. Tap a pad to hear
          your prompt in ear while you speak aloud to your audience.
        </p>
        <button
          type="button"
          onClick={onOpenEmptyImport}
          className="px-5 py-2.5 bg-[#c58b4a] hover:bg-[#d4a359] text-[#171208] text-xs font-black tracking-wider uppercase inline-flex items-center gap-2 shadow-lg"
        >
          <span>Import Audio Files</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 p-3 pb-32">
      {cues.map((cue, index) => {
        const isThisCurrent = currentCue?.id === cue.id;
        const isThisPlaying = isThisCurrent && isPlaying;
        const isThisPaused = isThisCurrent && isPaused;
        const progress = isThisCurrent ? currentProgress : 0;
        const remaining = isThisCurrent ? Math.max(0, cue.dur - currentTime) : cue.dur;

        return (
          <div
            key={cue.id}
            style={{ '--cue-hue': cue.hue } as React.CSSProperties}
            className={`group relative overflow-hidden border min-h-[128px] p-3 flex flex-col justify-between select-none text-left transition-all duration-150 ${
              isThisPlaying
                ? 'border-[#c58b4a] bg-[#1d1a17] ring-1 ring-[#c58b4a] shadow-[0_0_24px_rgba(197,139,74,0.25)]'
                : isThisPaused
                ? 'border-[#9a6a33] bg-[#1d1a17] ring-1 ring-[#9a6a33]'
                : isEditing
                ? 'border-dashed border-[#4a4138] bg-[#1d1a17]/90'
                : 'border-[#322d28] bg-[#1d1a17] hover:border-[#4a4138] hover:bg-[#221e1a]'
            }`}
          >
            {/* Live Progress Fill Bar */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#c58b4a]/30 to-[#c58b4a]/10 pointer-events-none transition-all duration-75 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />

            {/* Clickable Area for Triggering */}
            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  onEditCue(cue);
                } else {
                  onTapPad(cue);
                }
              }}
              className="absolute inset-0 z-10 w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c58b4a]"
              aria-label={`Play cue ${cue.name}`}
            />

            {/* Top Bar: Shape & Color Marker + Status Pill / Quick Tools */}
            <div className="relative z-20 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-4 h-4 text-[10px] font-black text-[#121110] flex items-center justify-center font-mono leading-none"
                  style={{ backgroundColor: cue.hue }}
                >
                  {shapeForHue(cue.hue)}
                </span>
                <span
                  className="w-4 h-1 rounded-none"
                  style={{ backgroundColor: cue.hue }}
                />
              </div>

              {/* Status or More button */}
              <div className="flex items-center gap-1">
                {isThisPlaying && (
                  <span className="w-5 h-5 bg-[#c58b4a] text-[#171208] flex items-center justify-center text-[10px] font-black animate-pulse">
                    <Volume2 className="w-3 h-3" />
                  </span>
                )}
                {isThisPaused && (
                  <span className="w-5 h-5 bg-[#9a6a33] text-[#171208] flex items-center justify-center text-[10px] font-black">
                    <Pause className="w-3 h-3" />
                  </span>
                )}

                {/* Edit Controls Toolbar */}
                {isEditing ? (
                  <div className="flex items-center gap-1 bg-[#262220] border border-[#322d28] p-0.5 z-30">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveCue(index, 'up');
                      }}
                      className="p-1 hover:text-[#c58b4a] disabled:opacity-20 transition-colors"
                      title="Move earlier"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === cues.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveCue(index, 'down');
                      }}
                      className="p-1 hover:text-[#c58b4a] disabled:opacity-20 transition-colors"
                      title="Move later"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCue(cue);
                      }}
                      className="p-1 hover:text-[#c58b4a] transition-colors"
                      title="Edit label & script"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCue(cue);
                      }}
                      className="p-1 text-[#b05a4e] hover:text-red-400 transition-colors"
                      title="Delete cue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCue(cue);
                    }}
                    className="w-6 h-6 border border-[#322d28] bg-[#1d1a17]/90 text-[#8d8478] hover:text-[#ece6da] hover:border-[#c58b4a] flex items-center justify-center text-xs z-20 transition-colors"
                    title="Cue options"
                    aria-label="Cue options"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Label */}
            <div className="relative z-20 my-2">
              <h3 className="text-base sm:text-lg font-bold text-[#ece6da] leading-snug line-clamp-3 break-words tracking-tight">
                {cue.name}
              </h3>
            </div>

            {/* Bottom Meta */}
            <div className="relative z-20 flex items-center justify-between text-[11px] font-mono tracking-wider text-[#8d8478]">
              <span className="font-semibold text-[#8d8478]">
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className="flex items-center gap-1.5">
                {cue.script && (
                  <span
                    className="text-[#c58b4a] text-xs font-serif font-black"
                    title="Includes teleprompter script"
                  >
                    ¶
                  </span>
                )}
                {cue.target ? (
                  <span className="text-[#8d8478] text-[10px]">
                    tgt {formatTime(cue.target)}
                  </span>
                ) : null}
                <span
                  className={`font-semibold ${
                    isThisPlaying || isThisPaused ? 'text-[#c58b4a]' : 'text-[#8d8478]'
                  }`}
                >
                  {isThisPlaying ? `-${formatTime(remaining)}` : formatTime(cue.dur)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
