import React, { useState } from 'react';
import {
  X,
  Trash2,
  Upload,
  Play,
  Scissors,
  Check,
} from 'lucide-react';
import { Cue, HUES, shapeForHue, formatTime, parseTargetTime } from '../types';

interface EditCueModalProps {
  cue: Cue | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveCue: (updatedCue: Cue) => void;
  onDeleteCue: (cue: Cue) => void;
  onReplaceAudio: (cue: Cue, file: File) => void;
}

export const EditCueModal: React.FC<EditCueModalProps> = ({
  cue,
  isOpen,
  onClose,
  onSaveCue,
  onDeleteCue,
  onReplaceAudio,
}) => {
  if (!isOpen || !cue) return null;

  const [name, setName] = useState(cue.name);
  const [hue, setHue] = useState(cue.hue);
  const [targetStr, setTargetStr] = useState(cue.target ? formatTime(cue.target) : '');
  const [script, setScript] = useState(cue.script || '');
  const [trimStart, setTrimStart] = useState(cue.trimStart || 0);
  const [trimEnd, setTrimEnd] = useState(cue.trimEnd || cue.dur);

  const handleSave = () => {
    const updated: Cue = {
      ...cue,
      name: name.trim() || 'Untitled Cue',
      hue,
      target: parseTargetTime(targetStr),
      script: script.trim() || undefined,
      trimStart: trimStart > 0 ? trimStart : undefined,
      trimEnd: trimEnd < cue.dur ? trimEnd : undefined,
    };
    onSaveCue(updated);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onReplaceAudio(cue, file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1d1a17] border border-[#322d28] p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#322d28] pb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-4 text-[10px] font-black text-[#121110] flex items-center justify-center font-mono leading-none"
              style={{ backgroundColor: hue }}
            >
              {shapeForHue(hue)}
            </span>
            <h2 className="text-base font-bold text-[#ece6da] uppercase tracking-wider">
              Edit Cue Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8d8478] hover:text-[#ece6da]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Label Field */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-[#8d8478] mb-1">
            Cue Label
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full bg-[#121110] border border-[#322d28] focus:border-[#c58b4a] px-3 py-2 text-sm text-[#ece6da] outline-none"
          />
        </div>

        {/* Color & Geometric Marker Picker */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-[#8d8478] mb-1.5">
            Marker & Peripheral Shape
          </label>
          <div className="flex gap-2 flex-wrap">
            {HUES.map((h) => {
              const isSelected = h === hue;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHue(h)}
                  className={`w-9 h-9 flex items-center justify-center text-xs font-mono font-bold transition-transform ${
                    isSelected ? 'ring-2 ring-white scale-105' : 'opacity-85 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: h, color: '#121110' }}
                  title={`Marker ${shapeForHue(h)}`}
                >
                  {shapeForHue(h)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Time */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-[#8d8478] mb-1">
            Target Rehearsal Time (m:ss)
          </label>
          <input
            type="text"
            value={targetStr}
            onChange={(e) => setTargetStr(e.target.value)}
            placeholder="e.g. 0:30 (optional)"
            className="w-full bg-[#121110] border border-[#322d28] focus:border-[#c58b4a] px-3 py-2 text-sm text-[#ece6da] outline-none font-mono"
          />
          <p className="text-[11px] text-[#8d8478] mt-1 font-mono">
            During Run Deck mode, telemetry displays if your speech is trending ahead or behind this target.
          </p>
        </div>

        {/* In/Out Trimming */}
        <div className="p-3 bg-[#121110] border border-[#322d28] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#8d8478]">
            <span className="flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-[#c58b4a]" />
              <span>Cue Trimming (Crop dead air)</span>
            </span>
            <span className="text-[#c58b4a]">
              Effective: {formatTime(Math.max(0.1, trimEnd - trimStart))}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="block text-[11px] text-[#8d8478] mb-0.5">
                Trim Start: {trimStart.toFixed(1)}s
              </span>
              <input
                type="range"
                min="0"
                max={Math.max(0, cue.dur - 0.5)}
                step="0.1"
                value={trimStart}
                onChange={(e) => setTrimStart(Number(e.target.value))}
                className="w-full accent-[#c58b4a]"
              />
            </div>
            <div>
              <span className="block text-[11px] text-[#8d8478] mb-0.5">
                Trim End: {trimEnd.toFixed(1)}s
              </span>
              <input
                type="range"
                min={trimStart + 0.5}
                max={cue.dur}
                step="0.1"
                value={trimEnd}
                onChange={(e) => setTrimEnd(Number(e.target.value))}
                className="w-full accent-[#c58b4a]"
              />
            </div>
          </div>
        </div>

        {/* Script / Prompter Text */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-[#8d8478] mb-1">
            Teleprompter Script / Notes
          </label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={4}
            placeholder="Enter the exact wording or speaker bullet points..."
            className="w-full bg-[#121110] border border-[#322d28] focus:border-[#c58b4a] px-3 py-2 text-sm text-[#ece6da] outline-none"
          />
        </div>

        {/* Audio replacement & delete options */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#322d28]">
          <label className="cursor-pointer px-3 py-2 border border-[#322d28] hover:bg-[#262220] text-xs font-bold uppercase tracking-wider text-[#ece6da] flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-[#c58b4a]" />
            <span>Replace Audio</span>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              onDeleteCue(cue);
              onClose();
            }}
            className="px-3 py-2 border border-red-900/60 hover:bg-red-950/40 text-xs font-bold uppercase tracking-wider text-[#b05a4e] flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Cue</span>
          </button>
        </div>

        {/* Save & Done */}
        <div className="flex gap-2 pt-2 border-t border-[#322d28]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-[#322d28] hover:bg-[#262220] text-[#ece6da] text-xs font-bold uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-[#c58b4a] hover:bg-[#d4a359] text-[#171208] text-xs font-black tracking-widest uppercase flex items-center justify-center gap-1.5 shadow"
          >
            <Check className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
