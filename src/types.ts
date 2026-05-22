/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SynthSettings {
  filterCutoff: number;      // Hz (100 - 5000)
  filterResonance: number;   // Q-value (1 - 20)
  attack: number;            // seconds (0.01 - 1.0)
  decay: number;             // seconds (0.05 - 1.0)
  sustain: number;           // volume ratio (0.0 - 1.0)
  release: number;           // seconds (0.05 - 2.0)
  delayTime: number;         // seconds (0.0 - 1.0)
  delayFeedback: number;     // ratio (0.0 - 0.95)
  distortion: number;        // amount (0.0 - 1.0)
  reverbAmount: number;      // amount (0.0 - 1.0)
  leadInstrument?: 'saw' | 'square' | 'pad' | 'epiano' | 'triangle';
  synth2Instrument?: 'chime' | 'celesta' | 'musicbox' | 'pad' | 'epiano';
  bassInstrument?: 'triangle' | 'saw' | 'sub' | 'slap';
}

export interface SequencerPatterns {
  kick: number[];            // 16-step bin array (1 = on, 0 = off)
  snare: number[];           // 16-step bin array
  hihat: number[];           // 16-step bin array
  bass: (string | null)[];   // 16-step note array (e.g., "C3", "Eb3", null)
  lead: (string | null)[];   // 16-step note array (e.g., "C4", "G4", "Bb4", null)
  perc?: number[];           // 16-step percussion bin array
  synth2?: (string | null)[]; // 16-step second synth note array
  timeSignature?: '4/4' | '3/4' | '5/4' | '6/8';
  variationStyle?: 'progression' | 'minimal' | 'jazz' | 'chiptune' | 'cyberpunk' | 'ambient' | 'funky' | 'orchestral';
}

export type InstrumentType = 'kick' | 'snare' | 'hihat' | 'perc' | 'bass' | 'lead' | 'synth2';

export interface Preset {
  id: string;
  name: string;
  description: string;
  bpm: number;
  patterns: SequencerPatterns;
  synthSettings: SynthSettings;
  visualTheme: 'cyber' | 'cosmic' | 'sunset' | 'vaporwave' | 'emerald';
}

export interface GeneratedTrackResponse {
  bpm: number;
  themeName: string;
  moodDescription: string;
  synthSettings: SynthSettings;
  patterns: SequencerPatterns;
  visualTheme: 'cyber' | 'cosmic' | 'sunset' | 'vaporwave' | 'emerald';
}

export interface GenerationHistoryItem {
  id: string;
  prompt: string;
  timestamp: string;
  bpm: number;
  themeName: string;
}
