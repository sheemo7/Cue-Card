import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Volume2,
  Play,
  Pause,
  Plus,
  Copy,
  Check,
  X,
  Loader2,
  Sliders,
  ShieldAlert,
  ArrowRight,
  Headphones,
  Mic,
  MicOff,
  RefreshCw,
  Clock,
  Layers,
  HelpCircle,
  Radio,
  FileText,
  Info,
} from 'lucide-react';
import {
  sourceScripturesWithGemini,
  generateGeminiSpeech,
  EMOTION_PRESETS,
  TRANSLATIONS,
  GEMINI_VOICES,
  ScriptureItem,
  ScriptureSearchResponse,
} from '../lib/geminiService';
import { HUES, formatTime } from '../types';

export type VoiceAudioMode = 'full_scripture' | 'prompt_and_scripture' | 'prompt_cue_only';

interface ScriptureGeminiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCueToDeck: (cueData: {
    name: string;
    blob: Blob;
    dur: number;
    target?: number;
    script?: string;
    hue?: string;
    tags?: string[];
  }) => void;
  onAddMultipleCues?: (
    cues: Array<{
      name: string;
      blob: Blob;
      dur: number;
      target?: number;
      script?: string;
      hue?: string;
      tags?: string[];
    }>
  ) => void;
  onShowToast: (message: string) => void;
}

export const ScriptureGeminiModal: React.FC<ScriptureGeminiModalProps> = ({
  isOpen,
  onClose,
  onAddCueToDeck,
  onAddMultipleCues,
  onShowToast,
}) => {
  const [selectedEmotion, setSelectedEmotion] = useState('Extreme Insecurity');
  const [customEmotionInput, setCustomEmotionInput] = useState('');
  const [translation, setTranslation] = useState('KJV');
  const [drillMode, setDrillMode] = useState<'instant_rebuttal' | 'in_ear_prompt'>(
    'instant_rebuttal'
  );
  const [selectedVoice, setSelectedVoice] = useState('Kore');

  // In-Ear Audio Content setting: Defaults to full scripture recitation so speaker can recite live
  const [voiceAudioMode, setVoiceAudioMode] = useState<VoiceAudioMode>('full_scripture');
  // Optional per-card audio mode overrides
  const [cardAudioModes, setCardAudioModes] = useState<Record<number, VoiceAudioMode>>({});

  // Verbal voice prompting state (Speech-to-Text)
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // API & Cost explainer sheet state
  const [showApiCostInfo, setShowApiCostInfo] = useState(false);

  // Loading & state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchResult, setSearchResult] = useState<ScriptureSearchResponse | null>(null);

  // Audio preview states keyed by `index-mode-voice`
  const [generatingTtsIndex, setGeneratingTtsIndex] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [cachedAudios, setCachedAudios] = useState<
    Record<string, { blob: Blob; url: string; dur: number }>
  >({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [addingAllLoading, setAddingAllLoading] = useState(false);

  // Active playing audio ref
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, []);

  // Clean up audio on close
  const handleClose = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setPlayingIndex(null);
    onClose();
  };

  // Helper to determine text spoken into ear
  const getItemTextToSpeak = (item: ScriptureItem, index: number): string => {
    const mode = cardAudioModes[index] || voiceAudioMode;
    if (mode === 'full_scripture') {
      // Speaks the full scripture passage so user can recite it live
      return `${item.reference}. ${item.verseText}`;
    } else if (mode === 'prompt_and_scripture') {
      // In-ear whispers the doubt trigger, followed immediately by the full scripture answer
      return `${item.inEarPromptCue}. ${item.reference}: ${item.verseText}`;
    } else {
      // Only the doubt / insecurity trigger challenge
      return item.inEarPromptCue;
    }
  };

  const getAudioKey = (index: number, mode: VoiceAudioMode, voice: string) => {
    return `${index}-${mode}-${voice}`;
  };

  // Verbal voice dictation handler
  const handleToggleVoiceDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setErrorMessage(
        'Speech recognition is not natively supported in this browser. You can type your emotion in the text box.'
      );
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interim += event.results[i][0].transcript;
        }
        if (interim) {
          setCustomEmotionInput(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setErrorMessage(`Microphone error: ${event.error}. Please type your topic.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Could not initialize SpeechRecognition:', err);
      setIsListening(false);
      setErrorMessage('Microphone access was blocked or not allowed. Please allow mic permissions.');
    }
  };

  const handleSearch = async (targetQuery?: string) => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }

    const query = (targetQuery || customEmotionInput || selectedEmotion).trim();
    if (!query) {
      setErrorMessage('Please select or type an emotion, feeling, or struggle.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setPlayingIndex(null);
    setCachedAudios({});

    try {
      const result = await sourceScripturesWithGemini({
        emotionOrFeeling: query,
        translation,
        drillMode,
      });
      setSearchResult(result);
      setSelectedEmotion(query);
    } catch (err: any) {
      console.error('Failed to source scriptures:', err);
      setErrorMessage(
        err.message ||
          'Could not retrieve scriptures from Gemini. Check that your GEMINI_API_KEY is configured in AI Studio Secrets.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Generate and/or Play voice audio for a specific scripture
  const handleTogglePlay = async (item: ScriptureItem, index: number) => {
    // If currently playing this one, pause it
    if (playingIndex === index && currentAudioRef.current) {
      currentAudioRef.current.pause();
      setPlayingIndex(null);
      return;
    }

    // Stop whatever else is playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setPlayingIndex(null);
    }

    const mode = cardAudioModes[index] || voiceAudioMode;
    const textToSpeak = getItemTextToSpeak(item, index);
    const audioKey = getAudioKey(index, mode, selectedVoice);

    try {
      let audioEntry = cachedAudios[audioKey];

      // If not yet synthesized for this mode and voice, call Gemini TTS
      if (!audioEntry) {
        setGeneratingTtsIndex(index);
        const tts = await generateGeminiSpeech(textToSpeak, selectedVoice);
        audioEntry = {
          blob: tts.blob,
          url: tts.url,
          dur: tts.duration,
        };
        setCachedAudios((prev) => ({ ...prev, [audioKey]: audioEntry }));
        setGeneratingTtsIndex(null);
      }

      const audio = new Audio(audioEntry.url);
      currentAudioRef.current = audio;
      setPlayingIndex(index);

      audio.play().catch((err) => {
        console.warn('Playback interrupted:', err);
        setPlayingIndex(null);
      });

      audio.onended = () => {
        setPlayingIndex(null);
        currentAudioRef.current = null;
      };
      audio.onpause = () => {
        setPlayingIndex(null);
      };
    } catch (err: any) {
      setGeneratingTtsIndex(null);
      setPlayingIndex(null);
      setErrorMessage(
        `Voice synthesis error: ${err.message || 'Check GEMINI_API_KEY settings.'}`
      );
    }
  };

  // Add individual scripture as cue pad to Sotto Cue deck
  const handleAddSingleCue = async (item: ScriptureItem, index: number) => {
    const mode = cardAudioModes[index] || voiceAudioMode;
    const textToSpeak = getItemTextToSpeak(item, index);
    const audioKey = getAudioKey(index, mode, selectedVoice);

    let audioEntry = cachedAudios[audioKey];
    if (!audioEntry) {
      try {
        setGeneratingTtsIndex(index);
        const tts = await generateGeminiSpeech(textToSpeak, selectedVoice);
        audioEntry = {
          blob: tts.blob,
          url: tts.url,
          dur: tts.duration,
        };
        setCachedAudios((prev) => ({ ...prev, [audioKey]: audioEntry }));
      } catch (err: any) {
        setGeneratingTtsIndex(null);
        setErrorMessage(`Failed to generate voice cue: ${err.message}`);
        return;
      } finally {
        setGeneratingTtsIndex(null);
      }
    }

    const modeLabel =
      mode === 'full_scripture'
        ? 'Full Recitation'
        : mode === 'prompt_and_scripture'
        ? 'Trigger + Scripture'
        : 'Trigger Only';

    const cueName = `${item.reference} · ${modeLabel}`;
    const formattedScript =
      `[SCRIPTURE LIVE RECITATION - ${item.reference} (${item.translation})]\n` +
      `"${item.verseText}"\n\n` +
      `[IN-EAR AUDIO WHISPER (${modeLabel})]\n` +
      `"${textToSpeak}"\n\n` +
      `[REBUTTAL TARGET]\n` +
      `Targeting: "${searchResult?.emotionOrFeeling || selectedEmotion}"\n` +
      `${item.whyItCounters}`;

    const hue = searchResult?.suggestedHue || HUES[index % HUES.length];

    const tags = ['Scripture'];
    if (searchResult?.emotionOrFeeling) tags.push(searchResult.emotionOrFeeling);
    else if (selectedEmotion) tags.push(selectedEmotion);
    else tags.push('Inspirational');
    if (item.whyItCounters) tags.push('Rebuttal');

    onAddCueToDeck({
      name: cueName,
      blob: audioEntry.blob,
      dur: audioEntry.dur,
      target: item.targetPacingSeconds,
      script: formattedScript,
      hue,
      tags,
    });

    onShowToast(`Added in-ear cue pad: ${item.reference} (${modeLabel})`);
  };

  // Add all retrieved scriptures into the deck
  const handleAddAllCues = async () => {
    if (!searchResult || searchResult.scriptures.length === 0) return;
    setAddingAllLoading(true);

    try {
      const itemsToAdd: Array<{
        name: string;
        blob: Blob;
        dur: number;
        target?: number;
        script?: string;
        hue?: string;
        tags?: string[];
      }> = [];

      for (let i = 0; i < searchResult.scriptures.length; i++) {
        const item = searchResult.scriptures[i];
        const mode = cardAudioModes[i] || voiceAudioMode;
        const textToSpeak = getItemTextToSpeak(item, i);
        const audioKey = getAudioKey(i, mode, selectedVoice);

        let audioEntry = cachedAudios[audioKey];
        if (!audioEntry) {
          const tts = await generateGeminiSpeech(textToSpeak, selectedVoice);
          audioEntry = {
            blob: tts.blob,
            url: tts.url,
            dur: tts.duration,
          };
          setCachedAudios((prev) => ({ ...prev, [audioKey]: audioEntry }));
        }

        const modeLabel =
          mode === 'full_scripture'
            ? 'Full Recitation'
            : mode === 'prompt_and_scripture'
            ? 'Trigger + Scripture'
            : 'Trigger Only';

        const cueName = `${item.reference} · ${modeLabel}`;
        const formattedScript =
          `[SCRIPTURE LIVE RECITATION - ${item.reference} (${item.translation})]\n` +
          `"${item.verseText}"\n\n` +
          `[IN-EAR AUDIO WHISPER (${modeLabel})]\n` +
          `"${textToSpeak}"\n\n` +
          `[REBUTTAL TARGET]\n` +
          `Targeting: "${searchResult.emotionOrFeeling || selectedEmotion}"\n` +
          `${item.whyItCounters}`;

        const tags = ['Scripture'];
        if (searchResult.emotionOrFeeling) tags.push(searchResult.emotionOrFeeling);
        else if (selectedEmotion) tags.push(selectedEmotion);
        else tags.push('Inspirational');
        if (item.whyItCounters) tags.push('Rebuttal');

        itemsToAdd.push({
          name: cueName,
          blob: audioEntry.blob,
          dur: audioEntry.dur,
          target: item.targetPacingSeconds,
          script: formattedScript,
          hue: searchResult.suggestedHue || HUES[i % HUES.length],
          tags,
        });
      }

      if (onAddMultipleCues) {
        onAddMultipleCues(itemsToAdd);
      } else {
        itemsToAdd.forEach((c) => onAddCueToDeck(c));
      }

      onShowToast(`Added all ${itemsToAdd.length} scripture cues to soundboard!`);
      handleClose();
    } catch (err: any) {
      setErrorMessage(`Failed generating cue pack: ${err.message}`);
    } finally {
      setAddingAllLoading(false);
    }
  };

  const handleCopyScript = (item: ScriptureItem, index: number) => {
    const text = `${item.reference} (${item.translation}):\n"${item.verseText}"\n\nIn-Ear Whisper: "${item.inEarPromptCue}"\nSpoken Recitation: "${item.reciteResponse}"\n\nWhy it counters: ${item.whyItCounters}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    onShowToast(`Copied ${item.reference} text to clipboard`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity">
      <div className="w-full max-w-3xl bg-[#1d1a17] border border-[#322d28] shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#322d28] p-4 bg-[#171412] flex-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#c58b4a]/15 border border-[#c58b4a]/40 flex items-center justify-center text-[#c58b4a]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-[#ece6da] uppercase tracking-wider flex items-center gap-2">
                  <span className="text-[#c58b4a]">X REBUT</span>
                  <span className="text-xs font-normal text-[#8d8478] lowercase font-sans">· scripture & in-ear rebuttal</span>
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#c58b4a]/20 text-[#c58b4a] border border-[#c58b4a]/30 font-bold uppercase tracking-wider">
                  Gemini AI
                </span>
                <button
                  type="button"
                  onClick={() => setShowApiCostInfo(!showApiCostInfo)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#262220] hover:bg-[#322d28] text-[#c2b8a7] border border-[#443c34] flex items-center gap-1 transition-colors"
                  title="Click to view API model and pricing details"
                >
                  <Info className="w-3 h-3 text-[#c58b4a]" />
                  <span>API & Cost Info</span>
                </button>
              </div>
              <p className="text-xs text-[#8d8478] mt-0.5">
                Source scriptures by emotion · In-ear full verse audio prompter · Live instant recital drill
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-[#8d8478] hover:text-[#ece6da] hover:bg-[#262220] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* API & Cost Information Banner / Sheet */}
        {showApiCostInfo && (
          <div className="bg-[#151311] border-b border-[#c58b4a]/30 p-3.5 text-xs text-[#c2b8a7] space-y-2">
            <div className="flex items-center justify-between font-bold text-[#ece6da]">
              <span className="flex items-center gap-1.5 text-[#c58b4a]">
                <Info className="w-4 h-4" />
                API & Subscription Details
              </span>
              <button
                type="button"
                onClick={() => setShowApiCostInfo(false)}
                className="text-[#8d8478] hover:text-[#ece6da]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed">
              <div className="bg-[#1a1714] p-2.5 border border-[#322d28]">
                <div className="font-bold text-[#ece6da] mb-1">Which APIs Are Used?</div>
                <p>
                  1. <span className="text-[#c58b4a] font-mono">gemini-3.1-flash-lite-preview</span> / <span className="text-[#c58b4a] font-mono">gemini-3.6-flash</span>: For retrieving theological verses tailored to your specific emotional struggle.
                </p>
                <p className="mt-1">
                  2. <span className="text-[#c58b4a] font-mono">gemini-3.1-flash-tts-preview</span>: For high-fidelity neural voice generation of in-ear whisper cues.
                </p>
              </div>
              <div className="bg-[#1a1714] p-2.5 border border-[#322d28]">
                <div className="font-bold text-[#ece6da] mb-1">Will This Cost Extra Above Gemini Pro?</div>
                <p>
                  <strong className="text-[#7e8e6f]">No!</strong> The Google AI Studio API used here operates under a generous <strong>Free Tier</strong> (up to 1,500 free requests/day for Flash models).
                </p>
                <p className="mt-1">
                  Your consumer Gemini Pro / Advanced subscription covers gemini.google.com; this developer API key runs separately within its standard free quota without surprise charges.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-[#2a1715] border border-[#c4554a]/40 p-3.5 text-xs text-[#f2b8b5] flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-[#c4554a] flex-none mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-[#f2b8b5] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Sourcing Controls Section */}
          <div className="bg-[#121110] border border-[#322d28] p-4 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ece6da] mb-2 flex items-center justify-between">
                <span>1. Select an Emotion or Prompt Verbally</span>
                <span className="text-[10px] text-[#8d8478] font-normal">
                  click chips, speak into mic, or type custom
                </span>
              </label>

              {/* Preset Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2.5">
                {EMOTION_PRESETS.map((preset) => {
                  const isSelected =
                    selectedEmotion === preset.label && !customEmotionInput;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmotion(preset.label);
                        setCustomEmotionInput('');
                        handleSearch(preset.label);
                      }}
                      className={`text-left p-2 border text-xs transition-colors flex items-center gap-1.5 ${
                        isSelected
                          ? 'border-[#c58b4a] bg-[#c58b4a]/15 text-[#ece6da]'
                          : 'border-[#322d28] bg-[#1d1a17] text-[#c2b8a7] hover:border-[#4d443b]'
                      }`}
                    >
                      <span className="text-sm flex-none">{preset.icon}</span>
                      <span className="font-semibold truncate">{preset.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Input with Verbal Dictation Button */}
              <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[220px]">
                  <input
                    type="text"
                    value={customEmotionInput}
                    onChange={(e) => setCustomEmotionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                    placeholder={
                      isListening
                        ? 'Listening to you... Speak your feeling or situation now...'
                        : 'Or describe any emotion (e.g. "extreme insecurity", "fear of rejection")...'
                    }
                    className={`w-full pl-3 pr-24 py-2 bg-[#1d1a17] border text-xs text-[#ece6da] placeholder-[#6b6256] outline-none transition-colors ${
                      isListening
                        ? 'border-[#c4554a] ring-1 ring-[#c4554a] bg-[#221312]'
                        : 'border-[#322d28] focus:border-[#c58b4a]'
                    }`}
                  />

                  {/* Verbal Mic Dictation Button inside input */}
                  <button
                    type="button"
                    onClick={handleToggleVoiceDictation}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                      isListening
                        ? 'bg-[#c4554a] text-white animate-pulse shadow-md'
                        : 'bg-[#2a2420] text-[#c58b4a] hover:bg-[#383029] border border-[#4a3e35]'
                    }`}
                    title={
                      isListening
                        ? 'Click to stop listening'
                        : 'Speak prompt verbally with microphone'
                    }
                  >
                    <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce' : ''}`} />
                    <span>{isListening ? 'Listening' : 'Speak'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#c58b4a] hover:bg-[#d4a359] disabled:opacity-50 text-[#171208] text-xs font-black tracking-wider uppercase flex items-center gap-1.5 transition-colors shadow flex-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sourcing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Source</span>
                    </>
                  )}
                </button>
              </div>

              {isListening && (
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[#c4554a] font-mono">
                  <span className="w-2 h-2 rounded-full bg-[#c4554a] animate-ping" />
                  <span>Microphone live: Speak clearly into your mic (e.g. "Scriptures to combat extreme insecurity and doubt")</span>
                </div>
              )}
            </div>

            {/* In-Ear Voice Content Selection (Directly addressing user's request to recite full scripture live) */}
            <div className="pt-3 border-t border-[#23201d] space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#c58b4a] flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5" />
                  <span>2. In-Ear Audio Prompter Mode (What Plays in Your Ear)</span>
                </label>
                <span className="text-[10px] text-[#8d8478]">
                  choose what Gemini TTS synthesizes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVoiceAudioMode('full_scripture')}
                  className={`p-2.5 border text-left transition-all ${
                    voiceAudioMode === 'full_scripture'
                      ? 'border-[#c58b4a] bg-[#c58b4a]/15 text-[#ece6da]'
                      : 'border-[#322d28] bg-[#1d1a17] text-[#8d8478] hover:border-[#4d443b]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#ece6da]">📖 Full Scripture Recitation</span>
                    {voiceAudioMode === 'full_scripture' && (
                      <Check className="w-3.5 h-3.5 text-[#c58b4a]" />
                    )}
                  </div>
                  <p className="text-[10.5px] text-[#a69d8f] leading-snug">
                    Prompter recites the full verse in-ear in real time so you can speak along live with zero memorization.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setVoiceAudioMode('prompt_and_scripture')}
                  className={`p-2.5 border text-left transition-all ${
                    voiceAudioMode === 'prompt_and_scripture'
                      ? 'border-[#c58b4a] bg-[#c58b4a]/15 text-[#ece6da]'
                      : 'border-[#322d28] bg-[#1d1a17] text-[#8d8478] hover:border-[#4d443b]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#ece6da]">⚡ Trigger + Scripture</span>
                    {voiceAudioMode === 'prompt_and_scripture' && (
                      <Check className="w-3.5 h-3.5 text-[#c58b4a]" />
                    )}
                  </div>
                  <p className="text-[10.5px] text-[#a69d8f] leading-snug">
                    Prompter whispers the doubt trigger first, then recites the full scripture response.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setVoiceAudioMode('prompt_cue_only')}
                  className={`p-2.5 border text-left transition-all ${
                    voiceAudioMode === 'prompt_cue_only'
                      ? 'border-[#c58b4a] bg-[#c58b4a]/15 text-[#ece6da]'
                      : 'border-[#322d28] bg-[#1d1a17] text-[#8d8478] hover:border-[#4d443b]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#ece6da]">🎯 Trigger Challenge Only</span>
                    {voiceAudioMode === 'prompt_cue_only' && (
                      <Check className="w-3.5 h-3.5 text-[#c58b4a]" />
                    )}
                  </div>
                  <p className="text-[10.5px] text-[#a69d8f] leading-snug">
                    Whispers only the doubt challenge; you recite the counter-scripture completely from memory.
                  </p>
                </button>
              </div>
            </div>

            {/* Translation & Voice Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#23201d]">
              {/* Translation */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8d8478] mb-1">
                  Bible Translation
                </label>
                <select
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#1d1a17] border border-[#322d28] text-xs text-[#ece6da] font-mono outline-none"
                >
                  {TRANSLATIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice Actor */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8d8478] mb-1">
                  In-Ear TTS Voice
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#1d1a17] border border-[#322d28] text-xs text-[#ece6da] outline-none"
                >
                  {GEMINI_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sourced Scriptures List */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#c58b4a] animate-spin" />
              <div className="text-sm font-bold text-[#ece6da] tracking-wide">
                Consulting Theological & Rhetorical Engine...
              </div>
              <p className="text-xs text-[#8d8478] max-w-md font-mono">
                Finding scriptures to dismantle "{customEmotionInput || selectedEmotion}" and
                crafting in-ear trigger cues for instant oral response.
              </p>
            </div>
          ) : searchResult && searchResult.scriptures.length > 0 ? (
            <div className="space-y-4">
              {/* Results Top Header */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-[#322d28]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ece6da]">
                    {searchResult.summaryTheme || selectedEmotion}
                  </span>
                  <span className="text-[11px] font-mono text-[#8d8478]">
                    ({searchResult.scriptures.length} verses sourced)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddAllCues}
                  disabled={addingAllLoading}
                  className="px-3 py-1.5 bg-[#1d1a17] border border-[#c58b4a] hover:bg-[#c58b4a]/15 text-[#c58b4a] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {addingAllLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing All...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5" />
                      <span>Add All as Cue Pack</span>
                    </>
                  )}
                </button>
              </div>

              {/* Cards Grid */}
              <div className="space-y-4">
                {searchResult.scriptures.map((item, idx) => {
                  const itemAudioMode = cardAudioModes[idx] || voiceAudioMode;
                  const isPlayingThis = playingIndex === idx;
                  const isGenerating = generatingTtsIndex === idx;
                  const isCopied = copiedIndex === idx;
                  const audioKey = getAudioKey(idx, itemAudioMode, selectedVoice);
                  const hasCachedAudio = Boolean(cachedAudios[audioKey]);
                  const textSpoken = getItemTextToSpeak(item, idx);

                  return (
                    <div
                      key={`${item.reference}-${idx}`}
                      className="border border-[#322d28] bg-[#151311] hover:border-[#4a423a] transition-colors p-4 space-y-3.5"
                    >
                      {/* Top Verse Title & Meta */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#c58b4a]" />
                            <h3 className="text-sm font-bold text-[#ece6da] font-mono tracking-tight">
                              {item.reference}
                            </h3>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#262220] text-[#c2b8a7]">
                              {item.translation}
                            </span>
                            <span className="text-[10px] text-[#8d8478] font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" /> ~{item.targetPacingSeconds}s split
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8d8478] mt-0.5">
                            {item.whyItCounters}
                          </p>
                        </div>

                        {/* Top Action Pills */}
                        <div className="flex items-center gap-1.5 flex-none">
                          <button
                            type="button"
                            onClick={() => handleCopyScript(item, idx)}
                            className="p-1.5 bg-[#1d1a17] hover:bg-[#262220] border border-[#322d28] text-[#8d8478] hover:text-[#ece6da] transition-colors"
                            title="Copy scripture and rehearsal script to clipboard"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-[#7e8e6f]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Verbatim Scripture Text Box */}
                      <blockquote className="bg-[#1a1714] border-l-2 border-[#c58b4a] p-3 text-xs sm:text-[13px] text-[#e3ded4] leading-relaxed italic">
                        "{item.verseText}"
                      </blockquote>

                      {/* Authentic Modern Study Breakdown */}
                      {item.modernBreakdown && (
                        <div className="bg-[#171513] border border-[#383028] p-3 space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#c58b4a]">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Easy-to-Understand Modern Study Breakdown</span>
                          </div>
                          <p className="text-xs text-[#d1c8bc] leading-relaxed font-sans">
                            {item.modernBreakdown}
                          </p>
                        </div>
                      )}

                      {/* Prompt & Rebuttal In-Ear Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* What plays in ear */}
                        <div className="bg-[#121110] border border-[#2d2824] p-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#c58b4a] mb-1">
                            <Headphones className="w-3 h-3" />
                            <span>In-Ear Audio Whisper ({itemAudioMode === 'full_scripture' ? 'Full Verse' : itemAudioMode === 'prompt_and_scripture' ? 'Trigger + Verse' : 'Trigger Only'})</span>
                          </div>
                          <p className="text-xs text-[#ece6da] font-mono leading-relaxed line-clamp-3">
                            "{textSpoken}"
                          </p>
                        </div>

                        {/* What you recite out loud */}
                        <div className="bg-[#121110] border border-[#2d2824] p-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7e8e6f] mb-1">
                            <Mic className="w-3 h-3" />
                            <span>Spoken Out Loud (Live Recital / Rebuttal)</span>
                          </div>
                          <p className="text-xs text-[#ece6da] leading-relaxed font-sans line-clamp-3">
                            {item.verseText}
                          </p>
                        </div>
                      </div>

                      {/* Card Audio Mode Override Selector */}
                      <div className="flex items-center justify-between flex-wrap gap-2 text-[10.5px] pt-1">
                        <div className="flex items-center gap-1 text-[#8d8478]">
                          <span>In-Ear Mode:</span>
                          <div className="inline-flex border border-[#322d28] bg-[#121110] p-0.5 rounded-none">
                            <button
                              type="button"
                              onClick={() => {
                                setCardAudioModes((prev) => ({ ...prev, [idx]: 'full_scripture' }));
                              }}
                              className={`px-2 py-0.5 font-bold uppercase tracking-wider transition-colors ${
                                itemAudioMode === 'full_scripture'
                                  ? 'bg-[#c58b4a] text-[#171208]'
                                  : 'text-[#8d8478] hover:text-[#ece6da]'
                              }`}
                            >
                              Full Verse
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCardAudioModes((prev) => ({ ...prev, [idx]: 'prompt_and_scripture' }));
                              }}
                              className={`px-2 py-0.5 font-bold uppercase tracking-wider transition-colors ${
                                itemAudioMode === 'prompt_and_scripture'
                                  ? 'bg-[#c58b4a] text-[#171208]'
                                  : 'text-[#8d8478] hover:text-[#ece6da]'
                              }`}
                            >
                              Trigger + Verse
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCardAudioModes((prev) => ({ ...prev, [idx]: 'prompt_cue_only' }));
                              }}
                              className={`px-2 py-0.5 font-bold uppercase tracking-wider transition-colors ${
                                itemAudioMode === 'prompt_cue_only'
                                  ? 'bg-[#c58b4a] text-[#171208]'
                                  : 'text-[#8d8478] hover:text-[#ece6da]'
                              }`}
                            >
                              Trigger Only
                            </button>
                          </div>
                        </div>

                        <span className="text-[#8d8478] font-mono text-[10px]">
                          Voice: {selectedVoice}
                        </span>
                      </div>

                      {/* Audio Generation & Add to Soundboard Action Strip */}
                      <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleTogglePlay(item, idx)}
                          disabled={isGenerating}
                          className={`px-3 py-1.5 border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${
                            isPlayingThis
                              ? 'border-[#c58b4a] bg-[#c58b4a] text-[#171208]'
                              : 'border-[#322d28] bg-[#1d1a17] text-[#ece6da] hover:border-[#c58b4a]'
                          }`}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c58b4a]" />
                              <span>Generating Voice...</span>
                            </>
                          ) : isPlayingThis ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>Stop In-Ear Audio</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current text-[#c58b4a]" />
                              <span>
                                {hasCachedAudio ? 'Audition In-Ear Audio' : 'Audition Voice Gen'}
                              </span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddSingleCue(item, idx)}
                          disabled={isGenerating}
                          className="px-3.5 py-1.5 bg-[#c58b4a] hover:bg-[#d4a359] disabled:opacity-50 text-[#171208] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm ml-auto"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Add to Soundboard Deck</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="py-12 border border-dashed border-[#322d28] bg-[#151311] flex flex-col items-center justify-center text-center p-6 space-y-2">
              <BookOpen className="w-8 h-8 text-[#8d8478]" />
              <p className="text-xs font-bold uppercase tracking-wider text-[#ece6da]">
                Select an Emotion or Tap "Speak" Above
              </p>
              <p className="text-xs text-[#8d8478] max-w-sm">
                Gemini will source authentic scripture verses and generate synchronized
                in-ear prompts so you can practice instant recitation or rebuttal drills in your earbud.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#322d28] bg-[#121110] flex items-center justify-between text-xs text-[#8d8478] flex-none">
          <span className="font-mono text-[11px] flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#c58b4a]" />
            <span>Mode: {voiceAudioMode === 'full_scripture' ? 'Full Scripture In-Ear Recitation' : voiceAudioMode === 'prompt_and_scripture' ? 'Trigger + Full Verse' : 'Trigger Challenge Only'}</span>
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1 bg-[#1d1a17] hover:bg-[#262220] border border-[#322d28] text-[#ece6da] text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
