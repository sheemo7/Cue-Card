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
  Tag,
  X,
} from 'lucide-react';
import { Cue, shapeForHue, formatTime } from '../types';
import { getTagStyle } from './TagFilterBar';

interface PadGridProps {
  cues: Cue[];
  currentCue: Cue | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentProgress: number; // 0 to 1
  currentTime: number;
  isEditing: boolean;
  activeTag?: string | null;
  onTapPad: (cue: Cue) => void;
  onEditCue: (cue: Cue) => void;
  onDeleteCue: (cue: Cue) => void;
  onMoveCue: (index: number, direction: 'up' | 'down') => void;
  onOpenEmptyImport: () => void;
  onSelectTag?: (tag: string | null) => void;
  onOpenScriptModal?: (cue: Cue) => void;
  onToggleTake?: (cueId: string, takeIndex: number) => void;
}

export const PadGrid: React.FC<PadGridProps> = ({
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
  onOpenEmptyImport,
  onSelectTag,
  onOpenScriptModal,
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
            None of your soundboard cues currently carry the #{activeTag} tag. Clear the filter
            or edit cues to assign this category.
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
            <div className="relative z-20 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-4 h-4 text-[10px] font-black text-[#121110] flex items-center justify-center font-mono leading-none flex-none"
                  style={{ backgroundColor: cue.hue }}
                >
                  {shapeForHue(cue.hue)}
                </span>
                <span
                  className="w-3 h-1 rounded-none flex-none"
                  style={{ backgroundColor: cue.hue }}
                />

                {/* Template indicator */}
                {(cue.isTemplate || cue.tags?.some((t) => t.toLowerCase() === 'philosophy')) && (
                  <span
                    className="px-1 py-0.2 border border-[#d49b55]/60 bg-[#d49b55]/15 text-[#e5b364] text-[9px] font-mono font-bold tracking-wider uppercase flex-none"
                    title="Template Deck Cue - can be overwritten or augmented with your voice recital"
                  >
                    TEMPLATE
                  </span>
                )}

                {/* Audio take switcher (Take 1 vs Take 2) */}
                {(cue.altBlob || cue.altUrl) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTake?.(cue.id, cue.activeTakeIndex === 1 ? 0 : 1);
                    }}
                    className="px-1.5 py-0.2 border border-[#c58b4a] bg-[#c58b4a]/20 text-[#e5b364] text-[9px] font-mono font-bold tracking-wider uppercase hover:bg-[#c58b4a]/35 transition-colors z-30 flex-none"
                    title="Switch active in-ear playback between Take 1 and Take 2 (Voice)"
                  >
                    {cue.activeTakeIndex === 1 ? 'T2 · VOICE' : 'T1 · TONE'}
                  </button>
                )}
              </div>

              {/* Status, Script trigger or More button */}
              <div className="flex items-center gap-1 flex-none">
                {cue.script && onOpenScriptModal && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenScriptModal(cue);
                    }}
                    className="px-1.5 py-0.5 border border-[#c58b4a]/60 bg-[#c58b4a]/15 hover:bg-[#c58b4a]/30 text-[#e5b364] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 z-30 transition-colors"
                    title="Read prompter script & record voice recital"
                  >
                    <span className="font-serif font-black">¶</span>
                    <span>Script</span>
                  </button>
                )}

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
            <div className="relative z-20 my-1.5 pointer-events-none">
              <h3 className="text-base sm:text-lg font-bold text-[#ece6da] leading-snug line-clamp-2 break-words tracking-tight">
                {cue.name}
              </h3>
            </div>

            {/* Category / Mood Tag Badges */}
            {cue.tags && cue.tags.length > 0 && (
              <div className="relative z-20 flex flex-wrap gap-1 mb-2">
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
                      className={`px-1.5 py-0.5 text-[10px] font-mono border transition-all z-20 ${getTagStyle(
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

            {/* Bottom Meta */}
            <div className="relative z-20 flex items-center justify-between text-[11px] font-mono tracking-wider text-[#8d8478]">
              <span className="font-semibold text-[#8d8478]">
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className="flex items-center gap-1.5">
                {cue.script && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenScriptModal?.(cue);
                    }}
                    className="text-[#c58b4a] hover:text-[#e5b364] text-xs font-serif font-black px-1 py-0.5 z-20"
                    title="Open teleprompter script & voice recorder"
                  >
                    ¶
                  </button>
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
