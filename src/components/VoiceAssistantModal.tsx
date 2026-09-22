import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Radio,
  Sparkles,
  Layers,
  Play,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Loader2,
  Check,
  ChevronRight,
  MessageSquare,
  HelpCircle,
  Globe,
  Zap,
  ExternalLink,
} from 'lucide-react';
import {
  queryVoiceAssistant,
  transcribeAudioWithGemini,
  VoiceAssistantResponse,
} from '../lib/geminiService';
import { Cue, DeckSession } from '../types';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDeckName: string;
  availableDecks: DeckSession[];
  cues: Cue[];
  onSwitchDeck: (session: DeckSession) => void;
  onPlayCue: (cue: Cue, index: number) => void;
  onStopPlayback: () => void;
  onAddCueToDeck?: (cueData: {
    name: string;
    blob: Blob;
    dur: number;
    target?: number;
    script?: string;
    hue?: string;
    tags?: string[];
  }) => void;
  onShowToast: (message: string) => void;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: string;
  targetDeck?: string;
  audioUrl?: string;
  time: string;
  grounding?: {
    isGrounded: boolean;
    searchQueries: string[];
    sources: Array<{ title: string; uri: string }>;
  };
}

// Convert Float32 audio channel to 16-bit PCM base64 string for Gemini Live API
function pcmToBase64(float32Array: Float32Array): string {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

// Low-latency queued playback of 24kHz PCM chunks from Gemini Live API
function playLivePcmChunk(
  ctx: AudioContext,
  base64Audio: string,
  nextStartTimeRef: React.MutableRefObject<number>
) {
  try {
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startTime = Math.max(now, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;
  } catch (err) {
    console.warn('Failed to decode/play Live PCM chunk:', err);
  }
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  currentDeckName,
  availableDecks,
  cues,
  onSwitchDeck,
  onPlayCue,
  onStopPlayback,
  onAddCueToDeck,
  onShowToast,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [searchGroundingEnabled, setSearchGroundingEnabled] = useState(true);
  const [liveApiMode, setLiveApiMode] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [audioMuted, setAudioMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Gemini Live WebSocket and Audio Context refs
  const liveWsRef = useRef<WebSocket | null>(null);
  const liveInputAudioCtxRef = useRef<AudioContext | null>(null);
  const liveOutputAudioCtxRef = useRef<AudioContext | null>(null);
  const liveProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const nextLiveStartTimeRef = useRef<number>(0);

  // Scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, transcript]);

  // Handle open/close speech recognition lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
        currentAudioElementRef.current = null;
      }
      setIsSpeaking(false);
      return;
    }

    // Auto-start listening on modal open for instant phone experience
    const timer = setTimeout(() => {
      startListening();
    }, 400);

    return () => {
      clearTimeout(timer);
      stopListening();
    };
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
    };
  }, []);

  // Initialize and start Speech Recognition
  const startListening = async () => {
    if (isListening || isProcessing) return;

    setTranscript('');
    setIsListening(true);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentSpoken = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentSpoken += event.results[i][0].transcript;
          }
          setTranscript(currentSpoken);

          // Reset silence timer for automatic submission when user finishes talking
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (currentSpoken.trim().length > 2) {
              handleProcessVoiceInput(currentSpoken.trim());
            }
          }, 1600);
        };

        recognition.onerror = (err: any) => {
          console.warn('SpeechRecognition error:', err);
          if (err.error !== 'no-speech') {
            setIsListening(false);
          }
        };

        recognition.onend = () => {
          if (isListening && continuousMode && !isProcessing && !isSpeaking) {
            try {
              recognition.start();
            } catch {
              // ignore
            }
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (e) {
        console.warn('SpeechRecognition start failed, falling back to MediaRecorder:', e);
      }
    }

    // Fallback: Audio recording via MediaStream + Gemini 3.5 Transcribe
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        stream.getTracks().forEach((t) => t.stop());

        if (audioBlob.size > 1000) {
          setIsProcessing(true);
          try {
            const transcribed = await transcribeAudioWithGemini(audioBlob);
            if (transcribed.trim()) {
              setTranscript(transcribed);
              await handleProcessVoiceInput(transcribed);
            }
          } catch (err: any) {
            console.error('Transcription error:', err);
            onShowToast('Could not transcribe audio. Please speak clearly.');
          } finally {
            setIsProcessing(false);
          }
        }
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Audio recording failed:', err);
      setIsListening(false);
      onShowToast('Microphone access denied. Please grant permission.');
    }
  };

  const stopLiveApiSession = () => {
    if (liveWsRef.current) {
      try {
        liveWsRef.current.close();
      } catch (_) {}
      liveWsRef.current = null;
    }
    if (liveProcessorRef.current) {
      try {
        liveProcessorRef.current.disconnect();
      } catch (_) {}
      liveProcessorRef.current = null;
    }
    if (liveStreamRef.current) {
      try {
        liveStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      liveStreamRef.current = null;
    }
    if (liveInputAudioCtxRef.current) {
      try {
        liveInputAudioCtxRef.current.close();
      } catch (_) {}
      liveInputAudioCtxRef.current = null;
    }
    if (liveOutputAudioCtxRef.current) {
      try {
        liveOutputAudioCtxRef.current.close();
      } catch (_) {}
      liveOutputAudioCtxRef.current = null;
    }
    setIsListening(false);
    setIsSpeaking(false);
  };

  const startLiveApiSession = async () => {
    stopListening();
    try {
      setIsListening(true);
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtxClass({ sampleRate: 16000 });
      const outputCtx = new AudioCtxClass({ sampleRate: 24000 });
      liveInputAudioCtxRef.current = inputCtx;
      liveOutputAudioCtxRef.current = outputCtx;
      nextLiveStartTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveStreamRef.current = stream;
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      liveProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const float32 = e.inputBuffer.getChannelData(0);
          const base64 = pcmToBase64(float32);
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      let liveTurnText = '';
      const turnId = `live-${Date.now()}`;

      ws.onopen = () => {
        onShowToast('Connected to gemini-3.8-live stream ⚡');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.interrupted) {
            nextLiveStartTimeRef.current = 0;
            setIsSpeaking(false);
          }
          if (msg.text) {
            liveTurnText += msg.text;
            setChatHistory((prev) => {
              const existing = prev.find((t) => t.id === turnId);
              if (existing) {
                return prev.map((t) => (t.id === turnId ? { ...t, text: liveTurnText } : t));
              }
              return [
                ...prev,
                {
                  id: turnId,
                  role: 'assistant',
                  text: liveTurnText,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ];
            });
          }
          if (msg.audio && !audioMuted) {
            setIsSpeaking(true);
            playLivePcmChunk(outputCtx, msg.audio, nextLiveStartTimeRef);
          }
          if (msg.error) {
            onShowToast(`Live API: ${msg.error}`);
          }
        } catch (err) {
          console.error('Error handling Live WS packet:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('Live WebSocket error:', err);
        onShowToast('Live WebSocket stream error. Using standard assistant.');
        stopLiveApiSession();
        setLiveApiMode(false);
      };

      ws.onclose = () => {
        setIsListening(false);
        setIsSpeaking(false);
      };
    } catch (err: any) {
      console.error('Failed to start Live API session:', err);
      onShowToast(`Could not start Live mode: ${err.message || 'Mic access error'}`);
      setIsListening(false);
      setLiveApiMode(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    stopLiveApiSession();

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }
  };

  // Play assistant voice response audio
  const playAssistantAudio = (base64Audio: string, mimeType = 'audio/wav') => {
    if (audioMuted || !base64Audio) return;

    if (currentAudioElementRef.current) {
      currentAudioElementRef.current.pause();
    }

    try {
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const audioUrl = URL.createObjectURL(blob);

      const audio = new Audio(audioUrl);
      currentAudioElementRef.current = audio;
      setIsSpeaking(true);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioElementRef.current = null;

        // In continuous mode, resume listening after speaking
        if (continuousMode && isOpen) {
          setTimeout(() => {
            startListening();
          }, 500);
        }
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioElementRef.current = null;
      };

      audio.play().catch((e) => {
        console.warn('Audio auto-play blocked:', e);
        setIsSpeaking(false);
      });
    } catch (e) {
      console.warn('Failed to parse or play audio:', e);
      setIsSpeaking(false);
    }
  };

  // Process voice input through the Gemini Voice Assistant
  const handleProcessVoiceInput = async (spokenText: string) => {
    if (!spokenText.trim() || isProcessing) return;

    // Temporarily pause listening while processing and speaking
    stopListening();
    setIsProcessing(true);

    const userTurnId = `user-${Date.now()}`;
    const assistantTurnId = `asst-${Date.now() + 1}`;
    const currentTimeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setChatHistory((prev) => [
      ...prev,
      {
        id: userTurnId,
        role: 'user',
        text: spokenText,
        time: currentTimeStr,
      },
    ]);

    try {
      const deckNames = availableDecks.map((d) => d.name);
      const cueSummaries = cues.map((c) => ({
        id: c.id,
        name: c.name,
        tags: c.tags,
      }));

      const recentHistory = chatHistory.slice(-4).map((h) => ({
        role: h.role,
        text: h.text,
      }));

      const result: VoiceAssistantResponse = await queryVoiceAssistant({
        speechInput: spokenText,
        availableDecks: deckNames,
        currentDeckName,
        cues: cueSummaries,
        conversationHistory: recentHistory,
        enableSearchGrounding: searchGroundingEnabled,
      });

      // Execute App Actions based on detected intent
      let actionNote = '';

      if (result.action === 'switch_deck' && result.targetDeck) {
        const matched = availableDecks.find(
          (d) =>
            d.name.toLowerCase() === result.targetDeck?.toLowerCase() ||
            d.name.toLowerCase().includes(result.targetDeck?.toLowerCase() || '')
        );

        if (matched) {
          onSwitchDeck(matched);
          actionNote = `Switched to deck "${matched.name}"`;
          onShowToast(`Switched deck to "${matched.name}"`);
        } else {
          actionNote = `Deck "${result.targetDeck}" not found`;
        }
      } else if (result.action === 'control_playback') {
        const cmd = result.playbackCommand;
        if (cmd === 'stop' || cmd === 'pause') {
          onStopPlayback();
          actionNote = 'Stopped playback';
        } else if (cmd === 'play' || cmd === 'next') {
          if (cues.length > 0) {
            onPlayCue(cues[0], 0);
            actionNote = `Playing "${cues[0].name}"`;
          }
        }
      }

      setChatHistory((prev) => [
        ...prev,
        {
          id: assistantTurnId,
          role: 'assistant',
          text: result.displayResponse || result.spokenResponse,
          action: actionNote,
          targetDeck: result.targetDeck,
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          grounding: result.grounding,
        },
      ]);

      // Play spoken audio through phone earpiece / speaker
      if (result.audioBase64) {
        playAssistantAudio(result.audioBase64, result.mimeType || 'audio/wav');
      } else {
        // Fallback: If no audio returned, use Web Speech Synthesis if available
        if ('speechSynthesis' in window && !audioMuted) {
          const utterance = new SpeechSynthesisUtterance(result.spokenResponse);
          utterance.rate = 1.05;
          utterance.onend = () => {
            if (continuousMode && isOpen) {
              setTimeout(() => startListening(), 400);
            }
          };
          window.speechSynthesis.speak(utterance);
        } else if (continuousMode && isOpen) {
          setTimeout(() => startListening(), 400);
        }
      }
    } catch (err: any) {
      console.error('Error querying voice assistant:', err);
      setChatHistory((prev) => [
        ...prev,
        {
          id: assistantTurnId,
          role: 'assistant',
          text:
            'I encountered a temporary connection issue. Please try speaking your command again.',
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
      if (continuousMode && isOpen) {
        setTimeout(() => startListening(), 1000);
      }
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  };

  const handleSelectQuickPrompt = (promptText: string) => {
    setTranscript(promptText);
    handleProcessVoiceInput(promptText);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#141210] border border-[#383028] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2722] bg-[#1a1714]">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span
                className={`w-3 h-3 rounded-full block ${
                  isListening
                    ? 'bg-[#c58b4a] animate-ping opacity-75'
                    : isSpeaking
                    ? 'bg-[#599e82] animate-pulse'
                    : isProcessing
                    ? 'bg-[#c4554a] animate-spin'
                    : 'bg-[#8d8478]'
                }`}
              />
              <span
                className={`w-3 h-3 rounded-full block absolute inset-0 ${
                  isListening
                    ? 'bg-[#c58b4a]'
                    : isSpeaking
                    ? 'bg-[#599e82]'
                    : isProcessing
                    ? 'bg-[#c4554a]'
                    : 'bg-[#5c544b]'
                }`}
              />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#ece6da] flex items-center gap-2">
                <span>Sotto Ear Assistant</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#26221e] text-[#c58b4a]">
                  KJV Base & Voice Mode
                </span>
              </h2>
              <p className="text-[10px] font-mono text-[#8d8478]">
                Current Deck: <span className="text-[#ece6da] font-bold">{currentDeckName}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {/* Live API (gemini-3.8-live) toggle */}
            <button
              type="button"
              onClick={() => {
                if (liveApiMode) {
                  stopLiveApiSession();
                  setLiveApiMode(false);
                  onShowToast('Switched to Assisted Turn Mode (gemini-3.8-flash)');
                } else {
                  setLiveApiMode(true);
                  startLiveApiSession();
                }
              }}
              className={`px-2 py-1 border text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                liveApiMode
                  ? 'border-[#599e82] text-[#599e82] bg-[#599e82]/15 shadow-sm'
                  : 'border-[#322d28] text-[#8d8478] hover:text-[#ece6da]'
              }`}
              title="Toggle real-time streaming with gemini-3.8-live"
            >
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">Live:</span>
              <span>{liveApiMode ? 'ON' : 'OFF'}</span>
            </button>

            {/* Google Search Grounding toggle */}
            <button
              type="button"
              onClick={() => {
                setSearchGroundingEnabled(!searchGroundingEnabled);
                onShowToast(
                  !searchGroundingEnabled
                    ? 'Google Search Grounding Enabled 🌐'
                    : 'Search Grounding Disabled'
                );
              }}
              className={`px-2 py-1 border text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                searchGroundingEnabled
                  ? 'border-[#c58b4a] text-[#c58b4a] bg-[#c58b4a]/15 shadow-sm'
                  : 'border-[#322d28] text-[#8d8478] hover:text-[#ece6da]'
              }`}
              title="Google Search grounding for accurate real-time knowledge & scriptural authentication"
            >
              <Globe className="w-3 h-3" />
              <span className="hidden sm:inline">Grounding:</span>
              <span>{searchGroundingEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Audio Voice Output Mute Toggle */}
            <button
              type="button"
              onClick={() => setAudioMuted(!audioMuted)}
              className={`p-1.5 border text-xs transition-colors ${
                audioMuted
                  ? 'border-[#c4554a] text-[#c4554a] bg-[#c4554a]/10'
                  : 'border-[#322d28] text-[#8d8478] hover:text-[#ece6da]'
              }`}
              title={audioMuted ? 'Ear audio muted' : 'Ear audio enabled'}
            >
              {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Continuous listening toggle */}
            <button
              type="button"
              onClick={() => setContinuousMode(!continuousMode)}
              className={`px-2 py-1 border text-[10px] font-bold uppercase tracking-wider transition-colors ${
                continuousMode
                  ? 'border-[#c58b4a] text-[#c58b4a] bg-[#c58b4a]/10'
                  : 'border-[#322d28] text-[#8d8478]'
              }`}
              title="Keep listening continuously after each assistant response"
            >
              <span className="hidden sm:inline">Loop: </span>
              {continuousMode ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#8d8478] hover:text-[#ece6da] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[260px] bg-[#11100e]">
          {chatHistory.length === 0 ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#1c1814] border border-[#383028] flex items-center justify-center text-[#c58b4a]">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#ece6da] tracking-wide">
                  Listening for Your Voice
                </h3>
                <p className="text-xs text-[#8d8478] max-w-sm">
                  Say which deck to bring up, request KJV scripture with modern study breakdown, or
                  have an oral rehearsal conversation.
                </p>
              </div>

              {/* Available Decks Chips */}
              {availableDecks.length > 0 && (
                <div className="w-full pt-2">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-[#8d8478] mb-1.5">
                    Say "Bring up [Deck]" to switch:
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {availableDecks.map((deck) => (
                      <button
                        key={deck.id}
                        type="button"
                        onClick={() => handleSelectQuickPrompt(`Bring up ${deck.name} deck`)}
                        className="px-2.5 py-1 text-xs border border-[#2d2824] bg-[#181614] hover:border-[#c58b4a] text-[#cfc7bc] transition-colors flex items-center gap-1"
                      >
                        <Layers className="w-3 h-3 text-[#c58b4a]" />
                        <span>{deck.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Voice Commands */}
              <div className="w-full pt-2">
                <div className="text-[10px] uppercase font-mono tracking-wider text-[#8d8478] mb-1.5">
                  Suggested Spoken Commands:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectQuickPrompt(
                        'Give me a King James scripture with modern breakdown for anxiety'
                      )
                    }
                    className="p-2 border border-[#26221e] bg-[#171513] hover:border-[#423930] text-[11px] text-[#c2b8a7] transition-colors"
                  >
                    "Give me a KJV scripture with modern breakdown for anxiety"
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQuickPrompt('Play the first cue in this deck')}
                    className="p-2 border border-[#26221e] bg-[#171513] hover:border-[#423930] text-[11px] text-[#c2b8a7] transition-colors"
                  >
                    "Play the first cue in this deck"
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectQuickPrompt('How should I pace my breathing during my rebuttal?')
                    }
                    className="p-2 border border-[#26221e] bg-[#171513] hover:border-[#423930] text-[11px] text-[#c2b8a7] transition-colors"
                  >
                    "How should I pace my breathing during my rebuttal?"
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectQuickPrompt('Explain Romans 8:31 in modern study terms')
                    }
                    className="p-2 border border-[#26221e] bg-[#171513] hover:border-[#423930] text-[11px] text-[#c2b8a7] transition-colors"
                  >
                    "Explain Romans 8:31 in modern study terms"
                  </button>
                </div>
              </div>
            </div>
          ) : (
            chatHistory.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col ${
                  item.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-[#8d8478] font-mono mb-1">
                  <span>{item.role === 'user' ? 'You' : 'Sotto Assistant'}</span>
                  <span>·</span>
                  <span>{item.time}</span>
                </div>

                <div
                  className={`p-3 max-w-[85%] text-xs leading-relaxed ${
                    item.role === 'user'
                      ? 'bg-[#2a241e] border border-[#4a3e30] text-[#ece6da]'
                      : 'bg-[#181614] border border-[#322d28] text-[#cfc7bc]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{item.text}</p>

                  {item.action && (
                    <div className="mt-2 pt-1.5 border-t border-[#383028] flex items-center gap-1.5 text-[10.5px] font-bold text-[#c58b4a]">
                      <Check className="w-3.5 h-3.5" />
                      <span>{item.action}</span>
                    </div>
                  )}

                  {/* Grounding Citations & Sources */}
                  {item.grounding?.isGrounded && (
                    <div className="mt-2.5 pt-2 border-t border-[#2d2722] text-[10px] space-y-1.5">
                      <div className="flex items-center gap-1 font-mono text-[#c58b4a] font-bold">
                        <Globe className="w-3 h-3" />
                        <span>Google Search Grounded</span>
                      </div>
                      {item.grounding.sources && item.grounding.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.grounding.sources.slice(0, 3).map((source, idx) => (
                            <a
                              key={idx}
                              href={source.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#201c18] border border-[#3d342c] text-[#cfc7bc] hover:text-[#ece6da] hover:border-[#c58b4a] transition-colors"
                            >
                              <span className="truncate max-w-[140px]">{source.title || 'Source'}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0 text-[#8d8478]" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Current Live Transcription Stream */}
          {transcript && (
            <div className="flex flex-col items-end animate-pulse">
              <div className="flex items-center gap-1.5 text-[10px] text-[#c58b4a] font-mono mb-1">
                <span>Listening...</span>
              </div>
              <div className="p-3 max-w-[85%] text-xs bg-[#221c17] border border-[#c58b4a]/40 text-[#ece6da] italic">
                "{transcript}"
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs font-mono text-[#c58b4a] p-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing theological standard & executing command...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Push-to-Talk / Listening Bar */}
        <div className="p-4 border-t border-[#2d2722] bg-[#161412] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {liveApiMode ? (
              <button
                type="button"
                onClick={isListening ? stopLiveApiSession : startLiveApiSession}
                className={`flex-1 sm:flex-none px-5 py-2.5 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                  isListening
                    ? 'bg-[#c4554a] hover:bg-[#d65f54] text-white shadow-lg'
                    : 'bg-[#599e82] hover:bg-[#6bb596] text-[#0d1c14] shadow-md'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Stop Live Stream</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Start Live Stream (3.8 Live)</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`flex-1 sm:flex-none px-5 py-2.5 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                  isListening
                    ? 'bg-[#c4554a] hover:bg-[#d65f54] text-white shadow-lg'
                    : 'bg-[#c58b4a] hover:bg-[#d4a359] text-[#171208] shadow-md'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Stop Listening</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Start Listening</span>
                  </>
                )}
              </button>
            )}

            {chatHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setChatHistory([])}
                className="px-2.5 py-2.5 border border-[#322d28] hover:bg-[#201d1a] text-[#8d8478] hover:text-[#ece6da] text-xs transition-colors"
                title="Clear conversation history"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-[#8d8478] text-center sm:text-right">
            <span>Fundamental Base: <strong className="text-[#ece6da]">KJV</strong></span>
            <span>·</span>
            <span>Models: <strong className="text-[#ece6da]">Gemini 3.8 Live/Flash</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
