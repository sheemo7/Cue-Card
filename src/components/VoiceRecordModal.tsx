import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  X,
  Check,
  Loader2,
  FileText,
  Radio,
  Trash2,
  Tag,
  Plus,
} from 'lucide-react';
import { AudioRecorder, RecordResult } from '../lib/audioRecorder';
import { generateBeepBlob } from '../lib/sampleDeck';
import { transcribeAudioWithGemini } from '../lib/geminiService';
import { HUES, formatTime, shapeForHue, PRESET_TAGS } from '../types';

interface VoiceRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCue: (cueData: {
    name: string;
    blob: Blob;
    dur: number;
    target?: number;
    script?: string;
    tags?: string[];
  }) => void;
  onOpenScripturePrompter?: () => void;
}

export const VoiceRecordModal: React.FC<VoiceRecordModalProps> = ({
  isOpen,
  onClose,
  onSaveCue,
  onOpenScripturePrompter,
}) => {
  const [recorder] = useState(() => new AudioRecorder());
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordResult, setRecordResult] = useState<RecordResult | null>(null);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [testAudio, setTestAudio] = useState<HTMLAudioElement | null>(null);

  const [label, setLabel] = useState('');
  const [script, setScript] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'mic' | 'tts'>('mic');
  const [ttsText, setTtsText] = useState('');

  // Voice-to-Script Dictation & AI Transcription States
  const [isDictating, setIsDictating] = useState(false);
  const [dictationTarget, setDictationTarget] = useState<'script' | 'tts'>('script');
  const [isAiTranscribing, setIsAiTranscribing] = useState(false);
  const [dictationSupported, setDictationSupported] = useState(true);
  const [autoTranscribeWhileRecording, setAutoTranscribeWhileRecording] = useState(true);

  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Check Web Speech API availability
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setDictationSupported(!!SpeechRecognition);
  }, []);

  // Stop active speech recognition safely
  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsDictating(false);
  };

  // Start speech recognition into target field ('script' or 'tts')
  const startSpeechRecognition = (targetField: 'script' | 'tts' = 'script') => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setDictationSupported(false);
      setErrorMessage(
        'Live speech recognition is not supported in this browser. You can type or use AI Transcribe.'
      );
      return;
    }

    // Stop existing instance if already running
    stopSpeechRecognition();

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      setDictationTarget(targetField);
      setIsDictating(true);
      setErrorMessage('');

      const baseText = (targetField === 'script' ? script : ttsText).trim();
      const prefix = baseText ? baseText + ' ' : '';

      recognition.onstart = () => {
        setIsDictating(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const fullTranscribed = (prefix + finalTranscript + interimTranscript).trim();

        if (targetField === 'script') {
          setScript(fullTranscribed);
          // Suggest title if empty
          if (!label.trim() && fullTranscribed) {
            const words = fullTranscribed.split(/\s+/).slice(0, 5).join(' ');
            setLabel(words.length > 35 ? words.slice(0, 35) + '...' : words);
          }
        } else {
          setTtsText(fullTranscribed);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
        if (event.error !== 'no-speech') {
          setErrorMessage(`Dictation notice: ${event.error}`);
        }
        setIsDictating(false);
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Could not start speech recognition:', err);
      setIsDictating(false);
      setErrorMessage('Could not activate microphone for voice dictation.');
    }
  };

  const handleToggleDictation = (targetField: 'script' | 'tts' = 'script') => {
    if (isDictating && dictationTarget === targetField) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition(targetField);
    }
  };

  // Transcribe recorded audio blob using Gemini AI
  const handleAiTranscribeAudio = async () => {
    if (!recordResult?.blob) return;
    setIsAiTranscribing(true);
    setErrorMessage('');
    try {
      const text = await transcribeAudioWithGemini(recordResult.blob);
      if (text && text.trim()) {
        const cleanText = text.trim();
        setScript((prev) => (prev ? `${prev.trim()}\n\n${cleanText}` : cleanText));
        if (!label.trim()) {
          const words = cleanText.split(/\s+/).slice(0, 5).join(' ');
          setLabel(words.length > 35 ? words.slice(0, 35) + '...' : words);
        }
      } else {
        setErrorMessage('No distinct spoken words detected in the audio.');
      }
    } catch (err: any) {
      console.error('AI audio transcription error:', err);
      setErrorMessage(
        err.message || 'AI transcription failed. Please check Gemini API configuration.'
      );
    } finally {
      setIsAiTranscribing(false);
    }
  };

  // Clean up when closed
  useEffect(() => {
    if (!isOpen) {
      if (isRecording) {
        recorder.cancel();
        setIsRecording(false);
      }
      if (testAudio) {
        testAudio.pause();
        testAudio.src = '';
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      stopSpeechRecognition();
      setRecordResult(null);
      setLabel('');
      setScript('');
      setTargetTime('');
      setErrorMessage('');
      setRecordDuration(0);
      setIsAiTranscribing(false);
    }
  }, [isOpen, isRecording, recorder, testAudio]);

  // Waveform visualization loop
  useEffect(() => {
    if (!isRecording || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = recorder.getAnalyser();
    if (!ctx || !analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#121110';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#c4554a';
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording, recorder]);

  const handleStartRecord = async () => {
    setErrorMessage('');
    setRecordResult(null);
    const success = await recorder.start();
    if (!success) {
      setErrorMessage(
        'Microphone access was denied or not supported in this browser environment.'
      );
      return;
    }

    setIsRecording(true);
    setRecordDuration(0);
    const t0 = Date.now();
    timerRef.current = window.setInterval(() => {
      setRecordDuration((Date.now() - t0) / 1000);
    }, 100);

    // Simultaneous live dictation into script if enabled
    if (autoTranscribeWhileRecording && dictationSupported && !isDictating) {
      startSpeechRecognition('script');
    }
  };

  const handleStopRecord = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const result = await recorder.stop();
    setIsRecording(false);

    if (isDictating) {
      stopSpeechRecognition();
    }

    if (result) {
      setRecordResult(result);
      if (!label) {
        setLabel(`Voice Cue ${formatTime(result.duration)}`);
      }
    }
  };

  const handleTestPlay = () => {
    if (!recordResult) return;
    if (testAudio) {
      testAudio.pause();
    }
    const audio = new Audio(recordResult.url);
    setTestAudio(audio);
    setIsPlayingTest(true);
    audio.play();
    audio.onended = () => setIsPlayingTest(false);
    audio.onpause = () => setIsPlayingTest(false);
  };

  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) return;
    // Generate an audible prompter tone with speech script attached
    const blob = await generateBeepBlob(620, 2.0, 'sine', 'prompt');
    const url = URL.createObjectURL(blob);
    setRecordResult({
      blob,
      duration: 2.0,
      url,
    });
    setLabel(ttsText.trim().slice(0, 40));
    setScript(ttsText.trim());
    setActiveTab('mic');
  };

  const handleToggleTag = (tagToToggle: string) => {
    const trimmed = tagToToggle.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setTags(tags.filter((t) => t.toLowerCase() !== trimmed.toLowerCase()));
    } else {
      setTags([...tags, trimmed]);
    }
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customTagInput.trim();
    if (!clean) return;
    if (!tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setTags([...tags, clean]);
    }
    setCustomTagInput('');
  };

  const handleSave = () => {
    if (!recordResult) return;
    const cleanLabel = label.trim() || 'Spoken Cue';
    const targetSec = targetTime ? Number(targetTime) || undefined : undefined;

    onSaveCue({
      name: cleanLabel,
      blob: recordResult.blob,
      dur: recordResult.duration,
      target: targetSec,
      script: script.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1d1a17] border border-[#322d28] p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#322d28] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#ece6da] uppercase tracking-wider flex items-center gap-2">
              <span className="text-[#c4554a]">X VOX</span>
              <span className="text-xs font-normal text-[#8d8478] lowercase font-mono">· voice cue studio</span>
            </h2>
            <p className="text-xs text-[#8d8478] font-mono">
              Speak once · Hear it in your ear during live delivery
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

        {/* Tab switch: Mic vs Quick Text prompt */}
        <div className="flex border border-[#322d28] bg-[#121110]">
          <button
            type="button"
            onClick={() => setActiveTab('mic')}
            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'mic' ? 'bg-[#c58b4a] text-[#171208]' : 'text-[#8d8478] hover:text-[#ece6da]'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Microphone</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tts')}
            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'tts' ? 'bg-[#c58b4a] text-[#171208]' : 'text-[#8d8478] hover:text-[#ece6da]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Text Prompt</span>
          </button>
        </div>

        {activeTab === 'mic' ? (
          /* Mic Recording View */
          <div className="space-y-4">
            {/* Visualizer & Record Button */}
            <div className="bg-[#121110] border border-[#322d28] p-4 flex flex-col items-center justify-center space-y-3">
              <canvas
                ref={canvasRef}
                width={360}
                height={60}
                className="w-full h-14 bg-[#121110]"
              />

              <div className="text-3xl font-mono font-bold text-[#c4554a] tracking-wider">
                {formatTime(recordDuration)}
              </div>

              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecord}
                  className="px-6 py-3 bg-[#c4554a] hover:bg-red-600 text-white font-black text-sm tracking-widest uppercase flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                  <Mic className="w-4 h-4 fill-current" />
                  <span>Start Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecord}
                  className="px-6 py-3 bg-white text-[#c4554a] font-black text-sm tracking-widest uppercase flex items-center gap-2 shadow-lg animate-pulse transition-transform active:scale-95"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop & Save Audio</span>
                </button>
              )}

              {/* Dictate while recording toggle */}
              {dictationSupported && (
                <label className="flex items-center gap-2 text-[11px] text-[#8d8478] cursor-pointer hover:text-[#ece6da] transition-colors pt-1">
                  <input
                    type="checkbox"
                    checked={autoTranscribeWhileRecording}
                    onChange={(e) => setAutoTranscribeWhileRecording(e.target.checked)}
                    className="accent-[#c58b4a] rounded"
                  />
                  <span>Auto-transcribe speech to Script while recording</span>
                </label>
              )}

              {errorMessage && (
                <p className="text-xs text-[#b05a4e] text-center">{errorMessage}</p>
              )}
            </div>

            {/* Test replay preview if recorded */}
            {recordResult && (
              <div className="flex items-center justify-between p-2.5 bg-[#262220] border border-[#322d28] text-xs gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-mono text-[#ece6da]">
                    Recorded {recordResult.duration.toFixed(1)}s audio
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleTestPlay}
                    className="px-2.5 py-1 bg-[#1d1a17] border border-[#322d28] hover:border-[#c58b4a] text-[#ece6da] font-mono flex items-center gap-1.5"
                  >
                    {isPlayingTest ? (
                      <span>Playing...</span>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Test Ear Replay</span>
                      </>
                    )}
                  </button>

                  {/* AI Transcribe recorded audio */}
                  <button
                    type="button"
                    onClick={handleAiTranscribeAudio}
                    disabled={isAiTranscribing}
                    className="px-2.5 py-1 bg-[#1d1a17] border border-[#c58b4a]/50 hover:border-[#c58b4a] text-[#c58b4a] font-mono flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                    title="Use Gemini AI to transcribe this audio recording into the teleprompter script"
                  >
                    {isAiTranscribing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>AI Transcribing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>AI Transcribe</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#8d8478] mb-1">
                  Cue Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Opening Argument / Key Statistic"
                  maxLength={70}
                  className="w-full bg-[#121110] border border-[#322d28] focus:border-[#c58b4a] px-3 py-2 text-sm text-[#ece6da] outline-none"
                />
              </div>

              {/* Category & Mood Tags */}
              <div className="p-2.5 bg-[#141210] border border-[#322d28] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#c58b4a] font-bold flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Category & Mood Tags</span>
                  </span>
                  {tags.length > 0 && (
                    <span className="text-[10px] font-mono text-[#8d8478]">
                      {tags.length} selected
                    </span>
                  )}
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#262220] border border-[#c58b4a]/60 text-xs font-mono text-[#ece6da]"
                      >
                        <span>#{t}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleTag(t)}
                          className="text-[#8d8478] hover:text-[#b05a4e]"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {PRESET_TAGS.map((preset) => {
                    const isSelected = tags.some(
                      (t) => t.toLowerCase() === preset.toLowerCase()
                    );
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleToggleTag(preset)}
                        className={`px-2 py-0.5 text-[11px] font-mono transition-colors flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#c58b4a] text-[#121110] font-bold border border-[#c58b4a]'
                            : 'bg-[#1d1a17] text-[#8d8478] border border-[#322d28] hover:text-[#ece6da]'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                        <span>{preset}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-1.5 pt-0.5">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    placeholder="Custom tag..."
                    className="flex-1 bg-[#121110] border border-[#322d28] focus:border-[#c58b4a] px-2 py-1 text-xs text-[#ece6da] outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomTag()}
                    disabled={!customTagInput.trim()}
                    className="px-2.5 py-1 bg-[#262220] hover:bg-[#322d28] disabled:opacity-40 border border-[#322d28] text-xs font-mono text-[#ece6da] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-[#c58b4a]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#8d8478] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#c58b4a]" />
                    <span>Teleprompter Script / Notes</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    {/* Voice-to-Script Live Dictation Button */}
                    {dictationSupported ? (
                      <button
                        type="button"
                        onClick={() => handleToggleDictation('script')}
                        className={`px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                          isDictating && dictationTarget === 'script'
                            ? 'bg-[#c4554a] text-white border-red-500 animate-pulse'
                            : 'bg-[#262220] hover:bg-[#322d28] text-[#c58b4a] border-[#322d28]'
                        }`}
                        title="Verbally dictate your scripture or rebuttal directly into this script field"
                      >
                        <Mic
                          className={`w-3 h-3 ${
                            isDictating && dictationTarget === 'script' ? 'fill-current' : ''
                          }`}
                        />
                        <span>
                          {isDictating && dictationTarget === 'script'
                            ? 'Dictating... (Stop)'
                            : 'Voice-to-Script'}
                        </span>
                      </button>
                    ) : null}

                    {script && (
                      <button
                        type="button"
                        onClick={() => setScript('')}
                        className="px-1.5 py-0.5 text-[10px] font-mono text-[#8d8478] hover:text-[#c4554a] transition-colors"
                        title="Clear script"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Dictation Active Indicator */}
                {isDictating && dictationTarget === 'script' && (
                  <div className="mb-2 p-2 bg-[#c4554a]/15 border border-[#c4554a]/40 text-xs text-[#ece6da] flex items-center justify-between gap-2 animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#c4554a] animate-ping" />
                      <span className="font-mono text-[11px] text-[#f2a29b]">
                        Listening live... Dictate your rebuttal or scripture now.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={stopSpeechRecognition}
                      className="px-2 py-0.5 bg-[#c4554a] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}

                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="The spoken text, scripture verse, or rebuttal notes displayed on your prompter during delivery... (or click 'Voice-to-Script' above to dictate out loud)"
                  rows={4}
                  className="w-full bg-[#121110] border border-[#322d28] focus:border-[#c58b4a] px-3 py-2 text-sm text-[#ece6da] outline-none placeholder:text-[#575048]"
                />

                <div className="flex items-center justify-between mt-1 text-[11px] text-[#8d8478] font-mono">
                  <span>
                    {script ? `${script.split(/\s+/).filter(Boolean).length} words` : 'Empty script'}
                  </span>
                  <span className="text-[#a4998b]">
                    Tip: Dictate scripture references (e.g. &ldquo;Romans 8:28&rdquo;) clearly
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Text-to-Prompt (TTS) View */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#8d8478] leading-relaxed">
                Type or dictate your speech prompt below to create a clean prompter cue instantly.
              </p>

              {/* Dictate into Text Prompt */}
              {dictationSupported && (
                <button
                  type="button"
                  onClick={() => handleToggleDictation('tts')}
                  className={`px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                    isDictating && dictationTarget === 'tts'
                      ? 'bg-[#c4554a] text-white border-red-500 animate-pulse'
                      : 'bg-[#262220] hover:bg-[#322d28] text-[#c58b4a] border-[#322d28]'
                  }`}
                  title="Verbally dictate prompt text"
                >
                  <Mic
                    className={`w-3 h-3 ${
                      isDictating && dictationTarget === 'tts' ? 'fill-current' : ''
                    }`}
                  />
                  <span>
                    {isDictating && dictationTarget === 'tts'
                      ? 'Dictating... (Stop)'
                      : 'Voice-to-Prompt'}
                  </span>
                </button>
              )}
            </div>

            {/* Live Dictation Active Indicator for TTS */}
            {isDictating && dictationTarget === 'tts' && (
              <div className="p-2 bg-[#c4554a]/15 border border-[#c4554a]/40 text-xs text-[#ece6da] flex items-center justify-between gap-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#c4554a] animate-ping" />
                  <span className="font-mono text-[11px] text-[#f2a29b]">
                    Listening live... Speak prompt line now.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopSpeechRecognition}
                  className="px-2 py-0.5 bg-[#c4554a] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 transition-colors"
                >
                  Done
                </button>
              </div>
            )}

            <textarea
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="e.g. Remember to pause and make direct eye contact before revealing the revenue growth metric."
              rows={4}
              className="w-full bg-[#121110] border border-[#322d28] focus:border-[#c58b4a] px-3 py-2 text-sm text-[#ece6da] outline-none"
            />
            <button
              type="button"
              onClick={handleGenerateTTS}
              disabled={!ttsText.trim()}
              className="w-full py-2.5 bg-[#c58b4a] hover:bg-[#d4a359] disabled:opacity-40 text-[#171208] text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Prompt Cue</span>
            </button>

            {onOpenScripturePrompter && (
              <div className="p-3 border border-[#c58b4a]/30 bg-[#c58b4a]/10 text-xs flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-[#ece6da]">
                    Scripture & Rebuttal In-Ear Prompter
                  </div>
                  <div className="text-[11px] text-[#8d8478]">
                    Source by emotion (insecurity, anxiety) with Gemini AI
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenScripturePrompter();
                  }}
                  className="px-2.5 py-1 bg-[#c58b4a] text-[#171208] text-[11px] font-bold uppercase tracking-wider hover:bg-[#d4a359] transition-colors"
                >
                  Open
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
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
            disabled={!recordResult}
            className="flex-1 py-2.5 bg-[#c58b4a] hover:bg-[#d4a359] disabled:opacity-30 disabled:pointer-events-none text-[#171208] text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow"
          >
            <Check className="w-4 h-4" />
            <span>Save to Deck</span>
          </button>
        </div>
      </div>
    </div>
  );
};

