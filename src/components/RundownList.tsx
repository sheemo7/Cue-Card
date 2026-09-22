import React from 'react';
import {
  Play,
  Pause,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  FileText,
} from 'lucide-react';
import { Cue, shapeForHue, formatTime } from '../types';

interface RundownListProps {
  cues: Cue[];
  currentCue: Cue | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentProgress: number;
  currentTime: number;
  isEditing: boolean;
  onTapPad: (cue: Cue) => void;
  onEditCue: (cue: Cue) => void;
  onDeleteCue: (cue: Cue) => void;
  onMoveCue: (index: number, direction: 'up' | 'down') => void;
  onOpenScriptModal: (cue: Cue) => void;
}

export const RundownList: React.FC<RundownListProps> = ({
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
  onOpenScriptModal,
}) => {
  return (
    <div className="p-3 pb-32 max-w-4xl mx-auto space-y-2">
      {cues.map((cue, index) => {
        const isThisCurrent = currentCue?.id === cue.id;
        const isThisPlaying = isThisCurrent && isPlaying;
        const isThisPaused = isThisCurrent && isPaused;
        const progress = isThisCurrent ? currentProgress : 0;
        const remaining = isThisCurrent ? Math.max(0, cue.dur - currentTime) : cue.dur;

        return (
          <div
            key={cue.id}
            className={`relative overflow-hidden border p-3 transition-colors ${
              isThisPlaying
                ? 'border-[#c58b4a] bg-[#1d1a17] ring-1 ring-[#c58b4a]'
                : isThisPaused
                ? 'border-[#9a6a33] bg-[#1d1a17]'
                : 'border-[#322d28] bg-[#1d1a17] hover:border-[#4a4138]'
            }`}
          >
            {/* Live Progress Fill Bar */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#c58b4a]/25 to-[#c58b4a]/5 pointer-events-none transition-all duration-75 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />

            <div className="relative z-10 flex items-start gap-3">
              {/* Play/Pause Button */}
              <button
                type="button"
                onClick={() => onTapPad(cue)}
                className={`w-9 h-9 flex-none border flex items-center justify-center transition-transform active:scale-95 ${
                  isThisPlaying
                    ? 'bg-[#c58b4a] border-[#c58b4a] text-[#171208]'
                    : isThisPaused
                    ? 'bg-[#9a6a33] border-[#9a6a33] text-[#171208]'
                    : 'bg-[#262220] border-[#322d28] text-[#ece6da] hover:border-[#c58b4a]'
                }`}
                title={isThisPlaying ? 'Pause cue' : 'Play cue'}
              >
                {isThisPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              {/* Marker & Index */}
              <div className="flex-none flex items-center gap-1.5 pt-1">
                <span
                  className="w-4 h-4 text-[10px] font-black text-[#121110] flex items-center justify-center font-mono leading-none"
                  style={{ backgroundColor: cue.hue }}
                >
                  {shapeForHue(cue.hue)}
                </span>
                <span className="text-xs font-mono font-bold text-[#8d8478]">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              {/* Details & Script Excerpt */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <h3
                    onClick={() => onTapPad(cue)}
                    className="text-base font-bold text-[#ece6da] cursor-pointer hover:text-[#c58b4a] transition-colors"
                  >
                    {cue.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#8d8478]">
                    {cue.target ? (
                      <span className="flex items-center gap-1 text-[11px] text-[#8d8478]">
                        <Clock className="w-3 h-3 text-[#c58b4a]" />
                        Target: {formatTime(cue.target)}
                      </span>
                    ) : null}
                    <span
                      className={`font-bold ${
                        isThisPlaying || isThisPaused ? 'text-[#c58b4a]' : 'text-[#8d8478]'
                      }`}
                    >
                      {isThisPlaying ? `-${formatTime(remaining)}` : formatTime(cue.dur)}
                    </span>
                  </div>
                </div>

                {cue.script ? (
                  <p
                    onClick={() => onOpenScriptModal(cue)}
                    className="text-xs text-[#8d8478] hover:text-[#ece6da] line-clamp-2 mt-1 cursor-pointer transition-colors"
                    title="Click to view teleprompter script"
                  >
                    <span className="text-[#c58b4a] font-serif font-black mr-1">¶</span>
                    {cue.script}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#4a4138] italic mt-0.5">
                    No prompter script attached
                  </p>
                )}
              </div>

              {/* Edit Actions */}
              {isEditing ? (
                <div className="flex-none flex items-center gap-1 bg-[#262220] border border-[#322d28] p-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMoveCue(index, 'up')}
                    className="p-1 hover:text-[#c58b4a] disabled:opacity-20"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === cues.length - 1}
                    onClick={() => onMoveCue(index, 'down')}
                    className="p-1 hover:text-[#c58b4a] disabled:opacity-20"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditCue(cue)}
                    className="p-1 hover:text-[#c58b4a]"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCue(cue)}
                    className="p-1 text-[#b05a4e] hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onEditCue(cue)}
                  className="flex-none p-1.5 text-[#8d8478] hover:text-[#c58b4a] border border-transparent hover:border-[#322d28]"
                  title="Edit cue"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
