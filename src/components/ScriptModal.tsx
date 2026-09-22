import React from 'react';
import { X, Copy, Check, FileText } from 'lucide-react';
import { Cue, shapeForHue } from '../types';

interface ScriptModalProps {
  cue: Cue | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ScriptModal: React.FC<ScriptModalProps> = ({
  cue,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !cue) return null;

  const handleCopy = () => {
    if (cue.script) {
      navigator.clipboard.writeText(cue.script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1d1a17] border border-[#322d28] p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#322d28] pb-3 flex-none">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-4 h-4 text-[10px] font-black text-[#121110] flex items-center justify-center font-mono leading-none flex-none"
              style={{ backgroundColor: cue.hue }}
            >
              {shapeForHue(cue.hue)}
            </span>
            <h2 className="text-base font-bold text-[#ece6da] uppercase tracking-wider truncate">
              {cue.name}
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

        {/* Script Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#121110] border border-[#322d28] font-sans text-base sm:text-lg leading-relaxed text-[#ece6da] whitespace-pre-wrap">
          {cue.script || (
            <span className="text-[#8d8478] italic">No script entered for this cue.</span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#322d28] flex-none">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!cue.script}
            className="px-3 py-2 border border-[#322d28] hover:bg-[#262220] text-xs font-bold uppercase tracking-wider text-[#ece6da] flex items-center gap-1.5 transition-colors disabled:opacity-30"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#c58b4a]" />
                <span>Copy Text</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#c58b4a] hover:bg-[#d4a359] text-[#171208] text-xs font-black tracking-widest uppercase"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
