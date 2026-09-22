import { Cue, HUES } from '../types';
import { createPhilosophyMasterCard } from './philosophyDeck';

// Utility to generate a clean, audible tone audio blob using offline audio context
export async function generateBeepBlob(
  freq = 440,
  duration = 1.6,
  type: OscillatorType = 'sine',
  pattern: 'prompt' | 'chime' | 'pulse' = 'prompt'
): Promise<Blob> {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate);

  const osc = offlineCtx.createOscillator();
  const gain = offlineCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, 0);

  if (pattern === 'prompt') {
    // Two-tone rising prompter chime
    osc.frequency.setValueAtTime(freq, 0);
    osc.frequency.setValueAtTime(freq * 1.25, 0.25);
    gain.gain.setValueAtTime(0.001, 0);
    gain.gain.exponentialRampToValueAtTime(0.4, 0.04);
    gain.gain.setValueAtTime(0.3, 0.22);
    gain.gain.exponentialRampToValueAtTime(0.5, 0.28);
    gain.gain.exponentialRampToValueAtTime(0.001, duration - 0.05);
  } else if (pattern === 'chime') {
    gain.gain.setValueAtTime(0.001, 0);
    gain.gain.exponentialRampToValueAtTime(0.5, 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, duration - 0.02);
  } else {
    // Pulse
    gain.gain.setValueAtTime(0.4, 0);
    gain.gain.setValueAtTime(0.0, 0.15);
    gain.gain.setValueAtTime(0.4, 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, duration - 0.05);
  }

  osc.connect(gain);
  gain.connect(offlineCtx.destination);
  osc.start(0);
  osc.stop(duration);

  const renderedBuffer = await offlineCtx.startRendering();
  return bufferToWav(renderedBuffer);
}

// Convert AudioBuffer to standard 16-bit PCM WAV Blob
function bufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const numSamples = buffer.length * numChannels;
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = (numSamples * bitDepth) / 8;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

export async function createDefaultSampleDeck(): Promise<Cue[]> {
  const sampleData = [
    {
      name: 'Opening Hook & Salutation',
      hue: HUES[0],
      dur: 2.2,
      target: 20,
      freq: 523.25, // C5
      tags: ['Inspirational', 'Keynote'],
      script:
        'Good evening, distinguished judges and colleagues. Tonight, we are not asking you to imagine a distant future — we are presenting the working reality in your hands.',
    },
    {
      name: 'The Problem Statement',
      hue: HUES[1],
      dur: 1.8,
      target: 35,
      freq: 587.33, // D5
      tags: ['Anchor'],
      script:
        'Every day, 72% of mission-critical decisions stall due to fragmented context. We observed teams spending 4 hours a day simply reconstructing previous meeting rationales.',
    },
    {
      name: 'Core Solution & Metric',
      hue: HUES[2],
      dur: 2.4,
      target: 45,
      freq: 659.25, // E5
      tags: ['Confidence', 'Keynote'],
      script:
        'Sotto Cue changes this paradigm. By placing context directly in your ear at key speaking checkpoints, hesitation drops to zero, and message clarity jumps by 40%.',
    },
    {
      name: 'Rebuttal / Anticipated Question',
      hue: HUES[3],
      dur: 2.0,
      target: 25,
      freq: 698.46, // F5
      tags: ['Rebuttal'],
      script:
        'To the objection regarding cognitive overhead: our cue delivery is sub-audible whisper cadence, timed precisely between your natural breathing pauses.',
    },
    {
      name: 'The Call to Action',
      hue: HUES[4],
      dur: 2.5,
      target: 15,
      freq: 783.99, // G5
      tags: ['Inspirational'],
      script:
        'Join our closed beta today. Test your first keynote, debate, or pitch deck with Sotto Cue in your ear, and speak with unwavering composure.',
    },
    {
      name: 'Closing Cadence & Thanks',
      hue: HUES[5],
      dur: 1.5,
      target: 10,
      freq: 880.0, // A5
      tags: ['Calm'],
      script: 'Thank you for your time. I welcome your questions.',
    },
  ];

  const cues: Cue[] = [];
  for (let i = 0; i < sampleData.length; i++) {
    const item = sampleData[i];
    const blob = await generateBeepBlob(item.freq, item.dur, 'sine', 'prompt');
    const url = URL.createObjectURL(blob);
    cues.push({
      id: `cue-${Date.now()}-${i}`,
      name: item.name,
      hue: item.hue,
      dur: item.dur,
      target: item.target,
      script: item.script,
      tags: item.tags,
      blob,
      url,
      created: Date.now() - (sampleData.length - i) * 60000,
    });
  }

  // Default Card under Philosophy containing 20 of the greatest quotes/monologues
  const philosophyCard = await createPhilosophyMasterCard();
  cues.push(philosophyCard);

  return cues;
}
