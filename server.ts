import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to convert 16-bit PCM buffer to WAV container
function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitDepth = 16
): Buffer {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitDepth, 34);

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

// Lazy Gemini client helper
let genAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!genAiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not configured in the environment. Please add it via AI Studio Settings > Secrets.'
      );
    }
    genAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

// ==========================================
// API Routes
// ==========================================

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Sourcing Scriptures based on emotion, feeling, doubt, or subject
app.post('/api/gemini/scriptures', async (req, res) => {
  try {
    const {
      emotionOrFeeling,
      translation = 'NIV',
      drillMode = 'instant_rebuttal',
      customContext = '',
    } = req.body;

    if (!emotionOrFeeling || typeof emotionOrFeeling !== 'string') {
      res.status(400).json({ error: 'emotionOrFeeling parameter is required' });
      return;
    }

    const ai = getGeminiClient();

    const prompt = `Source 3 to 5 powerful scripture passages specifically targeting the emotion, feeling, or struggle: "${emotionOrFeeling}".
Translation preferred: ${translation || 'NIV'}
Rehearsal Drill Mode: ${
      drillMode === 'instant_rebuttal'
        ? 'Instant Rebuttal / Response Illusion. Provide an in-ear trigger prompt that challenges the doubt or whispers the feeling (e.g. "When insecurity says: You are inadequate and disqualified"), followed by the scripture recitation response that delivers an immediate authoritative comeback.'
        : 'In-Ear Whisper Prompter. Provide a concise in-ear prompter lead-in cue that whispers the verse opening in the speaker\'s ear so they can recite smoothly.'
    }
Additional Context: ${customContext || 'General public speaking, personal prayer, or debate rehearsal.'}`;

    const scriptureSchema = {
      type: Type.OBJECT,
      properties: {
        emotionOrFeeling: {
          type: Type.STRING,
          description: 'The targeted emotion, feeling, or struggle.',
        },
        summaryTheme: {
          type: Type.STRING,
          description: 'A 2-4 word theme label (e.g. "Overcoming Insecurity").',
        },
        suggestedHue: {
          type: Type.STRING,
          description:
            'One of "#c58b4a", "#7e8e6f", "#6e7f95", "#b05a4e", "#8a7a9b", "#d4a359", "#599e82", "#b2738a".',
        },
        scriptures: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              reference: {
                type: Type.STRING,
                description: 'Citations such as "2 Corinthians 12:9" or "Isaiah 41:10".',
              },
              verseText: {
                type: Type.STRING,
                description: 'The full verse text in the requested translation.',
              },
              translation: {
                type: Type.STRING,
                description: 'Translation acronym (e.g. NIV, ESV).',
              },
              inEarPromptCue: {
                type: Type.STRING,
                description:
                  'The exact audio prompt fed to the in-ear monitor (the whisper cue or doubt challenge).',
              },
              reciteResponse: {
                type: Type.STRING,
                description:
                  'The exact recitation response spoken out loud on stage / in room upon hearing the cue.',
              },
              whyItCounters: {
                type: Type.STRING,
                description:
                  '1-2 sentences explaining why this dismantles this specific feeling or insecurity.',
              },
              targetPacingSeconds: {
                type: Type.INTEGER,
                description: 'Recommended split duration in seconds (typically 8 to 22).',
              },
            },
            required: [
              'reference',
              'verseText',
              'inEarPromptCue',
              'reciteResponse',
              'whyItCounters',
              'targetPacingSeconds',
            ],
          },
        },
      },
      required: ['emotionOrFeeling', 'summaryTheme', 'scriptures'],
    };

    let rawText = '{}';
    const modelsToTry = [
      'gemini-3.1-flash-lite-preview',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
    ];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction:
              'You are an expert biblical scholar, rhetorician, and speech coach for Sotto Cue, an in-ear audio prompter. Your goal is to provide accurate, impactful scripture citations that directly address human emotions, vulnerabilities, and insecurities, formatted specifically for in-ear prompt and instant oral recitation.',
            responseMimeType: 'application/json',
            responseSchema: scriptureSchema,
            temperature: 0.4,
          },
        });
        rawText = response.text || '{}';
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed or busy, trying next model:`, err.message || err);
      }
    }

    if (rawText === '{}' && lastError) {
      throw lastError;
    }

    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/gemini/scriptures:', err);
    res.status(500).json({
      error: err.message || 'Failed to source scriptures from Gemini API',
    });
  }
});

// Text-to-Speech generation using Gemini TTS (gemini-3.1-flash-tts-preview)
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'text parameter is required' });
      return;
    }

    const ai = getGeminiClient();

    // Voice options: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voice) ? voice : 'Kore';

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [
        {
          parts: [
            {
              text,
            },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find(
      (p: any) => p.inlineData?.data
    );
    const inlineData = audioPart?.inlineData;

    if (!inlineData?.data) {
      throw new Error('No audio data returned from Gemini TTS model');
    }

    const rawData = inlineData.data;
    const mimeType = inlineData.mimeType || 'audio/pcm;rate=24000';

    // If mimeType is PCM or lacks WAV header, wrap it in a standard 24kHz 16-bit Mono WAV
    if (mimeType.includes('pcm') || !mimeType.includes('wav')) {
      const pcmBuffer = Buffer.from(rawData, 'base64');
      const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);
      const wavBase64 = wavBuffer.toString('base64');

      res.json({
        audioBase64: wavBase64,
        mimeType: 'audio/wav',
        durationEstimate: pcmBuffer.length / (24000 * 2),
        voice: chosenVoice,
      });
      return;
    }

    // Already encoded audio
    res.json({
      audioBase64: rawData,
      mimeType,
      voice: chosenVoice,
    });
  } catch (err: any) {
    console.error('Error in /api/gemini/tts:', err);
    res.status(500).json({
      error: err.message || 'Failed to synthesize speech with Gemini TTS',
    });
  }
});

// AI audio transcription using Gemini (for recorded blobs or audio files)
app.post('/api/gemini/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 is required' });
      return;
    }

    const ai = getGeminiClient();
    const cleanMime = mimeType.split(';')[0].trim() || 'audio/webm';

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe this spoken audio verbatim into clean text for an in-ear prompter script. Preserve biblical citations, verses, rhetorical rebuttals, and punctuation accurately. Return ONLY the transcribed text without conversational introduction, preamble, or markdown code blocks.',
            },
          ],
        },
      ],
    });

    const transcription = response.text?.trim() || '';
    res.json({ transcription });
  } catch (err: any) {
    console.error('Error in /api/gemini/transcribe:', err);
    res.status(500).json({
      error: err.message || 'Failed to transcribe audio with Gemini AI',
    });
  }
});

// ==========================================
// Vite Middleware / Static Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sotto Cue Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
