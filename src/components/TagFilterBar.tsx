import React from 'react';
import { Tag, ArrowUpDown, X, Filter } from 'lucide-react';
import { PRESET_TAGS } from '../types';

export type SortMode = 'deck' | 'tag' | 'name' | 'duration';

interface TagFilterBarProps {
  allTags: string[];
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
  sortMode: SortMode;
  onChangeSortMode: (mode: SortMode) => void;
  tagCounts: Record<string, number>;
  totalCount: number;
  filteredCount: number;
}

export function getTagStyle(tag: string, isActive = false) {
  const t = tag.toLowerCase();
  if (t === 'philosophy') {
    return isActive
      ? 'bg-[#d49b55] text-[#121110] border-[#d49b55] font-bold shadow-sm'
      : 'text-[#e5b364] border-[#e5b364]/40 bg-[#e5b364]/10 hover:border-[#e5b364]/70';
  }
  if (t === 'scripture') {
    return isActive
      ? 'bg-[#c58b4a] text-[#121110] border-[#c58b4a] font-bold shadow-sm'
      : 'text-[#e5b869] border-[#e5b869]/30 bg-[#e5b869]/10 hover:border-[#e5b869]/60';
  }
  if (t === 'rebuttal') {
    return isActive
      ? 'bg-[#b05a4e] text-white border-[#b05a4e] font-bold shadow-sm'
      : 'text-[#e06d60] border-[#e06d60]/30 bg-[#e06d60]/10 hover:border-[#e06d60]/60';
  }
  if (t === 'inspirational') {
    return isActive
      ? 'bg-[#7e8e6f] text-[#121110] border-[#7e8e6f] font-bold shadow-sm'
      : 'text-[#8fa87a] border-[#8fa87a]/30 bg-[#8fa87a]/10 hover:border-[#8fa87a]/60';
  }
  if (t === 'anchor') {
    return isActive
      ? 'bg-[#6e7f95] text-white border-[#6e7f95] font-bold shadow-sm'
      : 'text-[#8299b8] border-[#8299b8]/30 bg-[#8299b8]/10 hover:border-[#8299b8]/60';
  }
  if (t === 'confidence') {
    return isActive
      ? 'bg-[#d4a359] text-[#121110] border-[#d4a359] font-bold shadow-sm'
      : 'text-[#d49b55] border-[#d49b55]/30 bg-[#d49b55]/10 hover:border-[#d49b55]/60';
  }
  if (t === 'calm') {
    return isActive
      ? 'bg-[#599e82] text-[#121110] border-[#599e82] font-bold shadow-sm'
      : 'text-[#7eb3a0] border-[#7eb3a0]/30 bg-[#7eb3a0]/10 hover:border-[#7eb3a0]/60';
  }
  if (t === 'urgent') {
    return isActive
      ? 'bg-[#c4554a] text-white border-[#c4554a] font-bold shadow-sm'
      : 'text-[#f2a29b] border-[#c4554a]/30 bg-[#c4554a]/10 hover:border-[#c4554a]/60';
  }
  if (t === 'keynote') {
    return isActive
      ? 'bg-[#8a7a9b] text-white border-[#8a7a9b] font-bold shadow-sm'
      : 'text-[#b08ec2] border-[#b08ec2]/30 bg-[#b08ec2]/10 hover:border-[#b08ec2]/60';
  }

  return isActive
    ? 'bg-[#ece6da] text-[#121110] border-[#ece6da] font-bold shadow-sm'
    : 'text-[#c2b8a7] border-[#322d28] bg-[#1d1a17] hover:border-[#4a4138] hover:text-[#ece6da]';
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  allTags,
  activeTag,
  onSelectTag,
  sortMode,
  onChangeSortMode,
  tagCounts,
  totalCount,
  filteredCount,
}) => {
  if (totalCount === 0) return null;

  return (
    <div className="px-3 pt-2 pb-1.5 border-b border-[#262220] bg-[#151311]/90 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Category & Mood Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <span className="flex-none text-[11px] font-mono uppercase tracking-wider text-[#8d8478] flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-[#c58b4a]" />
            <span className="hidden sm:inline">Tag:</span>
          </span>

          {/* All Cues Pill */}
          <button
            type="button"
            onClick={() => onSelectTag(null)}
            className={`flex-none px-2.5 py-1 text-xs font-mono border transition-all whitespace-nowrap ${
              activeTag === null
                ? 'bg-[#c58b4a] text-[#121110] font-bold border-[#c58b4a] shadow-sm'
                : 'text-[#8d8478] border-[#322d28] bg-[#1d1a17] hover:border-[#4a4138] hover:text-[#ece6da]'
            }`}
          >
            All ({totalCount})
          </button>

          {/* Individual Tag Pills */}
          {allTags.map((tag) => {
            const isActive = activeTag?.toLowerCase() === tag.toLowerCase();
            const count = tagCounts[tag] || 0;
            const style = getTagStyle(tag, isActive);

            return (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectTag(isActive ? null : tag)}
                className={`flex-none px-2.5 py-1 text-xs font-mono border transition-all flex items-center gap-1.5 whitespace-nowrap ${style}`}
              >
                <span>{tag}</span>
                <span className="text-[10px] opacity-75">({count})</span>
                {isActive && (
                  <X
                    className="w-2.5 h-2.5 ml-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTag(null);
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Sort by Tag / Deck order Control */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-none pt-1 sm:pt-0">
          {activeTag && (
            <span className="text-[11px] font-mono text-[#c58b4a]">
              Showing {filteredCount} of {totalCount}
            </span>
          )}

          <div className="flex items-center gap-1 text-xs font-mono text-[#8d8478]">
            <ArrowUpDown className="w-3 h-3 text-[#c58b4a]" />
            <span className="hidden md:inline">Sort:</span>
            <select
              value={sortMode}
              onChange={(e) => onChangeSortMode(e.target.value as SortMode)}
              className="bg-[#1d1a17] border border-[#322d28] focus:border-[#c58b4a] text-xs text-[#ece6da] py-1 px-2 outline-none cursor-pointer"
              aria-label="Sort cues"
            >
              <option value="deck">Deck Order (Default)</option>
              <option value="tag">Group by Tag / Mood</option>
              <option value="name">Cue Label (A–Z)</option>
              <option value="duration">Duration (Shortest first)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
