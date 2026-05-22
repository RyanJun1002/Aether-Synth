/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Initialize Gemini Client
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not defined. AI music generation features will fallback to client-side smart procedural presets.");
  }

  // --- API ROUTE FOR MUSIC GENERATION ---

  app.post('/api/music/generate', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required and must be a string.' });
      }

      if (!ai) {
        return res.status(503).json({
          error: 'Gemini API utility is not configured. (Please configure your GEMINI_API_KEY in the Secrets panel)',
          isFallback: true
        });
      }

      // Design Prompt
      const systemInstruction = 
        `You are AetherSynth, a state-of-the-art modular synthesizer, AI sound designer, and drum machine sequencer.
        Your task is to translate the user’s creative text prompt into a cohesive modular step sequence, drum patterns, and envelope settings.
        
        Generate a highly musical, professional-sounding 16-step arrangement. Retain excellent musicality and variation using the following directives:
          1. **Drum Patterns with Groove**:
             - Do NOT make patterns flat or boring. Create syncopated rhythm loops.
             - Kick: Essential beats (like 1, 5, 9, 13 for techno/cyberpunk) but add swing or off-beat triggers (e.g. step 11 or 15) for double kicks where appropriate.
             - Snare: Typical backbeats on 5 and 13. Add occasional ghost snares or double-taps on step 11, 15, or 16 for a dynamic transition roll.
             - Hi-hat: Populate active offbeats (steps 3, 7, 11, 15) to inject bounce, roll, and drive into the beat.
             - Percussion/Clap (perc): Trigger claps on syncopated steps (e.g., step 5, 13 or on offbeat eighth-steps like 4, 8, 12, 14) for polyrhythms and backbeat layering.
          2. **Melodic Phrasing (Call-and-Response)**:
             - Avoid repetitive single notes or monotonic lines.
             - Create structured "Question & Answer" melodies (e.g., first 8 steps ascend or create active tension, last 8 steps descend or resolve to a stable root chord node).
             - Mix up-beat and down-beat notes. Use a variety of intervals (seconds, thirds, fifths, octaves) rather than flat scalar lines.
          3. **Harmonic Coordination & Groovy Basslines**:
             - Bass, Lead, and Synth 2 must belong to the same musical key/scale (e.g., C minor pentatonic: C, Eb, F, G, Bb; or A minor: A, B, C, D, E, F, G).
             - Bass should have a distinct galloping, syncopated rhythm. Keep it clean and tight.
             - Lead Synth (Harmony Supportive): If the user wants chords, harmonies, background pads, or a rich lofi sound, you MUST represent multi-note chords on single steps by separating note strings with commas (e.g., "C5,Eb5,G5" or "F4,A4,C5" or "E4,G4,B4"). Otherwise, use single notes. Keep it cohesive.
             - Synth 2 Pluck/Bell (synth2): High register melodic chimes, counterpoints, or arpeggiations. Fill gaps in lead melodies or play overlapping counterpoint notes ('C4' to 'B6', or chords like "G5,B5,D6").
          4. **16-Step Schema compliance && Meter / Variation Selection**:
             - Choose an appropriate 'timeSignature' ("4/4", "3/4", "5/4", "6/8") and 'variationStyle' ("progression", "minimal", "jazz", "chiptune", "cyberpunk", "ambient", "funky", "orchestral") matching the vibe. Populate exactly 16 elements in arrays regardless of the meter length (fill unused tails with 0s or nulls).
             - Return exactly 16 values for each instrument:
               * kick, snare, hihat, perc: 16 integers (1 = trigger, 0 = rest).
               * bass: 16 strings representing notes ('C2' to 'B3') or "null" string.
               * lead: 16 strings representing notes ('C4' to 'A5', or comma-separated chords) or "null" string.
               * synth2: 16 strings representing notes ('C4' to 'B6', or comma-separated chords) or "null" string.

        Align the music patterns with the user's prompt:
          - If the user asks for slow/chill/ambient: BPM should be 80-110, low filterCutoff, long release, cozy sparse leads.
          - If the user asks for fast/techno/cyberpunk: BPM should be 128-142, four-on-the-floor kick, driving hi-hats, minor chord progressions (C, Eb, G), aggressive distortion.
          - If the user asks for chiptune: high BPM (130-145), fast arpeggiated bright leads, playful and cute drum bounces.`;

      // Prompt template including the user's wish
      const userMessage = `Create an absolute masterpiece sequence inspired by: "${prompt}". Please structure your outputs exactly to fit the requested schema. Make sure drum slots and note slots contain exactly 16 elements.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bpm: {
                type: Type.INTEGER,
                description: 'BPM between 80 and 145.'
              },
              themeName: {
                type: Type.STRING,
                description: 'Cool stylized title for this musical vibe.'
              },
              moodDescription: {
                type: Type.STRING,
                description: 'Poetic description of the sonic aesthetic.'
              },
              synthSettings: {
                type: Type.OBJECT,
                properties: {
                  filterCutoff: { type: Type.INTEGER, description: 'Hz between 200 and 4000.' },
                  filterResonance: { type: Type.INTEGER, description: 'Resonance Q factor between 1 and 15.' },
                  attack: { type: Type.NUMBER, description: 'Attack speed (0.01 to 0.4 seconds).' },
                  decay: { type: Type.NUMBER, description: 'Decay length (0.05 to 0.8 seconds).' },
                  sustain: { type: Type.NUMBER, description: 'Sustain level ratio (0.1 to 1.0).' },
                  release: { type: Type.NUMBER, description: 'Release length (0.05 to 1.2 seconds).' },
                  delayTime: { type: Type.NUMBER, description: 'Delay echo spacing (0.0 to 0.8 seconds).' },
                  delayFeedback: { type: Type.NUMBER, description: 'Feedback loop multiplier (0.0 to 0.75).' },
                  distortion: { type: Type.NUMBER, description: 'Tube fuzz saturation ratio (0.0 to 0.8).' },
                  reverbAmount: { type: Type.NUMBER, description: 'Stereo space size factor (0.0 to 0.95).' },
                  leadInstrument: { type: Type.STRING, description: 'Select fitting lead timbre: saw, square, pad, epiano, triangle.' },
                  synth2Instrument: { type: Type.STRING, description: 'Select fitting secondary pluck/bell: chime, celesta, musicbox, pad, epiano.' },
                  bassInstrument: { type: Type.STRING, description: 'Select fitting sub/bass: triangle, saw, sub, slap.' }
                },
                required: [
                  'filterCutoff', 'filterResonance', 'attack', 'decay', 'sustain', 'release',
                  'delayTime', 'delayFeedback', 'distortion', 'reverbAmount'
                ]
              },
              patterns: {
                type: Type.OBJECT,
                properties: {
                  kick: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: 'Exactly 16 elements representing drum steps (1 or 0).'
                  },
                  snare: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: 'Exactly 16 elements representing snare steps (1 or 0).'
                  },
                  hihat: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: 'Exactly 16 elements representing hi-hat steps (1 or 0).'
                  },
                  perc: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: 'Exactly 16 elements representing percussion or clap steps (1 or 0).'
                  },
                  bass: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Exactly 16 elements. Use notes or "null" string.'
                  },
                  lead: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Exactly 16 elements. Use notes or chord strings or "null" string.'
                  },
                  synth2: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Exactly 16 elements representing crystal bells or plucks. Use high notes from C5 to G6 or "null" string.'
                  },
                  timeSignature: {
                    type: Type.STRING,
                    description: 'Select appropriate meter representing the prompt. Must be one of: "4/4", "3/4", "5/4", "6/8". Default is "4/4".'
                  },
                  variationStyle: {
                    type: Type.STRING,
                    description: 'Select fitting real-time improvisation variation style. Must be one of: "progression", "minimal", "jazz", "chiptune", "cyberpunk", "ambient", "funky", "orchestral". Default is "progression".'
                  }
                },
                required: ['kick', 'snare', 'hihat', 'perc', 'bass', 'lead', 'synth2', 'timeSignature', 'variationStyle']
              },
              visualTheme: {
                type: Type.STRING,
                description: 'Must match one of: cyber, cosmic, sunset, vaporwave, emerald'
              }
            },
            required: ['bpm', 'themeName', 'moodDescription', 'synthSettings', 'patterns', 'visualTheme']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('No text payload received from Gemini.');
      }

      // Parse and scrub responses (converting "null" or invalid note strings back to JS null)
      const parsedData = JSON.parse(responseText.trim());

      // Safely clamp arrays to length 16 and parse "null" strings
      const cleanupStepArray = (arr: any[] | undefined, defaultVal: any = 0): any[] => {
        const clean = Array.isArray(arr) ? arr.slice(0, 16) : [];
        while (clean.length < 16) {
          clean.push(defaultVal);
        }
        return clean;
      };

      const cleanupNoteArray = (arr: any[] | undefined): (string | null)[] => {
        const clean = Array.isArray(arr) ? arr.slice(0, 16) : [];
        while (clean.length < 16) {
          clean.push(null);
        }
        return clean.map(item => {
          if (!item || item === 'null' || item === 'REST' || item === 'OFF' || item === '-') {
            return null;
          }
          return String(item).trim();
        });
      };

      const finalResponse = {
        bpm: Math.min(200, Math.max(60, Number(parsedData.bpm) || 120)),
        themeName: parsedData.themeName || 'Nova Pulsar',
        moodDescription: parsedData.moodDescription || 'Deep interstellar harmonics synthesized on standard matrix frequencies.',
        synthSettings: {
          filterCutoff: Math.min(6000, Math.max(80, Number(parsedData.synthSettings?.filterCutoff) || 1200)),
          filterResonance: Math.min(30, Math.max(1, Number(parsedData.synthSettings?.filterResonance) || 4)),
          attack: Math.min(1.5, Math.max(0.005, Number(parsedData.synthSettings?.attack) || 0.05)),
          decay: Math.min(2.0, Math.max(0.05, Number(parsedData.synthSettings?.decay) || 0.2)),
          sustain: Math.min(1.0, Math.max(0.0, Number(parsedData.synthSettings?.sustain) || 0.6)),
          release: Math.min(3.0, Math.max(0.05, Number(parsedData.synthSettings?.release) || 0.3)),
          delayTime: Math.min(1.0, Math.max(0.0, Number(parsedData.synthSettings?.delayTime) || 0.25)),
          delayFeedback: Math.min(0.95, Math.max(0.0, Number(parsedData.synthSettings?.delayFeedback) || 0.3)),
          distortion: Math.min(1.0, Math.max(0.0, Number(parsedData.synthSettings?.distortion) || 0.1)),
          reverbAmount: Math.min(1.0, Math.max(0.0, Number(parsedData.synthSettings?.reverbAmount) || 0.25)),
          leadInstrument: ['saw', 'square', 'pad', 'epiano', 'triangle'].includes(parsedData.synthSettings?.leadInstrument)
            ? parsedData.synthSettings.leadInstrument
            : 'saw',
          synth2Instrument: ['chime', 'celesta', 'musicbox', 'pad', 'epiano'].includes(parsedData.synthSettings?.synth2Instrument)
            ? parsedData.synthSettings.synth2Instrument
            : 'chime',
          bassInstrument: ['triangle', 'saw', 'sub', 'slap'].includes(parsedData.synthSettings?.bassInstrument)
            ? parsedData.synthSettings.bassInstrument
            : 'triangle'
        },
        patterns: {
          kick: cleanupStepArray(parsedData.patterns?.kick, 0).map(v => v ? 1 : 0),
          snare: cleanupStepArray(parsedData.patterns?.snare, 0).map(v => v ? 1 : 0),
          hihat: cleanupStepArray(parsedData.patterns?.hihat, 0).map(v => v ? 1 : 0),
          perc: cleanupStepArray(parsedData.patterns?.perc, 0).map(v => v ? 1 : 0),
          bass: cleanupNoteArray(parsedData.patterns?.bass),
          lead: cleanupNoteArray(parsedData.patterns?.lead),
          synth2: cleanupNoteArray(parsedData.patterns?.synth2),
          timeSignature: ['4/4', '3/4', '5/4', '6/8'].includes(parsedData.patterns?.timeSignature)
            ? parsedData.patterns.timeSignature
            : '4/4',
          variationStyle: ['progression', 'minimal', 'jazz', 'chiptune', 'cyberpunk', 'ambient', 'funky', 'orchestral'].includes(parsedData.patterns?.variationStyle)
            ? parsedData.patterns.variationStyle
            : 'progression'
        },
        visualTheme: ['cyber', 'cosmic', 'sunset', 'vaporwave', 'emerald'].includes(parsedData.visualTheme)
          ? parsedData.visualTheme
          : 'cyber'
      };

      res.json(finalResponse);
    } catch (error: any) {
      console.error('Gemini composition failed:', error);
      res.status(500).json({ error: error.message || 'Error occurred while querying Gemini Studio API.' });
    }
  });

  // --- DEV & PRODUCTION BUILD STATIC VITE ROUTING ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA fallback route
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AetherSynth Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
