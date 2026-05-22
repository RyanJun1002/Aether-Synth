/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Preset } from '../types';

export const PRESETS: Preset[] = [
  {
    id: 'cyberpunk',
    name: 'Midnight Cyberpunk',
    description: 'Fast energetic synth lines, industrial saturation, and four-on-the-floor kick grids.',
    bpm: 126,
    visualTheme: 'cyber',
    synthSettings: {
      filterCutoff: 1800,
      filterResonance: 3.5,
      attack: 0.02,
      decay: 0.15,
      sustain: 0.5,
      release: 0.2,
      delayTime: 0.25,
      delayFeedback: 0.35,
      distortion: 0.45,
      reverbAmount: 0.3,
      leadInstrument: 'saw',
      synth2Instrument: 'chime',
      bassInstrument: 'saw',
    },
    patterns: {
      kick:  [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      hihat: [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
      perc:  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0], // syncopated claps
      bass:  ['C3', null, 'G3', 'C3', 'Eb3', null, 'Bb3', 'Eb3', 'G3', null, 'D4', 'G3', 'Bb3', 'F3', 'C3', 'D3'],
      lead:  ['C5', 'G4', 'Eb5', 'D5', 'C5', 'G4', 'F5', 'Eb5', 'G5', 'D5', 'Bb5', 'G5', 'Eb5', 'D5', 'C5', 'B4'],
      synth2:['G4', 'C5', 'Eb5', 'G5', 'F5', 'D5', 'G5', 'C5', 'Eb5', 'G5', 'F5', 'D5', 'G5', 'C5', 'Eb5', 'D5'] // fast arpeggiated outline
    }
  },
  {
    id: 'cosmic',
    name: 'Cosmic Drift',
    description: 'Deep spatial reverbs, low cutoff sweeps, and sparse stellar chord reflections.',
    bpm: 96,
    visualTheme: 'cosmic',
    synthSettings: {
      filterCutoff: 1100,
      filterResonance: 4.5,
      attack: 0.15,
      decay: 0.4,
      sustain: 0.8,
      release: 0.8,
      delayTime: 0.45,
      delayFeedback: 0.50,
      distortion: 0.05,
      reverbAmount: 0.75,
      leadInstrument: 'pad',
      synth2Instrument: 'celesta',
      bassInstrument: 'sub',
    },
    patterns: {
      kick:  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
      perc:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0], // ambient snap highlights
      bass:  ['F2', null, 'C3', null, 'Ab2', null, 'Eb3', null, 'Eb3', null, 'Bb2', null, 'Db3', null, 'F3', null],
      lead:  ['C5,Eb5,G5', null, 'Ab4,C5,Eb5', 'C5', 'Bb4,D5,F5', null, 'Eb5', 'C5', 'Ab4,C5,Eb5', null, 'C5,Eb5,G5', null, 'G4,Bb4,D5', 'Bb4', 'C5,Eb5,G5', null],
      synth2:['Eb5', null, 'G5', null, 'Bb5', null, 'C6', null, 'Bb5', null, 'G5', null, 'Eb5', null, 'C5', null] // starry slow chimes
    }
  },
  {
    id: 'chiptune',
    name: 'Retro Chiptune',
    description: 'Playful bright square wave-like detunes, rapid lead sweeps, and chiptune drum rhythms.',
    bpm: 135,
    visualTheme: 'emerald',
    synthSettings: {
      filterCutoff: 3200,
      filterResonance: 2.0,
      attack: 0.01,
      decay: 0.1,
      sustain: 0.4,
      release: 0.1,
      delayTime: 0.15,
      delayFeedback: 0.2,
      distortion: 0.1,
      reverbAmount: 0.15,
      leadInstrument: 'square',
      synth2Instrument: 'musicbox',
      bassInstrument: 'triangle',
    },
    patterns: {
      kick:  [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0],
      snare: [0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1],
      hihat: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      perc:  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0], // chiptune woodblock clicks
      bass:  ['C3', 'E3', 'G3', 'C4', 'A3', 'C4', 'E4', 'A3', 'F3', 'A3', 'C4', 'F4', 'G3', 'B3', 'D4', 'G4'],
      lead:  ['E5', 'G5', 'C6', 'B5', 'A5', 'F5', 'D5', 'F5', 'A5', 'C6', 'B5', 'G5', 'D5', 'F5', 'E5', 'D5'],
      synth2:['C5', 'E5', 'G5', 'A5', 'Bb5', 'G5', 'E5', 'C5', 'D5', 'F5', 'A5', 'C6', 'B5', 'G5', 'D5', 'G4'] // bouncy chimes
    }
  },
  {
    id: 'lofi',
    name: 'Sunset Lofi',
    description: 'Relaxed vinyl noise-type filters, warm envelope decay, and mellow cozy hiphop beats.',
    bpm: 88,
    visualTheme: 'sunset',
    synthSettings: {
      filterCutoff: 850,
      filterResonance: 1.5,
      attack: 0.08,
      decay: 0.35,
      sustain: 0.7,
      release: 0.4,
      delayTime: 0.3,
      delayFeedback: 0.4,
      distortion: 0.15,
      reverbAmount: 0.5,
      leadInstrument: 'epiano',
      synth2Instrument: 'epiano',
      bassInstrument: 'triangle',
    },
    patterns: {
      kick:  [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
      perc:  [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0], // relaxed rim snaps
      bass:  ['C3', null, 'G3', null, 'A2', null, 'E3', null, 'F2', null, 'C3', null, 'G2', null, 'D3', null],
      lead:  ['E4,G4,B4', 'G4', 'B4', 'C5', 'A4,C5,E5', null, 'G4', 'E4', 'F4,A4,C5', 'A4', 'C5', 'E5', 'D5,F5,A5', null, 'C5', 'B4'],
      synth2:[null, 'B4', 'C5', 'E5', null, 'A4', 'C5', 'F5', null, 'G4', 'B4', 'D5', null, 'E4', 'G4', 'C5'] // warm decorative plucks
    }
  }
];
