import React, { useEffect, useRef, useState } from 'react';
import {
  Cue,
  DeckSession,
  HUES,
  cleanCueName,
} from './types';
import { AudioEngine, haptic } from './lib/audioEngine';
import {
  initDB,
  getAllSessions,
  saveSessionToDB,
  deleteSessionFromDB,
  base64ToBlob,
  exportDeckToFile,
} from './lib/storage';
import { createDefaultSampleDeck } from './lib/sampleDeck';

import { Header } from './components/Header';
import { PadGrid } from './components/PadGrid';
import { RundownList } from './components/RundownList';
import { NowPlayingBar } from './components/NowPlayingBar';
import { RunOverlay } from './components/RunOverlay';
import { VoiceRecordModal } from './components/VoiceRecordModal';
import { EditCueModal } from './components/EditCueModal';
import { SessionsModal } from './components/SessionsModal';
import { AudioOutputModal } from './components/AudioOutputModal';
import { ScriptModal } from './components/ScriptModal';
import { ScriptureGeminiModal } from './components/ScriptureGeminiModal';
import { ApkModal } from './components/ApkModal';
import { Toast, ToastMessage } from './components/Toast';
import { Search } from 'lucide-react';

export default function App() {
  const [audioEngine] = useState(() => new AudioEngine());

  // Deck state
  const [deckName, setDeckName] = useState('Pitch & Keynote Drills');
  const [cues, setCues] = useState<Cue[]>([]);
  const [currentCue, setCurrentCue] = useState<Cue | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [outputDeviceName, setOutputDeviceName] = useState('System Default');
  const [outputDeviceId, setOutputDeviceId] = useState<string | null>(null);

  // View & UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [voiceRecordOpen, setVoiceRecordOpen] = useState(false);
  const [scriptureModalOpen, setScriptureModalOpen] = useState(false);
  const [editingCue, setEditingCue] = useState<Cue | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [savedSessions, setSavedSessions] = useState<DeckSession[]>([]);
  const [outputPickerOpen, setOutputPickerOpen] = useState(false);
  const [inspectScriptCue, setInspectScriptCue] = useState<Cue | null>(null);
  const [apkModalOpen, setApkModalOpen] = useState(false);

  // Run Deck Mode state
  const [runDeckOpen, setRunDeckOpen] = useState(false);
  const [runDeckIndex, setRunDeckIndex] = useState(0);
  const [isGapCountdown, setIsGapCountdown] = useState(false);
  const [gapRemaining, setGapRemaining] = useState(3);
  const gapTimerRef = useRef<number | null>(null);

  // Hidden file input for general audio import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show Toast helper
  const addToast = (
    message: string,
    actionLabel?: string,
    onAction?: () => void,
    durationMs = 4500
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, actionLabel, onAction }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initialize DB and load initial sample deck
  useEffect(() => {
    const init = async () => {
      await initDB();
      const sessions = await getAllSessions();
      setSavedSessions(sessions);

      // Check if user has active deck saved or create default
      const defaultCues = await createDefaultSampleDeck();
      setCues(defaultCues);
    };
    init();
  }, []);

  // Audio Engine event listeners
  useEffect(() => {
    audioEngine.onTimeUpdate = (curr, dur, prog) => {
      setCurrentTime(curr);
      setDuration(dur);
      setCurrentProgress(prog);
    };

    audioEngine.onStateChange = (playing, pausedState, cue) => {
      setIsPlaying(playing);
      setIsPaused(pausedState);
      setCurrentCue(cue);
    };

    audioEngine.onEnded = () => {
      if (runDeckOpen) {
        handleAdvanceRun();
      } else {
        audioEngine.stop();
      }
    };
  }, [audioEngine, runDeckOpen]);

  // Wire MediaSession next/prev tracks
  useEffect(() => {
    const handleNext = () => {
      if (cues.length === 0) return;
      const idx = currentCue ? cues.findIndex((c) => c.id === currentCue.id) : -1;
      const nextIdx = idx >= 0 && idx + 1 < cues.length ? idx + 1 : 0;
      audioEngine.play(cues[nextIdx], deckName);
    };

    const handlePrev = () => {
      if (cues.length === 0) return;
      const idx = currentCue ? cues.findIndex((c) => c.id === currentCue.id) : -1;
      const prevIdx = idx > 0 ? idx - 1 : cues.length - 1;
      audioEngine.play(cues[prevIdx], deckName);
    };

    audioEngine.setMediaSessionNextPrev(handleNext, handlePrev);
  }, [audioEngine, cues, currentCue, deckName]);

  // Pad Tap Trigger
  const handleTapPad = (cue: Cue) => {
    haptic(15);
    if (currentCue?.id === cue.id) {
      if (isPlaying) {
        audioEngine.pause();
      } else {
        audioEngine.resume();
      }
    } else {
      audioEngine.play(cue, deckName);
    }
  };

  // Speed Change
  const handleChangeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    audioEngine.setPlaybackSpeed(speed);
  };

  // Reordering cues
  const handleMoveCue = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cues.length) return;

    haptic(10);
    const updated = [...cues];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setCues(updated);
  };

  // Delete Cue with 5-second Undo
  const handleDeleteCue = (cue: Cue) => {
    if (currentCue?.id === cue.id) {
      audioEngine.stop();
    }

    const index = cues.findIndex((c) => c.id === cue.id);
    if (index === -1) return;

    const remaining = cues.filter((c) => c.id !== cue.id);
    setCues(remaining);
    haptic([20, 40, 20]);

    addToast(`"${cue.name}" deleted`, 'Undo', () => {
      const restored = [...remaining];
      restored.splice(index, 0, cue);
      setCues(restored);
      addToast(`Restored "${cue.name}"`);
    });
  };

  // Audio Files Import (multiple supported)
  const handleImportFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newCues: Cue[] = [];
    const baseIndex = cues.length;

    Array.from(files).forEach((file, i) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      const hue = HUES[(baseIndex + i) % HUES.length];

      const cue: Cue = {
        id: `cue-${Date.now()}-${i}-${Math.random()}`,
        name: cleanCueName(file.name),
        hue,
        blob: file,
        url,
        dur: 0,
        created: Date.now(),
      };

      audio.addEventListener('loadedmetadata', () => {
        if (isFinite(audio.duration) && audio.duration > 0) {
          setCues((prev) =>
            prev.map((c) => (c.id === cue.id ? { ...c, dur: audio.duration } : c))
          );
        }
      });

      newCues.push(cue);
    });

    setCues((prev) => [...prev, ...newCues]);
    haptic(20);

    if (newCues.length === 1) {
      addToast(`Imported "${newCues[0].name}"`);
      setEditingCue(newCues[0]);
    } else {
      addToast(`Imported ${newCues.length} audio cues into deck.`);
    }
  };

  // Save Voice Cue
  const handleSaveVoiceCue = (data: {
    name: string;
    blob: Blob;
    dur: number;
    target?: number;
    script?: string;
  }) => {
    const url = URL.createObjectURL(data.blob);
    const hue = HUES[cues.length % HUES.length];

    const cue: Cue = {
      id: `cue-vrec-${Date.now()}`,
      name: data.name,
      hue,
      blob: data.blob,
      url,
      dur: data.dur,
      target: data.target,
      script: data.script,
      created: Date.now(),
    };

    setCues((prev) => [...prev, cue]);
    haptic([15, 30, 15]);
    addToast(`Saved voice cue "${cue.name}" to deck.`);
  };

  // Add individual scripture cue generated from Gemini
  const handleAddScriptureCue = (data: {
    name: string;
    blob: Blob;
    dur: number;
    target?: number;
    script?: string;
    hue?: string;
  }) => {
    const url = URL.createObjectURL(data.blob);
    const cue: Cue = {
      id: `cue-scripture-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: data.name,
      hue: data.hue || HUES[cues.length % HUES.length],
      blob: data.blob,
      url,
      dur: data.dur,
      target: data.target,
      script: data.script,
      created: Date.now(),
    };
    setCues((prev) => [...prev, cue]);
    haptic([20, 35, 20]);
    addToast(`Added in-ear cue "${cue.name}"`);
  };

  // Add multiple scripture cues at once
  const handleAddMultipleScriptureCues = (
    items: Array<{
      name: string;
      blob: Blob;
      dur: number;
      target?: number;
      script?: string;
      hue?: string;
    }>
  ) => {
    const newCues: Cue[] = items.map((data, idx) => ({
      id: `cue-scripture-${Date.now()}-${idx}`,
      name: data.name,
      hue: data.hue || HUES[(cues.length + idx) % HUES.length],
      blob: data.blob,
      url: URL.createObjectURL(data.blob),
      dur: data.dur,
      target: data.target,
      script: data.script,
      created: Date.now() + idx,
    }));
    setCues((prev) => [...prev, ...newCues]);
    haptic([25, 45, 25]);
    addToast(`Added ${newCues.length} in-ear scripture cues to soundboard!`);
  };

  // Update existing cue
  const handleSaveEditedCue = (updatedCue: Cue) => {
    setCues((prev) => prev.map((c) => (c.id === updatedCue.id ? updatedCue : c)));
    if (currentCue?.id === updatedCue.id) {
      setCurrentCue(updatedCue);
    }
    addToast(`Updated "${updatedCue.name}"`);
  };

  // Replace cue audio
  const handleReplaceAudio = (cue: Cue, file: File) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);

    audio.addEventListener('loadedmetadata', () => {
      const dur = audio.duration || cue.dur;
      const updated: Cue = {
        ...cue,
        blob: file,
        url,
        dur,
        trimStart: undefined,
        trimEnd: undefined,
      };
      setCues((prev) => prev.map((c) => (c.id === cue.id ? updated : c)));
      setEditingCue(updated);
      addToast(`Replaced audio for "${cue.name}"`);
    });
  };

  // Run Deck Rehearsal Mode
  const handleStartRunDeck = () => {
    if (cues.length === 0) return;
    setIsEditing(false);
    setRunDeckIndex(0);
    setIsGapCountdown(false);
    setRunDeckOpen(true);
    audioEngine.play(cues[0], deckName);
  };

  const handleAdvanceRun = () => {
    audioEngine.stop();
    if (runDeckIndex + 1 >= cues.length) {
      setRunDeckOpen(false);
      addToast('Rehearsal completed start to finish!');
      return;
    }

    const nextIndex = runDeckIndex + 1;
    setRunDeckIndex(nextIndex);
    setIsGapCountdown(true);
    setGapRemaining(3);
    haptic(20);

    if (gapTimerRef.current) clearInterval(gapTimerRef.current);
    let remainingSec = 3;

    gapTimerRef.current = window.setInterval(() => {
      remainingSec--;
      setGapRemaining(remainingSec);
      haptic(15);
      if (remainingSec <= 0) {
        if (gapTimerRef.current) clearInterval(gapTimerRef.current);
        setIsGapCountdown(false);
        audioEngine.play(cues[nextIndex], deckName);
      }
    }, 1000);
  };

  const handleSkipNextInRun = () => {
    if (gapTimerRef.current) clearInterval(gapTimerRef.current);
    if (isGapCountdown) {
      setIsGapCountdown(false);
      audioEngine.play(cues[runDeckIndex], deckName);
      return;
    }
    if (runDeckIndex + 1 >= cues.length) {
      setRunDeckOpen(false);
      audioEngine.stop();
      addToast('Rehearsal completed!');
      return;
    }
    const nextIdx = runDeckIndex + 1;
    setRunDeckIndex(nextIdx);
    audioEngine.play(cues[nextIdx], deckName);
  };

  const handleEndRun = () => {
    if (gapTimerRef.current) clearInterval(gapTimerRef.current);
    audioEngine.stop();
    setRunDeckOpen(false);
    setIsGapCountdown(false);
  };

  // Sessions Management
  const handleSaveSession = async (name: string) => {
    const session: DeckSession = {
      id: Date.now(),
      name,
      savedAt: Date.now(),
      cues: cues.map((c) => ({
        id: c.id,
        name: c.name,
        hue: c.hue,
        dur: c.dur,
        trimStart: c.trimStart,
        trimEnd: c.trimEnd,
        target: c.target,
        script: c.script,
        blob: c.blob || new Blob(),
      })),
    };

    await saveSessionToDB(session);
    setDeckName(name);
    const all = await getAllSessions();
    setSavedSessions(all);
    addToast(`Saved session "${name}" to this device.`);
  };

  const handleLoadSession = (session: DeckSession) => {
    audioEngine.stop();
    const restoredCues: Cue[] = session.cues.map((sc) => {
      const url = sc.blob && sc.blob.size > 0 ? URL.createObjectURL(sc.blob) : '';
      return {
        id: sc.id,
        name: sc.name,
        hue: sc.hue,
        dur: sc.dur,
        trimStart: sc.trimStart,
        trimEnd: sc.trimEnd,
        target: sc.target,
        script: sc.script,
        blob: sc.blob,
        url,
        created: Date.now(),
      };
    });

    setCues(restoredCues);
    setDeckName(session.name);
    addToast(`Loaded session "${session.name}"`);
  };

  const handleDeleteSession = async (id: number) => {
    await deleteSessionFromDB(id);
    const all = await getAllSessions();
    setSavedSessions(all);
    addToast('Session deleted.');
  };

  const handleDuplicateSession = async (session: DeckSession) => {
    const copy: DeckSession = {
      ...session,
      id: Date.now(),
      name: `${session.name} (Copy)`,
      savedAt: Date.now(),
    };
    await saveSessionToDB(copy);
    const all = await getAllSessions();
    setSavedSessions(all);
    addToast(`Duplicated "${copy.name}"`);
  };

  const handleRenameSession = async (id: number, newName: string) => {
    const target = savedSessions.find((s) => s.id === id);
    if (!target) return;
    const updated = { ...target, name: newName };
    await saveSessionToDB(updated);
    const all = await getAllSessions();
    setSavedSessions(all);
    addToast(`Renamed to "${newName}"`);
  };

  // Export & Import .sottocue JSON
  const handleExportDeck = async () => {
    if (cues.length === 0) return;
    const blob = await exportDeckToFile(deckName, cues);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckName.replace(/[^\w\- ]+/g, '').trim() || 'deck'}.sottocue.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    addToast(`Deck exported as ${a.download}`);
  };

  const handleImportDeckFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.cues)) {
          throw new Error('Invalid format');
        }

        const restoredCues: Cue[] = data.cues.map((sc: any) => {
          const blob = sc.b64 ? base64ToBlob(sc.b64, sc.type) : undefined;
          const url = blob ? URL.createObjectURL(blob) : '';
          return {
            id: sc.id || `cue-${Date.now()}-${Math.random()}`,
            name: sc.name || 'Imported cue',
            hue: sc.hue || HUES[0],
            dur: sc.dur || 0,
            trimStart: sc.trimStart,
            trimEnd: sc.trimEnd,
            target: sc.target,
            script: sc.script,
            blob,
            url,
            created: Date.now(),
          };
        });

        audioEngine.stop();
        setCues(restoredCues);
        setDeckName(data.name || 'Imported Deck');
        setSessionsOpen(false);
        addToast(`Successfully imported deck "${data.name || 'Deck'}" with ${restoredCues.length} cues.`);
      } catch (err) {
        addToast('File is not a valid Sotto Cue deck package.');
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleDeck = async () => {
    audioEngine.stop();
    const defaultCues = await createDefaultSampleDeck();
    setCues(defaultCues);
    setDeckName('Pitch & Keynote Drills');
    addToast('Loaded default Keynote rehearsal deck.');
  };

  // Drag and drop audio files directly into window
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImportFiles(e.dataTransfer.files);
    }
  };

  // Filter cues for search
  const filteredCues = cues.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.script && c.script.toLowerCase().includes(q));
  });

  const totalDuration = cues.reduce((sum, c) => sum + (c.dur || 0), 0);

  // Synthesize phone in-ear chime test
  const handleTestAudioChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Note 2: E5 (659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.16);
      gain2.gain.setValueAtTime(0.18, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.42);

      addToast('Ear chime sound test played');
    } catch (e) {
      console.warn('Audio chime test error', e);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="min-h-screen bg-[#121110] text-[#ece6da] flex flex-col selection:bg-[#c58b4a] selection:text-[#121110]"
    >
      {/* Top Header */}
      <Header
        deckName={deckName}
        cueCount={cues.length}
        totalDuration={totalDuration}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onOpenSessions={() => setSessionsOpen(true)}
        onOpenVoiceRecord={() => setVoiceRecordOpen(true)}
        onOpenScripturePrompter={() => setScriptureModalOpen(true)}
        onOpenImport={() => fileInputRef.current?.click()}
        onRunDeck={handleStartRunDeck}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        outputDeviceName={outputDeviceName}
        onOpenOutputPicker={() => setOutputPickerOpen(true)}
        onOpenApkModal={() => setApkModalOpen(true)}
      />

      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.webm"
        multiple
        onChange={(e) => {
          handleImportFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Search Input Filter (visible when cues > 6 or searching) */}
      {(cues.length > 6 || searchQuery) && (
        <div className="px-4 py-2 bg-[#121110] max-w-4xl mx-auto w-full">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8d8478] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cue labels or script prompts..."
              className="w-full bg-[#1d1a17] border border-[#322d28] focus:border-[#c58b4a] pl-9 pr-3 py-1.5 text-xs text-[#ece6da] outline-none"
            />
          </div>
        </div>
      )}

      {/* Main Soundboard Content View */}
      <main className="flex-1 w-full max-w-6xl mx-auto">
        {viewMode === 'grid' ? (
          <PadGrid
            cues={filteredCues}
            currentCue={currentCue}
            isPlaying={isPlaying}
            isPaused={isPaused}
            currentProgress={currentProgress}
            currentTime={currentTime}
            isEditing={isEditing}
            onTapPad={handleTapPad}
            onEditCue={(cue) => setEditingCue(cue)}
            onDeleteCue={handleDeleteCue}
            onMoveCue={handleMoveCue}
            onOpenEmptyImport={() => fileInputRef.current?.click()}
          />
        ) : (
          <RundownList
            cues={filteredCues}
            currentCue={currentCue}
            isPlaying={isPlaying}
            isPaused={isPaused}
            currentProgress={currentProgress}
            currentTime={currentTime}
            isEditing={isEditing}
            onTapPad={handleTapPad}
            onEditCue={(cue) => setEditingCue(cue)}
            onDeleteCue={handleDeleteCue}
            onMoveCue={handleMoveCue}
            onOpenScriptModal={(cue) => setInspectScriptCue(cue)}
          />
        )}
      </main>

      {/* Now Playing Bottom Bar */}
      <NowPlayingBar
        currentCue={currentCue}
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentTime={currentTime}
        duration={duration}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={handleChangeSpeed}
        onTogglePlay={() => {
          if (isPlaying) {
            audioEngine.pause();
          } else {
            audioEngine.resume();
          }
        }}
        onRestart={() => audioEngine.restart()}
        onStop={() => audioEngine.stop()}
        onSeek={(fraction) => audioEngine.seek(fraction)}
        onOpenScript={() => setInspectScriptCue(currentCue)}
      />

      {/* Full-Screen Run Rehearsal Overlay */}
      <RunOverlay
        isOpen={runDeckOpen}
        deckName={deckName}
        cues={cues}
        currentIndex={runDeckIndex}
        currentCue={cues[runDeckIndex] || null}
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentTime={currentTime}
        duration={duration}
        isGapCountdown={isGapCountdown}
        gapRemaining={gapRemaining}
        onTogglePlay={() => {
          if (isPlaying) {
            audioEngine.pause();
          } else {
            audioEngine.resume();
          }
        }}
        onRestart={() => audioEngine.restart()}
        onSkipNext={handleSkipNextInRun}
        onEndRun={handleEndRun}
      />

      {/* Modals */}
      <VoiceRecordModal
        isOpen={voiceRecordOpen}
        onClose={() => setVoiceRecordOpen(false)}
        onSaveCue={handleSaveVoiceCue}
        onOpenScripturePrompter={() => setScriptureModalOpen(true)}
      />

      <ScriptureGeminiModal
        isOpen={scriptureModalOpen}
        onClose={() => setScriptureModalOpen(false)}
        onAddCueToDeck={handleAddScriptureCue}
        onAddMultipleCues={handleAddMultipleScriptureCues}
        onShowToast={(msg) => addToast(msg)}
      />

      <EditCueModal
        cue={editingCue}
        isOpen={!!editingCue}
        onClose={() => setEditingCue(null)}
        onSaveCue={handleSaveEditedCue}
        onDeleteCue={handleDeleteCue}
        onReplaceAudio={handleReplaceAudio}
      />

      <SessionsModal
        isOpen={sessionsOpen}
        onClose={() => setSessionsOpen(false)}
        deckName={deckName}
        sessions={savedSessions}
        cueCount={cues.length}
        totalDuration={totalDuration}
        onSaveSession={handleSaveSession}
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
        onDuplicateSession={handleDuplicateSession}
        onRenameSession={handleRenameSession}
        onExportDeck={handleExportDeck}
        onImportDeckFile={handleImportDeckFile}
        onLoadSampleDeck={handleLoadSampleDeck}
      />

      <AudioOutputModal
        isOpen={outputPickerOpen}
        onClose={() => setOutputPickerOpen(false)}
        currentDeviceId={outputDeviceId}
        onSelectDevice={async (devId, label) => {
          setOutputDeviceId(devId);
          setOutputDeviceName(label);
          await audioEngine.setOutputDevice(devId);
        }}
      />

      <ScriptModal
        cue={inspectScriptCue}
        isOpen={!!inspectScriptCue}
        onClose={() => setInspectScriptCue(null)}
      />

      <ApkModal
        isOpen={apkModalOpen}
        onClose={() => setApkModalOpen(false)}
        onTestAudioChime={handleTestAudioChime}
      />

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
