import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  Sparkles,
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Layers,
  Type,
  BookOpen,
  Info,
} from 'lucide-react';
import { Cue, shapeForHue, formatTime } from '../types';
import { AudioRecorder, RecordResult } from '../lib/audioRecorder';

interface ScriptModalProps {
  cue: Cue | null;
  isOpen: boolean;
  onClose: () => void;
  onLoadPhilosophyDeck?: () => void;
  onSaveCueAudio?: (
    cueId: string,
    audioData: {
      blob: Blob;
      url: string;
      dur: number;
      saveTarget: 'overwrite' | 'take1' | 'take2';
      activeTakeIndex?: number;
      primaryLabel?: string;
      altLabel?: string;
    }
  ) => void;
  onToggleTake?: (cueId: string, takeIndex: number) => void;
}

export const ScriptModal: React.FC<ScriptModalProps> = ({
  cue,
  isOpen,
  onClose,
  onLoadPhilosophyDeck,
  onSaveCueAudio,
  onToggleTake,
}) => {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<'base' | 'lg' | 'xl'>('lg');

  // Recorder state
  const [recorder] = useState(() => new AudioRecorder());
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [tempRecord, setTempRecord] = useState<RecordResult | null>(null);
  const [recordError, setRecordError] = useState('');

  // In-modal audio preview player (for listening to Take 1, Take 2, or Temp Recording)
  const [previewPlaying, setPreviewPlaying] = useState<'take1' | 'take2' | 'temp' | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Clean up audio on close or unmount
  useEffect(() => {
    if (!isOpen) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewPlaying(null);
      if (isRecording) {
        recorder.stop();
        setIsRecording(false);
      }
      setTempRecord(null);
      setRecordSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
  }, [isOpen, isRecording, recorder]);

  if (!isOpen || !cue) return null;

  const isTemplateCue =
    cue.isTemplate ||
    cue.tags?.some((t) => t.toLowerCase() === 'philosophy') ||
    cue.name.toLowerCase().includes('philosophy');

  const isPhilosophyMaster =
    cue.name.toLowerCase().includes('philosophy') &&
    cue.name.toLowerCase().includes('20 greatest');

  const activeTake = cue.activeTakeIndex ?? 0;
  const hasAltTake = !!(cue.altBlob || cue.altUrl);

  const handleCopy = () => {
    if (cue.script) {
      navigator.clipboard.writeText(cue.script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Live waveform visualizer during recording
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = recorder.getAnalyser();
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      ctx.fillStyle = '#c58b4a';
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
      x += barWidth + 1;
    }

    animFrameRef.current = requestAnimationFrame(drawWaveform);
  };

  // Start in-prompter voice recording
  const handleStartRecording = async () => {
    setRecordError('');
    stopPreviewAudio();
    setTempRecord(null);

    const started = await recorder.start();
    if (!started) {
      setRecordError('Microphone access was denied or unavailable. Please check browser permissions.');
      return;
    }

    setIsRecording(true);
    setRecordSeconds(0);

    timerRef.current = window.setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);

    drawWaveform();
  };

  // Stop recording
  const handleStopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const result = await recorder.stop();
    setIsRecording(false);

    if (result && result.blob.size > 0) {
      setTempRecord(result);
    } else {
      setRecordError('No audio captured. Please try speaking into your microphone.');
    }
  };

  // Discard temporary recording
  const handleDiscardTemp = () => {
    stopPreviewAudio();
    setTempRecord(null);
    setRecordSeconds(0);
  };

  // Save temporary recording into cue
  const handleSaveTake = (target: 'overwrite' | 'take1' | 'take2') => {
    if (!tempRecord || !onSaveCueAudio) return;

    stopPreviewAudio();

    onSaveCueAudio(cue.id, {
      blob: tempRecord.blob,
      url: tempRecord.url,
      dur: tempRecord.duration,
      saveTarget: target,
      activeTakeIndex: target === 'take2' ? 1 : 0,
      primaryLabel: target === 'take2' ? cue.primaryLabel || 'Take 1' : 'My Voice Recital',
      altLabel: target === 'take2' ? 'My Voice Recital' : cue.altLabel || 'Take 2',
    });

    setTempRecord(null);
    setRecordSeconds(0);
  };

  // Playback preview helper
  const playAudioUrl = (url: string, type: 'take1' | 'take2' | 'temp') => {
    stopPreviewAudio();
    if (!url) return;

    const audio = new Audio(url);
    previewAudioRef.current = audio;
    setPreviewPlaying(type);

    audio.onended = () => {
      setPreviewPlaying(null);
      previewAudioRef.current = null;
    };
    audio.onerror = () => {
      setPreviewPlaying(null);
      previewAudioRef.current = null;
    };

    audio.play().catch(() => {
      setPreviewPlaying(null);
    });
  };

  const stopPreviewAudio = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewPlaying(null);
  };

  const togglePreview = (type: 'take1' | 'take2' | 'temp') => {
    if (previewPlaying === type) {
      stopPreviewAudio();
      return;
    }

    if (type === 'take1') {
      playAudioUrl(cue.url, 'take1');
    } else if (type === 'take2' && cue.altUrl) {
      playAudioUrl(cue.altUrl, 'take2');
    } else if (type === 'temp' && tempRecord) {
      playAudioUrl(tempRecord.url, 'temp');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-[#1d1a17] border border-[#322d28] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#322d28] bg-[#171412] flex items-center justify-between gap-3 flex-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-5 h-5 text-[11px] font-black text-[#121110] flex items-center justify-center font-mono leading-none flex-none"
              style={{ backgroundColor: cue.hue }}
            >
              {shapeForHue(cue.hue)}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#ece6da] uppercase tracking-wider truncate">
                  {cue.name}
                </h2>
                {isTemplateCue && (
                  <span className="px-1.5 py-0.5 border border-[#d49b55]/60 bg-[#d49b55]/15 text-[#e5b364] text-[10px] font-mono font-bold uppercase tracking-widest flex-none">
                    TEMPLATE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8d8478] font-mono">
                Active in-ear take: {activeTake === 1 ? 'Take 2 (Voice Recital)' : (cue.primaryLabel || 'Take 1')} · {formatTime(activeTake === 1 && cue.altDur ? cue.altDur : cue.dur)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-none">
            {/* Font size toggle */}
            <div className="hidden sm:flex items-center border border-[#322d28] bg-[#121110] p-0.5">
              <button
                type="button"
                onClick={() => setFontSize('base')}
                className={`px-2 py-0.5 text-xs font-mono font-bold ${
                  fontSize === 'base' ? 'bg-[#c58b4a] text-[#171208]' : 'text-[#8d8478] hover:text-[#ece6da]'
                }`}
                title="Standard text"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize('lg')}
                className={`px-2 py-0.5 text-xs font-mono font-bold ${
                  fontSize === 'lg' ? 'bg-[#c58b4a] text-[#171208]' : 'text-[#8d8478] hover:text-[#ece6da]'
                }`}
                title="Large text"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setFontSize('xl')}
                className={`px-2 py-0.5 text-xs font-mono font-bold ${
                  fontSize === 'xl' ? 'bg-[#c58b4a] text-[#171208]' : 'text-[#8d8478] hover:text-[#ece6da]'
                }`}
                title="Extra large text"
              >
                A++
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#8d8478] hover:text-[#ece6da] hover:bg-[#262220] transition-colors"
              aria-label="Close script viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Template Indication Banner */}
        {isTemplateCue && (
          <div className="px-4 py-2 bg-[#d49b55]/10 border-b border-[#d49b55]/30 flex items-center justify-between gap-2 text-xs text-[#e5b364] flex-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <Info className="w-3.5 h-3.5 text-[#d49b55] flex-none" />
              <span className="truncate">
                <strong>Template Deck Section:</strong> Read the script aloud below & record your voice to replace the tone or keep as Take 2.
              </span>
            </div>
            {isPhilosophyMaster && onLoadPhilosophyDeck && (
              <button
                type="button"
                onClick={() => {
                  onLoadPhilosophyDeck();
                  onClose();
                }}
                className="px-2 py-1 bg-[#d49b55] hover:bg-[#e5b364] text-[#171208] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Load 20-Piece Deck</span>
              </button>
            )}
          </div>
        )}

        {/* Audio Takes Bar (Max 2 Takes: Take 1 & Take 2) */}
        <div className="px-4 py-2.5 bg-[#141210] border-b border-[#322d28] flex items-center justify-between gap-3 flex-wrap flex-none">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#c58b4a]" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8d8478]">
              In-Ear Audio Takes (Max 2):
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Take 1 Slot */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 border text-xs font-mono transition-colors ${
                activeTake === 0
                  ? 'border-[#c58b4a] bg-[#c58b4a]/15 text-[#ece6da]'
                  : 'border-[#322d28] bg-[#1d1a17] text-[#8d8478]'
              }`}
            >
              <button
                type="button"
                onClick={() => onToggleTake?.(cue.id, 0)}
                className="font-bold flex items-center gap-1 text-left"
                title="Set Take 1 as active in-ear playback"
              >
                <span className={`w-2 h-2 rounded-full ${activeTake === 0 ? 'bg-[#c58b4a]' : 'bg-[#4a4138]'}`} />
                <span>{cue.primaryLabel || (cue.isTemplate ? 'Template Tone' : 'Take 1')}</span>
                <span className="text-[10px] text-[#8d8478]">({formatTime(cue.dur)})</span>
              </button>
              <button
                type="button"
                onClick={() => togglePreview('take1')}
                className="p-1 text-[#c58b4a] hover:text-[#e5b364]"
                title="Preview Take 1 in ears"
              >
                {previewPlaying === 'take1' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
              </button>
            </div>

            {/* Take 2 Slot (Alternative Voice Take) */}
            {hasAltTake ? (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 border text-xs font-mono transition-colors ${
                  activeTake === 1
                    ? 'border-[#c58b4a] bg-[#c58b4a]/15 text-[#ece6da]'
                    : 'border-[#322d28] bg-[#1d1a17] text-[#8d8478]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleTake?.(cue.id, 1)}
                  className="font-bold flex items-center gap-1 text-left"
                  title="Set Take 2 as active in-ear playback"
                >
                  <span className={`w-2 h-2 rounded-full ${activeTake === 1 ? 'bg-[#c58b4a]' : 'bg-[#4a4138]'}`} />
                  <span>{cue.altLabel || 'Take 2 (My Voice)'}</span>
                  <span className="text-[10px] text-[#8d8478]">({formatTime(cue.altDur || 0)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => togglePreview('take2')}
                  className="p-1 text-[#c58b4a] hover:text-[#e5b364]"
                  title="Preview Take 2 in ears"
                >
                  {previewPlaying === 'take2' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-mono text-[#5a5247] px-2 py-1 border border-dashed border-[#322d28]">
                Take 2: Empty (Record below)
              </span>
            )}
          </div>
        </div>

        {/* Teleprompter Script Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#121110] relative">
          <div
            className={`font-sans leading-relaxed text-[#ece6da] whitespace-pre-wrap select-text transition-all ${
              fontSize === 'base' ? 'text-sm sm:text-base' : fontSize === 'lg' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
            }`}
          >
            {cue.script ? (
              cue.script
            ) : (
              <span className="text-[#8d8478] italic">
                No teleprompter script attached to this cue.
              </span>
            )}
          </div>
        </div>

        {/* X VOX In-Modal Voice Recording Studio */}
        <div className="p-4 bg-[#191614] border-t border-[#322d28] flex-none space-y-3">
          {recordError && (
            <div className="p-2 bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center justify-between">
              <span>{recordError}</span>
              <button type="button" onClick={() => setRecordError('')} className="p-1 text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Recording in progress state */}
          {isRecording ? (
            <div className="p-3 bg-[#241c19] border border-[#b05a4e] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping flex-none" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-400 font-mono">
                      Recording Oral Recital
                    </span>
                    <span className="text-sm font-mono font-bold text-[#ece6da]">
                      {formatTime(recordSeconds)}
                    </span>
                    {cue.target ? (
                      <span className="text-[11px] font-mono text-[#8d8478]">
                        / Target {formatTime(cue.target)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-[#8d8478]">
                    Read the script text above comfortably into your microphone...
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-none">
                <canvas ref={canvasRef} width={80} height={26} className="hidden sm:block opacity-80" />
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Done / Stop</span>
                </button>
              </div>
            </div>
          ) : tempRecord ? (
            /* Freshly recorded take review state */
            <div className="p-3 bg-[#1e1a17] border border-[#c58b4a] space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ece6da]">
                    Recital Captured ({formatTime(tempRecord.duration)})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => togglePreview('temp')}
                    className="px-2.5 py-1 bg-[#2a2420] hover:bg-[#352e2a] border border-[#322d28] text-[#c58b4a] text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {previewPlaying === 'temp' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{previewPlaying === 'temp' ? 'Pause' : 'Listen Back'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardTemp}
                    className="px-2.5 py-1 text-xs font-mono text-[#8d8478] hover:text-[#ece6da] flex items-center gap-1 transition-colors"
                    title="Discard and re-record"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Re-record</span>
                  </button>
                </div>
              </div>

              {/* Save choices: Overwrite Active vs Alternative Take */}
              <div className="pt-2 border-t border-[#322d28] flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-[#8d8478] font-mono">
                  Choose how to save into this cue:
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSaveTake('overwrite')}
                    className="px-3 py-1.5 bg-[#c58b4a] hover:bg-[#d4a359] text-[#171208] text-xs font-black uppercase tracking-wider transition-colors"
                    title="Overwrite the active take with this voice recording"
                  >
                    Overwrite Active Take
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveTake('take2')}
                    className="px-3 py-1.5 border border-[#c58b4a] hover:bg-[#c58b4a]/20 text-[#e5b364] text-xs font-bold uppercase tracking-wider transition-colors"
                    title="Keep original as Take 1 and store this as Take 2"
                  >
                    Save as Take 2 (Alternative)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standby state: Ready to record */
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-[#8d8478]">
                <Mic className="w-4 h-4 text-[#c58b4a]" />
                <span>
                  Ready to recite? Speak the script directly into your ear prompter deck.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="px-4 py-2 bg-[#b05a4e] hover:bg-[#c26457] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-lg"
                  title="Start recording your voice reading this script"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Record Voice (X VOX)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#171412] border-t border-[#322d28] flex items-center justify-between gap-2 flex-none">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!cue.script}
            className="px-3 py-1.5 border border-[#322d28] hover:bg-[#262220] text-xs font-bold uppercase tracking-wider text-[#ece6da] flex items-center gap-1.5 transition-colors disabled:opacity-30"
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
            className="px-5 py-1.5 bg-[#2a2420] hover:bg-[#352e2a] border border-[#322d28] text-[#ece6da] hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
