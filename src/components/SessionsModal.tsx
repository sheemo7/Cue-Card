import React, { useState } from 'react';
import {
  X,
  Save,
  FolderOpen,
  Download,
  Upload,
  Copy,
  Pencil,
  Trash2,
  Sparkles,
  Check,
} from 'lucide-react';
import { DeckSession, formatTime } from '../types';

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckName: string;
  sessions: DeckSession[];
  cueCount: number;
  totalDuration: number;
  onSaveSession: (name: string) => void;
  onLoadSession: (session: DeckSession) => void;
  onDeleteSession: (id: number) => void;
  onDuplicateSession: (session: DeckSession) => void;
  onRenameSession: (id: number, newName: string) => void;
  onExportDeck: () => void;
  onImportDeckFile: (file: File) => void;
  onLoadSampleDeck: () => void;
  onLoadPhilosophyDeck?: () => void;
}

export const SessionsModal: React.FC<SessionsModalProps> = ({
  isOpen,
  onClose,
  deckName,
  sessions,
  cueCount,
  totalDuration,
  onSaveSession,
  onLoadSession,
  onDeleteSession,
  onDuplicateSession,
  onRenameSession,
  onExportDeck,
  onImportDeckFile,
  onLoadSampleDeck,
  onLoadPhilosophyDeck,
}) => {
  const [saveName, setSaveName] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editSessionName, setEditSessionName] = useState('');

  if (!isOpen) return null;

  const handleSaveCurrent = () => {
    const name = saveName.trim() || deckName || `Session ${new Date().toLocaleDateString()}`;
    onSaveSession(name);
    setSaveName('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportDeckFile(file);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#1d1a17] border border-[#322d28] p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#322d28] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#ece6da] uppercase tracking-wider">
              Deck Sessions & Backups
            </h2>
            <p className="text-xs text-[#8d8478] font-mono">
              Save rehearsal decks locally on this device or export to share
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8d8478] hover:text-[#ece6da]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Deck Summary */}
        <div className="p-3 bg-[#121110] border border-[#322d28] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#c58b4a] block">
              Active Deck in Memory
            </span>
            <div className="font-bold text-[#ece6da] text-sm truncate max-w-[280px]">
              {deckName}
            </div>
            <div className="text-xs font-mono text-[#8d8478]">
              {cueCount} cues · {formatTime(totalDuration)}
            </div>
          </div>

          <button
            type="button"
            onClick={onExportDeck}
            disabled={cueCount === 0}
            className="px-3 py-1.5 bg-[#262220] border border-[#322d28] hover:border-[#c58b4a] text-xs font-bold uppercase tracking-wider text-[#ece6da] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#c58b4a]" />
            <span>Export .sottocue</span>
          </button>
        </div>

        {/* Save Current Session Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase tracking-wider text-[#8d8478]">
            Save Current Deck As
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g. Final Pitch Rehearsal (Keynote)"
              className="flex-1 bg-[#121110] border border-[#322d28] focus:border-[#c58b4a] px-3 py-2 text-sm text-[#ece6da] outline-none"
            />
            <button
              type="button"
              onClick={handleSaveCurrent}
              disabled={cueCount === 0}
              className="px-4 bg-[#c58b4a] hover:bg-[#d4a359] disabled:opacity-30 text-[#171208] text-xs font-black tracking-widest uppercase flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Saved Sessions List */}
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-[#8d8478] flex items-center justify-between">
            <span>Saved Local Sessions ({sessions.length})</span>
            <span className="text-[10px] text-[#8d8478]">Stored in device database</span>
          </div>

          {sessions.length === 0 ? (
            <div className="p-4 bg-[#121110] border border-[#322d28] text-center text-xs text-[#8d8478]">
              No saved sessions yet. Type a name above and save your current cues.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {sessions.map((sess) => {
                const totalDur = sess.cues.reduce((acc, c) => acc + (c.dur || 0), 0);
                const isEditing = editingSessionId === sess.id;

                return (
                  <div
                    key={sess.id}
                    className="p-2.5 bg-[#121110] border border-[#322d28] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editSessionName}
                            onChange={(e) => setEditSessionName(e.target.value)}
                            className="bg-[#1d1a17] border border-[#c58b4a] text-xs px-2 py-1 text-[#ece6da] outline-none w-full"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (editSessionName.trim()) {
                                onRenameSession(sess.id, editSessionName.trim());
                              }
                              setEditingSessionId(null);
                            }}
                            className="p-1 text-[#c58b4a]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-bold text-xs text-[#ece6da] truncate">
                            {sess.name}
                          </div>
                          <div className="text-[11px] font-mono text-[#8d8478]">
                            {sess.cues.length} cues · {formatTime(totalDur)} ·{' '}
                            {new Date(sess.savedAt).toLocaleDateString()}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-none">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSessionId(sess.id);
                          setEditSessionName(sess.name);
                        }}
                        className="p-1.5 text-[#8d8478] hover:text-[#ece6da]"
                        title="Rename"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateSession(sess)}
                        className="p-1.5 text-[#8d8478] hover:text-[#ece6da]"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onLoadSession(sess);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-[#c58b4a] hover:bg-[#d4a359] text-[#171208] text-xs font-bold uppercase tracking-wider"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSession(sess.id)}
                        className="p-1.5 text-[#b05a4e] hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Import & Sample Deck Reset Bar */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#322d28] flex-wrap">
          <label className="cursor-pointer px-3 py-2 border border-[#322d28] hover:bg-[#262220] text-xs font-bold uppercase tracking-wider text-[#ece6da] flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-[#c58b4a]" />
            <span>Import Deck</span>
            <input
              type="file"
              accept=".json,.sottocue,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          <div className="flex items-center gap-2">
            {onLoadPhilosophyDeck && (
              <button
                type="button"
                onClick={() => {
                  onLoadPhilosophyDeck();
                  onClose();
                }}
                className="px-3 py-2 border border-[#d49b55]/50 hover:border-[#d49b55] bg-[#d49b55]/10 hover:bg-[#d49b55]/20 text-xs font-bold uppercase tracking-wider text-[#e5b364] flex items-center gap-1.5 transition-colors"
                title="Load 20 Greatest Quotes & Monologues for in-ear oral recital (< 2 min reads)"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#d49b55]" />
                <span>Philosophy Deck (20 Cues)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onLoadSampleDeck();
                onClose();
              }}
              className="px-3 py-2 border border-[#322d28] hover:border-[#c58b4a] text-xs font-bold uppercase tracking-wider text-[#8d8478] hover:text-[#ece6da] flex items-center gap-1.5"
              title="Load default Pitch & Keynote prompts"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c58b4a]" />
              <span>Demo Deck</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
