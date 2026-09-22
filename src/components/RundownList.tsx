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
  Tag,
  X,
} from 'lucide-react';
import { Cue, shapeForHue, formatTime } from '../types';
import { getTagStyle } from './TagFilterBar';

interface RundownListProps {
  cues: Cue[];
  currentCue: Cue | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentProgress: number;
  currentTime: number;
  isEditing: boolean;
  activeTag?: string | null;
  onTapPad: (cue: Cue) => void;
  onEditCue: (cue: Cue) => void;
  onDeleteCue: (cue: Cue) => void;
  onMoveCue: (index: number, direction: 'up' | 'down') => void;
  onOpenScriptModal: (cue: Cue) => void;
  onSelectTag?: (tag: string | null) => void;
  onToggleTake?: (cueId: string, takeIndex: number) => void;
}

export const RundownList: React.FC<RundownListProps> = ({
  cues,
  currentCue,
  isPlaying,
  isPaused,
  currentProgress,
  currentTime,
  isEditing,
  activeTag,
  onTapPad,
  onEditCue,
  onDeleteCue,
  onMoveCue,
  onOpenScriptModal,
  onSelectTag,
  onToggleTake,
}) => {
  if (cues.length === 0) {
    if (activeTag) {
      return (
        <div className="mt-16 text-center px-6 text-[#8d8478] max-w-md mx-auto">
          <div className="w-14 h-14 mx-auto mb-4 border border-[#322d28] bg-[#1d1a17] flex items-center justify-center text-[#c58b4a]">
            <Tag className="w-6 h-6" />
          </div>
          <h2 className="text-[#ece6da] text-lg font-bold mb-2">
            No cues tagged &ldquo;{activeTag}&rdquo;
          </h2>
          <p className="text-sm leading-relaxed mb-6 text-[#8d8478]">
            No cues in your rundown currently match the #{activeTag} tag. Clear the filter to
            view all rundown cues.
          </p>
          <button
            type="button"
            onClick={() => onSelectTag?.(null)}
            className="px-5 py-2.5 bg-[#c58b4a] hover:bg-[#d4a359] text-[#171208] text-xs font-black tracking-wider uppercase inline-flex items-center gap-2 shadow-lg"
          >
            <X className="w-4 h-4" />
            <span>Show All Cues</span>
          </button>
        </div>
      );
    }

    return (
      <div className="p-8 text-center text-[#8d8478] font-mono text-sm">
        No cues in this deck. Add or import cues to construct your rundown.
      </div>
    );
  }

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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      onClick={() => onTapPad(cue)}
                      className="text-base font-bold text-[#ece6da] cursor-pointer hover:text-[#c58b4a] transition-colors"
                    >
                      {cue.name}
                    </h3>
                    {(cue.isTemplate || cue.tags?.some((t) => t.toLowerCase() === 'philosophy')) && (
                      <span className="px-1.5 py-0.2 border border-[#d49b55]/60 bg-[#d49b55]/15 text-[#e5b364] text-[9px] font-mono font-bold tracking-wider uppercase">
                        TEMPLATE
                      </span>
                    )}
                    {(cue.altBlob || cue.altUrl) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTake?.(cue.id, cue.activeTakeIndex === 1 ? 0 : 1);
                        }}
                        className="px-1.5 py-0.2 border border-[#c58b4a] bg-[#c58b4a]/20 text-[#e5b364] text-[9px] font-mono font-bold tracking-wider uppercase hover:bg-[#c58b4a]/35 transition-colors"
                        title="Toggle between Take 1 and Take 2 (Voice)"
                      >
                        {cue.activeTakeIndex === 1 ? 'T2 · VOICE' : 'T1 · TONE'}
                      </button>
                    )}
                  </div>
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

                {/* Category / Mood Tag Badges */}
                {cue.tags && cue.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cue.tags.map((tag) => {
                      const isCurrentActive = activeTag?.toLowerCase() === tag.toLowerCase();
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTag?.(isCurrentActive ? null : tag);
                          }}
                          className={`px-1.5 py-0.5 text-[10px] font-mono border transition-all ${getTagStyle(
                            tag,
                            isCurrentActive
                          )}`}
                          title={`Filter by tag #${tag}`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                )}

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
