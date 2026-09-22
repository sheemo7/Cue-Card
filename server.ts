import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

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
// Fundamental base: King James Version (KJV) + Easy-to-understand modern study breakdown
app.post('/api/gemini/scriptures', async (req, res) => {
  try {
    const {
      emotionOrFeeling,
      translation = 'KJV',
      drillMode = 'instant_rebuttal',
      customContext = '',
    } = req.body;

    if (!emotionOrFeeling || typeof emotionOrFeeling !== 'string') {
      res.status(400).json({ error: 'emotionOrFeeling parameter is required' });
      return;
    }

    const ai = getGeminiClient();

    const prompt = `Source 3 to 5 powerful scripture passages specifically targeting the emotion, feeling, or struggle: "${emotionOrFeeling}".
Fundamental Base: King James Version (KJV) text must be exact, unaltered, and authentic.
Translation setting: ${translation || 'KJV'}. If KJV is requested, provide the authentic KJV text and provide an authentic, modern-era study breakdown that explains the verse in plain, palatable, easy-to-understand language for contemporary listeners without departing from KJV authenticity.
Rehearsal Drill Mode: ${
      drillMode === 'instant_rebuttal'
        ? 'Instant Rebuttal / Response Illusion. Provide an in-ear trigger prompt that challenges the doubt or whispers the feeling (e.g. "When insecurity whispers: You are inadequate and disqualified"), followed by the scripture recitation response that delivers an immediate authoritative comeback.'
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
                description: 'The authentic verse text (King James Version KJV by default).',
              },
              translation: {
                type: Type.STRING,
                description: 'Translation acronym ("KJV" or requested).',
              },
              modernBreakdown: {
                type: Type.STRING,
                description:
                  'A palatable, easy-to-understand modern-era study breakdown of the scriptures that clearly explains the verse meaning without altering anything from the authenticity of the fundamental KJV version.',
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
              'modernBreakdown',
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

    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite-preview',
    ];
    let rawText = '{}';
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction:
              'You are an expert biblical scholar, rhetorician, and speech coach for Sotto Cue. Your fundamental knowledge base is the King James Version (KJV). You maintain strict fidelity to the scripture while providing modern study breakdowns that make the text digestible and powerful for contemporary speakers and listeners.',
            responseMimeType: 'application/json',
            responseSchema: scriptureSchema,
            temperature: 0.3,
          },
        });
        rawText = response.text || '{}';
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed, trying next:`, err.message || err);
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

// AI audio transcription using Gemini 3.5 Transcribe
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
      model: 'gemini-3.5-transcribe',
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
              text: 'Transcribe this spoken audio verbatim into clean text for an in-ear prompter script. Preserve biblical citations, King James Version verses, rhetorical rebuttals, and punctuation accurately. Return ONLY the transcribed text without conversational introduction, preamble, or markdown code blocks.',
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
      error: err.message || 'Failed to transcribe audio with Gemini 3.5 Transcribe',
    });
  }
});

// Voice Assistant endpoint: handles phone hands-free listening, deck switching, playback, and live KJV theological conversation
app.post('/api/gemini/voice-assistant', async (req, res) => {
  try {
    const {
      speechInput,
      availableDecks = [],
      currentDeckName = '',
      cues = [],
      conversationHistory = [],
      voice = 'Kore',
      enableSearchGrounding = true,
    } = req.body;

    if (!speechInput || typeof speechInput !== 'string') {
      res.status(400).json({ error: 'speechInput parameter is required' });
      return;
    }

    const ai = getGeminiClient();

    const cueNames = Array.isArray(cues)
      ? cues.map((c: any) => c.name).join(', ')
      : '';
    const deckList = Array.isArray(availableDecks)
      ? availableDecks.join('", "')
      : '';

    const systemPrompt = `You are "Sotto Ear", an ultra-responsive, intelligent in-ear audio assistant and rehearsal prompter running on the user's phone.
The user has picked up their phone, activated listening mode, and spoken to you.

AVAILABLE CONTEXT:
- Currently active soundboard deck: "${currentDeckName || 'Untitled Deck'}"
- Available decks on device: ["${deckList}"]
- Cues currently loaded in this deck: [${cueNames || 'None'}]

USER'S THEOLOGICAL & SCRIPTURAL STANDARD:
- The fundamental standard and base is the King James Version (KJV).
- You provide superior, doctrinally authentic knowledge of scriptures.
- When explaining or breaking down scriptures, provide an easy-to-understand, modern-era study breakdown that is palatable and plain without altering any authenticity from the fundamental KJV base.

YOUR TASK:
Determine what the user wants and respond accordingly. Output valid JSON adhering to the schema.
Actions:
1. "switch_deck": If the user says something like "bring up the Keynote deck", "switch to Scripture deck", "open Pitch deck", identify which deck from availableDecks best matches, set action="switch_deck" and targetDeck=bestMatch.
2. "control_playback": If the user asks to "play cue 1", "next", "stop", "pause", "start over", or "play [cue name]".
3. "lookup_scripture": If the user asks for scriptures or rebuttals for an emotion, struggle, or topic (e.g. "find a scripture for anxiety", "what does KJV say about fear").
4. "conversation": If the user is having a live spoken dialogue with you (scripture study, rhetorical advice, debate preparation, or keynote guidance).

Keep spokenResponse concise (1 to 3 spoken sentences, natural for in-ear audio listening).`;

    const assistantSchema = {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description:
            'One of: "switch_deck", "control_playback", "lookup_scripture", "conversation".',
        },
        targetDeck: {
          type: Type.STRING,
          description:
            'The exact name of the deck to switch to if action is switch_deck, else empty.',
        },
        playbackCommand: {
          type: Type.STRING,
          description:
            'One of: "play", "pause", "next", "previous", "stop", or empty.',
        },
        targetCueName: {
          type: Type.STRING,
          description:
            'The name or index of the cue to play if controlling playback, else empty.',
        },
        spokenResponse: {
          type: Type.STRING,
          description:
            'Concise natural conversational text spoken back directly into the user\'s ear (1-3 sentences).',
        },
        displayResponse: {
          type: Type.STRING,
          description:
            'Detailed explanatory text for on-screen display, including KJV citations and modern study breakdown if relevant.',
        },
        detectedTopicOrEmotion: {
          type: Type.STRING,
          description:
            'The detected topic or emotion if looking up scriptures (e.g. "Anxiety", "Boldness"), else empty.',
        },
      },
      required: ['action', 'spokenResponse', 'displayResponse'],
    };

    const conversationContext = conversationHistory
      .slice(-4)
      .map((h: any) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
      .join('\n');

    const prompt = `${conversationContext ? `Recent conversation:\n${conversationContext}\n\n` : ''}User just said: "${speechInput}"`;

    let response: any = null;
    let parsed: any = null;
    const groundingSources: Array<{ title: string; uri: string }> = [];
    const searchQueries: string[] = [];

    // Use gemini-3.8-flash with Google Search grounding
    if (enableSearchGrounding) {
      try {
        const searchPrompt = `${prompt}\n\nPlease respond with a JSON object: {"action":"none"|"switch_deck"|"control_playback","targetDeck":"","playbackCommand":"","targetCueName":"","spokenResponse":"...","displayResponse":"...","detectedTopicOrEmotion":""}`;
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: searchPrompt,
          config: {
            systemInstruction:
              systemPrompt +
              '\nIMPORTANT: Return ONLY a valid JSON object matching the requested fields without markdown enclosing or additional text.',
            temperature: 0.3,
            tools: [{ googleSearch: {} }],
          },
        });
        const cleanText = (response.text || '')
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
          .trim();
        parsed = JSON.parse(cleanText);
      } catch (groundingErr) {
        console.warn('Grounded query fallback:', groundingErr);
      }
    }

    if (!parsed || !parsed.spokenResponse) {
      const modelsToTry = [
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite-preview',
      ];
      for (const m of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: m,
            contents: prompt,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: assistantSchema,
              temperature: 0.3,
            },
          });
          parsed = JSON.parse(response.text || '{}');
          if (parsed && parsed.spokenResponse) {
            break;
          }
        } catch (mErr) {
          console.warn(`Model ${m} failed in voice assistant fallback:`, mErr);
        }
      }
    }

    if (!parsed || !parsed.spokenResponse) {
      parsed = {
        action: 'none',
        spokenResponse:
          'I am here and listening. How can I assist with your speech deck or King James scriptures today?',
        displayResponse:
          'Sotto Assistant is ready. You can ask to switch decks or study King James scriptures.',
      };
    }

    // Extract Google Search grounding metadata if present
    const candidate = response?.candidates?.[0];
    const chunks = candidate?.groundingMetadata?.groundingChunks || [];
    const queries = candidate?.groundingMetadata?.webSearchQueries || [];
    chunks.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        groundingSources.push({
          title: chunk.web.title || 'Web Grounding Reference',
          uri: chunk.web.uri,
        });
      }
    });
    searchQueries.push(...queries);

    // Generate voice speech using Gemini TTS so the assistant talks back out loud through the phone
    let audioBase64 = '';
    try {
      const textToSpeak = parsed.spokenResponse || 'Understood.';
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: textToSpeak }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
            },
          },
        },
      });

      const audioPart = ttsResponse.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData?.data
      );
      if (audioPart?.inlineData?.data) {
        const pcmBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
        const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);
        audioBase64 = wavBuffer.toString('base64');
      }
    } catch (ttsErr) {
      console.warn('TTS synthesis in voice-assistant fell back:', ttsErr);
    }

    res.json({
      ...parsed,
      audioBase64,
      mimeType: audioBase64 ? 'audio/wav' : null,
      grounding: {
        isGrounded: groundingSources.length > 0 || searchQueries.length > 0,
        searchQueries,
        sources: groundingSources,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/gemini/voice-assistant:', err);
    res.status(500).json({
      error: err.message || 'Failed to process voice assistant query',
    });
  }
});

// ==========================================
// Vite Middleware / Static Serving & WebSocket Server
// ==========================================
async function startServer() {
  const httpServer = http.createServer(app);

  // Real-time live audio interaction using gemini-3.8-live
  const wss = new WebSocketServer({ server: httpServer, path: '/api/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('Gemini Live WebSocket client connected');
    let session: any = null;

    try {
      const ai = getGeminiClient();
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
          systemInstruction: `You are Sotto Ear Live, a fast, intelligent, spoken in-ear audio prompter and conversation partner on the user's phone.
USER KNOWLEDGE STANDARD:
- Fundamental biblical base: King James Version (KJV). Maintain authentic citations.
- Modern breakdowns: When discussing or citing scriptures, explain them plainly in palatable modern terms without diverging from KJV authenticity.
- Keep spoken answers brief, natural, conversational, and direct (1-3 sentences) suitable for an in-ear monitor.`,
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (audio && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ audio, text }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.close();
            }
          },
          onerror: (err: any) => {
            console.warn('Gemini Live session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({ error: err.message || 'Gemini Live session error' })
              );
            }
          },
        },
      });

      clientWs.on('message', (data: any) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.audio) {
            session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (msg.text) {
            session.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: msg.text }] }],
              turnComplete: true,
            });
          }
        } catch (err) {
          console.error('Error handling message from client in Live WS:', err);
        }
      });

      clientWs.on('close', () => {
        try {
          if (session) session.close();
        } catch (_) {}
      });
    } catch (err: any) {
      console.error('Failed to initiate Gemini Live session:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            error: err.message || 'Could not connect to gemini-3.8-live Live API',
          })
        );
        clientWs.close();
      }
    }
  });

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

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Sotto Cue Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
