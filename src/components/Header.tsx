import React from 'react';
import {
  Mic,
  Play,
  SlidersHorizontal,
  FolderOpen,
  Upload,
  LayoutGrid,
  List,
  Volume2,
  Sparkles,
  Smartphone,
  Radio,
  Cloud,
} from 'lucide-react';
import { formatTime } from '../types';

interface HeaderProps {
  deckName: string;
  cueCount: number;
  totalDuration: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onOpenSessions: () => void;
  onOpenVoiceRecord: () => void;
  onOpenScripturePrompter: () => void;
  onOpenVoiceAssistant: () => void;
  onOpenImport: () => void;
  onRunDeck: () => void;
  viewMode: 'grid' | 'list';
  onToggleViewMode: () => void;
  outputDeviceName: string;
  onOpenOutputPicker: () => void;
  onOpenApkModal: () => void;
  currentUser?: any;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  deckName,
  cueCount,
  totalDuration,
  isEditing,
  onToggleEdit,
  onOpenSessions,
  onOpenVoiceRecord,
  onOpenScripturePrompter,
  onOpenVoiceAssistant,
  onOpenImport,
  onRunDeck,
  viewMode,
  onToggleViewMode,
  outputDeviceName,
  onOpenOutputPicker,
  onOpenApkModal,
  currentUser,
  onOpenAuthModal,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#121110]/95 backdrop-blur-md border-b border-[#322d28]/70 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2.5 transition-colors">
      {/* Top Brand & Actions Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-none">
          <div className="text-[17px] font-extrabold tracking-[0.12em] uppercase text-[#ece6da] leading-none">
            <span className="text-[#c58b4a]">Sotto Cue</span> <span className="text-[#8d8478] font-light text-sm mx-0.5">·</span> <span>Cue Card</span>
          </div>
          <p className="text-[8.5px] font-semibold tracking-[0.22em] text-[#8d8478] uppercase mt-1">
            In-Ear Prompter & Soundboard
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <button
            type="button"
            onClick={onToggleViewMode}
            className="px-2.5 py-1.5 border border-[#322d28] bg-[#1d1a17] text-[#ece6da] hover:bg-[#262220] text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            title={viewMode === 'grid' ? 'Switch to Rundown List' : 'Switch to Soundboard Grid'}
            aria-label="Toggle View Mode"
          >
            {viewMode === 'grid' ? (
              <>
                <List className="w-3.5 h-3.5 text-[#c58b4a]" />
                <span className="hidden sm:inline">Rundown</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-[#c58b4a]" />
                <span className="hidden sm:inline">Grid</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSessions}
            className="px-2.5 py-1.5 border border-[#322d28] bg-[#1d1a17] text-[#ece6da] hover:bg-[#262220] text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#c58b4a]" />
            <span className="hidden sm:inline">Sessions</span>
          </button>

          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className={`px-2.5 py-1.5 border text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                currentUser
                  ? 'border-[#599e82]/50 bg-[#599e82]/10 text-[#ece6da] hover:bg-[#599e82]/20'
                  : 'border-[#322d28] bg-[#1d1a17] text-[#ece6da] hover:bg-[#262220]'
              }`}
              title={
                currentUser
                  ? `Firebase Cloud Sync Active (${currentUser.email})`
                  : 'Sign in with Google to sync decks across devices'
              }
            >
              {currentUser ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#599e82]" />
                  <Cloud className="w-3.5 h-3.5 text-[#599e82]" />
                  <span className="hidden sm:inline">Cloud Sync</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-[#8d8478]" />
                  <span className="hidden sm:inline">Sign In</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenApkModal}
            className="px-2.5 py-1.5 border border-[#4a4138] bg-[#1d1a17] text-[#ece6da] hover:bg-[#262220] hover:border-[#c58b4a] text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            title="Install as Android APK or run phone hardware audit"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#c58b4a]" />
            <span className="hidden sm:inline">Phone APK</span>
          </button>

          <button
            type="button"
            onClick={onToggleEdit}
            aria-pressed={isEditing}
            className={`px-3 py-1.5 border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
              isEditing
                ? 'border-[#c58b4a] text-[#c58b4a] bg-[#c58b4a]/10'
                : 'border-[#322d28] bg-[#1d1a17] text-[#ece6da] hover:bg-[#262220]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Done' : 'Edit'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenImport}
            className="px-3 py-1.5 bg-[#c58b4a] hover:bg-[#d4a359] text-[#171208] text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Deck Metadata & Quick Run Strip */}
      <div className="flex items-center justify-between text-xs tracking-wider uppercase text-[#8d8478] mt-2.5 pb-1">
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <span className="font-bold text-[#ece6da] truncate max-w-[200px] sm:max-w-[320px]">
            {deckName || 'Current Deck'}
          </span>
          <span className="text-[#322d28]">/</span>
          <span className="text-[#8d8478] font-mono text-[11px] whitespace-nowrap">
            {cueCount} {cueCount === 1 ? 'cue' : 'cues'} · {formatTime(totalDuration)}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenOutputPicker}
          className="flex items-center gap-1 text-[11px] text-[#8d8478] hover:text-[#c58b4a] lowercase truncate transition-colors"
          title="Click to route audio to your Bluetooth headset or in-ear monitor"
        >
          <Volume2 className="w-3 h-3 text-[#c58b4a] flex-none" />
          <span className="hidden md:inline">ear output:</span>
          <span className="underline decoration-[#322d28] truncate max-w-[120px]">
            {outputDeviceName}
          </span>
        </button>
      </div>

      {/* Main Action Bar: Record Voice, Ear Assistant, Scripture Prompter, & Run Deck */}
      <div className="flex gap-2 pt-1.5 flex-wrap sm:flex-nowrap">
        <button
          type="button"
          onClick={onOpenVoiceAssistant}
          className="flex-1 min-w-[135px] py-2 px-2.5 border border-[#c58b4a] bg-[#1d1a17] hover:bg-[#c58b4a]/20 active:scale-[0.98] text-[#ece6da] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 transition-transform shadow-sm"
          title="Pick up phone and speak: switch decks, lookup KJV scriptures, or have oral conversation"
        >
          <span className="w-2 h-2 rounded-full bg-[#c58b4a] animate-pulse flex-none" />
          <Radio className="w-3.5 h-3.5 text-[#c58b4a]" />
          <span>Ear Assistant</span>
        </button>

        <button
          type="button"
          onClick={onOpenVoiceRecord}
          className="flex-1 min-w-[115px] py-2 px-2.5 border border-[#322d28] bg-[#1d1a17] hover:bg-[#262220] active:scale-[0.98] text-[#ece6da] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 transition-transform"
          title="X VOX — Record your voice or synthesize spoken audio prompts for in-ear delivery"
        >
          <span className="w-2 h-2 rounded-full bg-[#c4554a] animate-pulse flex-none" />
          <Mic className="w-3.5 h-3.5 text-[#c4554a]" />
          <span>X VOX</span>
        </button>

        <button
          type="button"
          onClick={onOpenScripturePrompter}
          className="flex-1 min-w-[125px] py-2 px-2.5 border border-[#c58b4a]/60 bg-[#c58b4a]/10 hover:bg-[#c58b4a]/20 active:scale-[0.98] text-[#ece6da] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 transition-transform"
          title="X REBUT — Source scriptures by emotion with Gemini AI and generate voice cues for in-ear rebuttal drill"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#c58b4a]" />
          <span className="text-[#c58b4a]">X REBUT</span>
        </button>

        <button
          type="button"
          onClick={onRunDeck}
          disabled={cueCount === 0}
          className="flex-1 min-w-[125px] py-2 px-3 bg-[#c58b4a] hover:bg-[#d4a359] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] text-[#171208] text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 transition-transform shadow-md"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run Deck ▸</span>
        </button>
      </div>
    </header>
  );
};
