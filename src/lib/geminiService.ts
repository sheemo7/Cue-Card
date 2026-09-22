import { base64ToBlob } from './storage';

export interface ScriptureItem {
  reference: string;
  verseText: string;
  translation: string;
  inEarPromptCue: string;
  reciteResponse: string;
  whyItCounters: string;
  targetPacingSeconds: number;
}

export interface ScriptureSearchResponse {
  emotionOrFeeling: string;
  summaryTheme: string;
  suggestedHue: string;
  scriptures: ScriptureItem[];
}

export interface TTSResult {
  blob: Blob;
  url: string;
  duration: number;
  voice: string;
}

// Common emotional categories speakers face
export const EMOTION_PRESETS = [
  {
    id: 'insecurity',
    label: 'Extreme Insecurity',
    description: 'Feeling unqualified, inadequate, or like an imposter',
    icon: '🛡️',
  },
  {
    id: 'anxiety',
    label: 'Paralyzing Anxiety',
    description: 'Stage fright, racing heart, and overwhelming dread',
    icon: '🌊',
  },
  {
    id: 'rejection',
    label: 'Fear of Rejection / Man',
    description: 'People-pleasing, fear of judgment, and hostile crowds',
    icon: '👥',
  },
  {
    id: 'grief',
    label: 'Heavy Grief & Sorrow',
    description: 'Speaking through personal heartbreak, loss, or pain',
    icon: '🕊️',
  },
  {
    id: 'anger',
    label: 'Anger & Resentment',
    description: 'Defensiveness, unfair attacks, and need for grace',
    icon: '🔥',
  },
  {
    id: 'burnout',
    label: 'Exhaustion & Burnout',
    description: 'Empty well, fatigue, and loss of passion or purpose',
    icon: '⏳',
  },
  {
    id: 'boldness',
    label: 'Need for Boldness',
    description: 'Confronting truth, courage in opposition, and conviction',
    icon: '⚡',
  },
  {
    id: 'doubt',
    label: 'Intellectual Doubt & Crisis',
    description: 'Struggling with faith, clarity, and unshakeable certainty',
    icon: '⚓',
  },
];

export const TRANSLATIONS = ['NIV', 'ESV', 'KJV', 'CSB', 'NKJV', 'NLT'];

export const GEMINI_VOICES = [
  { id: 'Kore', label: 'Kore (Calm & Balanced, In-Ear)' },
  { id: 'Fenrir', label: 'Fenrir (Deep, Grounded & Resonant)' },
  { id: 'Zephyr', label: 'Zephyr (Smooth & Gentle Whisper)' },
  { id: 'Puck', label: 'Puck (Bright & Crisp Enunciation)' },
  { id: 'Charon', label: 'Charon (Solemn & Weighty)' },
];

/**
 * Sources scriptures from the Gemini API via server route /api/gemini/scriptures
 */
export async function sourceScripturesWithGemini(params: {
  emotionOrFeeling: string;
  translation?: string;
  drillMode?: 'instant_rebuttal' | 'in_ear_prompt';
  customContext?: string;
}): Promise<ScriptureSearchResponse> {
  const response = await fetch('/api/gemini/scriptures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Gemini API request failed with status ${response.status}`
    );
  }

  const data: ScriptureSearchResponse = await response.json();
  return data;
}

/**
 * Synthesizes voice audio for a prompt text using Gemini TTS
 */
export async function generateGeminiSpeech(
  text: string,
  voice = 'Kore'
): Promise<TTSResult> {
  const response = await fetch('/api/gemini/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Gemini TTS failed with status ${response.status}`
    );
  }

  const data = await response.json();
  const blob = base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
  const url = URL.createObjectURL(blob);

  // Compute duration by audio element or estimate
  const duration = await getAudioBlobDuration(blob, data.durationEstimate || 4.0);

  return {
    blob,
    url,
    duration,
    voice: data.voice || voice,
  };
}

/**
 * Accurately determines duration of an audio blob using an audio element
 */
function getAudioBlobDuration(blob: Blob, fallback: number): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = url;

    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
      URL.revokeObjectURL(url);
    };

    const onLoaded = () => {
      const dur = audio.duration;
      cleanup();
      resolve(isFinite(dur) && dur > 0 ? dur : fallback);
    };

    const onError = () => {
      cleanup();
      resolve(fallback);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);

    // Safety timeout
    setTimeout(() => {
      cleanup();
      resolve(fallback);
    }, 2000);
  });
}

/**
 * Transcribes audio via server-side Gemini Flash
 */
export async function transcribeAudioWithGemini(blob: Blob): Promise<string> {
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
  });
  reader.readAsDataURL(blob);
  const audioBase64 = await base64Promise;

  const res = await fetch('/api/gemini/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || 'audio/webm',
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to transcribe audio with Gemini AI');
  }

  const data = await res.json();
  return data.transcription || '';
}
