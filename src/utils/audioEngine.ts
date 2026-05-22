/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SynthSettings, SequencerPatterns } from '../types';

const NOTE_FREQS: Record<string, number> = {
  // Octave 2
  "C2": 65.41, "C#2": 69.30, "D2": 73.42, "D#2": 77.78, "E2": 82.41, "F2": 87.31, "F#2": 92.50, "G2": 98.00, "G#2": 103.83, "A2": 110.00, "A#2": 116.54, "B2": 123.47,
  // Octave 3
  "C3": 130.81, "C#3": 138.59, "D3": 146.83, "D#3": 155.56, "E3": 164.81, "F3": 174.61, "F#3": 185.00, "G3": 196.00, "G#3": 207.65, "A3": 220.00, "A#3": 233.08, "B3": 246.94,
  // Octave 4
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
  // Octave 5
  "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, "E5": 659.25, "F5": 698.46, "F#5": 739.99, "G5": 783.99, "G#5": 830.61, "A5": 880.00, "A#5": 932.33, "B5": 987.77,
};

export class AudioEngine {
  public ctx: AudioContext | null = null;
  private isPlaying = false;
  private bpm = 120;
  
  // Patterns & Synth Parameters
  private patterns: SequencerPatterns | null = null;
  private settings: SynthSettings | null = null;

  // Real-time parameters
  private variationEnabled = true;

  // Audio Nodes Path Components
  private masterVolume: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Cache to prevent waveshaper curve reassign pops
  private lastDistortionAmount = -1;

  // Scheduler Clock Variables
  private nextNoteTime = 0.0;
  private currentStep = 0;
  private stepsPerLoop = 16;
  private lookaheadMs = 25.0;
  private scheduleAheadTime = 0.1;
  private clockIntervalId: number | null = null;
  
  // Bar Counter for arranging and improvisations
  private barCount = 0;

  // UI Step update Callback
  private onStepCallback: ((step: number) => void) | null = null;

  // Active voice choking systems to prevent overlapping clashing notes
  private lastLeadVoices: { gainNode: GainNode; time: number }[] = [];
  private lastSynth2Voices: { gainNode: GainNode; time: number }[] = [];
  private lastBassVoices: { gainNode: GainNode; time: number }[] = [];

  constructor() {
    // Lazy initialized on play
  }

  public init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Create Nodes
    this.masterVolume = this.ctx.createGain();
    this.masterVolume.gain.value = 0.40; // Safely calibrated global volume level

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 1000;
    this.filterNode.Q.value = 1.0;

    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.value = 0.3;

    this.delayFeedbackNode = this.ctx.createGain();
    this.delayFeedbackNode.gain.value = 0.2; // Warm echo tail

    this.distortionNode = this.ctx.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(0);
    this.distortionNode.oversample = '4x';

    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 256;

    // Dynamics Compressor as brickwall limiter to keep everything clean and prevent artifacts
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -16;
    this.masterCompressor.knee.value = 12;
    this.masterCompressor.ratio.value = 10.0;
    this.masterCompressor.attack.value = 0.003; // rapid attack blocks spikes
    this.masterCompressor.release.value = 0.150; 
    
    // Connect Filter to Distortion Tube Saturation
    this.filterNode.connect(this.distortionNode);
    
    // Connect Distortion to Analyser (dry path) & Delay Node (wet path)
    this.distortionNode.connect(this.analyserNode);
    this.distortionNode.connect(this.delayNode);

    // Feedback Delay Loop
    this.delayNode.connect(this.delayFeedbackNode);
    this.delayFeedbackNode.connect(this.delayNode);
    this.delayFeedbackNode.connect(this.analyserNode); 

    // Route Analyser through safe dynamic compressor limiter
    this.analyserNode.connect(this.masterCompressor);

    // Dynamic compressor connected to Master Volume gain
    this.masterCompressor.connect(this.masterVolume);

    // Connect Master Volume to speakers
    this.masterVolume.connect(this.ctx.destination);

    // Generate White Noise Buffer
    this.generateNoiseBuffer(this.ctx);
  }

  private generateNoiseBuffer(context: BaseAudioContext) {
    const bufferSize = context.sampleRate * 2;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount * 40 : 20; 
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // Soft saturation logic prevents physical digital crackles
      curve[i] = ((3 + k) * x * 1.2 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  public start(
    bpm: number, 
    patterns: SequencerPatterns, 
    settings: SynthSettings,
    onStep: (step: number) => void
  ) {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isPlaying) return;

    this.bpm = bpm;
    this.patterns = patterns;
    this.stepsPerLoop = this.getStepsPerLoopValue(patterns.timeSignature);
    this.settings = settings;
    this.onStepCallback = onStep;
    
    // Apply Settings to current Nodes
    this.applySynthSettings();

    this.isPlaying = true;
    this.barCount = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    
    // Start scheduler tick loop
    this.clockIntervalId = window.setInterval(() => {
      this.schedulerTick();
    }, this.lookaheadMs);
  }

  public stop() {
    this.isPlaying = false;
    if (this.clockIntervalId) {
      window.clearInterval(this.clockIntervalId);
      this.clockIntervalId = null;
    }
    this.currentStep = 0;
    this.lastLeadVoices = [];
    this.lastSynth2Voices = [];
    this.lastBassVoices = [];
  }

  public updateBPM(bpm: number) {
    this.bpm = bpm;
  }

  public setVolume(volume: number) {
    if (this.masterVolume) {
      this.masterVolume.gain.value = volume * 0.45;
    }
  }

  public setVariationEnabled(enabled: boolean) {
    this.variationEnabled = enabled;
  }

  public isVariationEnabled(): boolean {
    return this.variationEnabled;
  }

  private getStepsPerLoopValue(timeSignature?: string): number {
    switch (timeSignature) {
      case '3/4': return 12;
      case '5/4': return 10;
      case '6/8': return 12;
      case '4/4':
      default:
        return 16;
    }
  }

  public updatePatterns(patterns: SequencerPatterns) {
    this.patterns = patterns;
    this.stepsPerLoop = this.getStepsPerLoopValue(patterns.timeSignature);
    if (this.currentStep >= this.stepsPerLoop) {
      this.currentStep = 0;
    }
  }

  public updateSettings(settings: SynthSettings) {
    this.settings = settings;
    this.applySynthSettings();
  }

  private applySynthSettings() {
    if (!this.settings || !this.filterNode || !this.delayNode || !this.delayFeedbackNode || !this.distortionNode) return;

    const t = this.ctx ? this.ctx.currentTime : 0;
    
    this.filterNode.frequency.setValueAtTime(this.settings.filterCutoff, t);
    this.filterNode.Q.setValueAtTime(this.settings.filterResonance, t);

    this.delayNode.delayTime.setValueAtTime(this.settings.delayTime, t);
    this.delayFeedbackNode.gain.setValueAtTime(this.settings.delayFeedback * 0.7, t);

    if (this.settings.distortion !== this.lastDistortionAmount) {
      this.distortionNode.curve = this.makeDistortionCurve(this.settings.distortion);
      this.lastDistortionAmount = this.settings.distortion;
    }
  }

  private schedulerTick() {
    if (!this.ctx) return;
    
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      // Dynamic Jazz Shuffle/Swing: delay odd eighth/sixteenth beats slightly
      let scheduleTime = this.nextNoteTime;
      const varStyle = this.patterns?.variationStyle || 'progression';
      if (this.variationEnabled && varStyle === 'jazz' && (this.currentStep % 2 === 1)) {
        const stepIntervalSeconds = 60.0 / this.bpm / 4.0;
        scheduleTime += stepIntervalSeconds * 0.16;
      }

      this.scheduleStep(this.currentStep, scheduleTime, this.ctx, this.analyserNode || this.ctx.destination, this.filterNode || this.ctx.destination);
      
      const stepIntervalSeconds = 60.0 / this.bpm / 4.0; 
      this.nextNoteTime += stepIntervalSeconds;
      
      const prevStep = this.currentStep;
      this.currentStep = (this.currentStep + 1) % this.stepsPerLoop;
      
      if (this.currentStep === 0) {
        this.barCount++;
      }

      if (this.onStepCallback) {
        const stepTriggered = prevStep;
        setTimeout(() => {
          if (this.onStepCallback && this.isPlaying) {
            this.onStepCallback(stepTriggered);
          }
        }, 0);
      }
    }
  }

  private transposeNoteName(noteName: string, semitones: number): string {
    const scale = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    // Support chords by splitting with commas
    if (noteName.includes(',')) {
      return noteName.split(',').map(n => this.transposeNoteName(n.trim(), semitones)).join(',');
    }
    const match = noteName.match(/^([A-G]#?)(\d)$/);
    if (!match) return noteName;
    const [_, pitch, octaveStr] = match;
    let octave = parseInt(octaveStr, 10);
    let pitchIdx = scale.indexOf(pitch);
    if (pitchIdx === -1) return noteName;
    
    pitchIdx += semitones;
    while (pitchIdx >= 12) {
      pitchIdx -= 12;
      octave += 1;
    }
    while (pitchIdx < 0) {
      pitchIdx += 12;
      octave -= 1;
    }
    const nextNote = `${scale[pitchIdx]}${octave}`;
    return NOTE_FREQS[nextNote] ? nextNote : noteName; // return fallback if out of bounds
  }

  private scheduleStep(
    step: number, 
    time: number, 
    context: BaseAudioContext, 
    outputNode: AudioNode,
    filterOutputNode: AudioNode
  ) {
    if (!this.patterns || !this.settings) return;

    const varStyle = this.patterns.variationStyle || 'progression';
    const isEighthBar = (this.barCount % 8 === 7);
    const isFourthBar = (this.barCount % 4 === 3);

    // 1. Dynamic Chord Progression Shift (Melody & Bass transposition) and Drops based on Selected Variation Style!
    let transposeSemitones = 0;
    let isDropSection = false;

    if (this.variationEnabled) {
      if (varStyle === 'progression') {
        // Original Majestic Modulations: Shift keys to make the music majestically elevate and resolve!
        const barCycle = this.barCount % 16;
        if (barCycle >= 4 && barCycle < 8) {
          transposeSemitones = 3;   // Transpose up a minor third (original custom shift)
        } else if (barCycle >= 8 && barCycle < 12) {
          transposeSemitones = 7;   // Transpose up a perfect fifth (original custom shift)
        } else if (barCycle >= 12 && barCycle < 16) {
          transposeSemitones = -2;  // Transpose down a whole step (original custom shift)
        }

        // Standard drop half-way through the 8th bar of the phrase to create beautiful suspense
        const halfStep = Math.floor(this.stepsPerLoop / 2);
        if (this.barCount % 8 === 7 && step >= halfStep) {
          isDropSection = true;
        }
      } 
      else if (varStyle === 'minimal') {
        // Minimal Techno style (subtle 3rd lift or whole tone drop)
        const barCycle = this.barCount % 16;
        if (barCycle >= 8 && barCycle < 12) {
          transposeSemitones = 3;   // Subtle lift (Minor 3rd)
        } else if (barCycle >= 12 && barCycle < 16) {
          transposeSemitones = -2;  // Dark shift down (Whole tone)
        }

        // Aggressive loop drop: on every 4th bar, mute kick and snare on the last 4 steps
        if (isFourthBar && step >= (this.stepsPerLoop - 4)) {
          isDropSection = true;
        }

        // Active high-pass sweep during drop
        if (isDropSection && this.settings && this.filterNode) {
          const t = context.currentTime;
          this.filterNode.frequency.setValueAtTime(this.settings.filterCutoff * 2.2, t);
        }
      } 
      else if (varStyle === 'jazz') {
        // Jazz progression: ii-V-I equivalents (I, ii, V, I offsets)
        const barCycle = this.barCount % 16;
        if (barCycle >= 4 && barCycle < 8) {
          transposeSemitones = 2;   // ii chord
        } else if (barCycle >= 8 && barCycle < 12) {
          transposeSemitones = 5;   // IV / V variant
        } else if (barCycle >= 12 && barCycle < 16) {
          transposeSemitones = 7;   // V chord
        }

        // Organic syncopation muting: occasionally mute a transient step for dynamic rest
        if (step % 4 === 3 && Math.random() < 0.15) {
          isDropSection = true; 
        }
      } 
      else if (varStyle === 'chiptune') {
        // Chiptune rapid octave transformations
        const barCycle = this.barCount % 16;
        if (barCycle >= 4 && barCycle < 8) {
          transposeSemitones = 12;  // Up 1 Octave!
        } else if (barCycle >= 8 && barCycle < 12) {
          transposeSemitones = 7;   // Up a fifth
        } else if (barCycle >= 12 && barCycle < 16) {
          transposeSemitones = 19;  // Melodic fifth and octave hike!
        }

        // Standard 8th bar half break
        const halfStep = Math.floor(this.stepsPerLoop / 2);
        if (this.barCount % 8 === 7 && step >= halfStep) {
          isDropSection = true;
        }
      }
      else if (varStyle === 'cyberpunk') {
        const barCycle = this.barCount % 16;
        if (barCycle >= 4 && barCycle < 8) {
          transposeSemitones = -1;  // Dark shift down a minor second
        } else if (barCycle >= 8 && barCycle < 12) {
          transposeSemitones = 5;   // Up perfect fourth
        } else if (barCycle >= 12 && barCycle < 16) {
          transposeSemitones = 6;   // Tritone shift
        }
        // Heavy 8th bar industrial break
        const halfStep = Math.floor(this.stepsPerLoop / 2);
        if (this.barCount % 8 === 7 && step >= halfStep) {
          isDropSection = true;
        }
      }
      else if (varStyle === 'ambient') {
        const barCycle = this.barCount % 16;
        if (barCycle >= 4 && barCycle < 8) {
          transposeSemitones = 5;   // IV chord (major lift)
        } else if (barCycle >= 8 && barCycle < 12) {
          transposeSemitones = 7;   // V chord (peaceful peak)
        } else if (barCycle >= 12 && barCycle < 16) {
          transposeSemitones = 4;   // iii chord (minor resolution)
        }
        // Peaceful filter wash break
        const halfStep = Math.floor(this.stepsPerLoop / 2);
        if (this.barCount % 8 === 7 && step >= halfStep) {
          isDropSection = true;
        }
        if (isDropSection && this.settings && this.filterNode) {
          const t = context.currentTime;
          this.filterNode.frequency.setValueAtTime(this.settings.filterCutoff * 0.4, t); // mellow filter sweep down
        }
      }
      else if (varStyle === 'funky') {
        const barCycle = this.barCount % 16;
        if (barCycle >= 4 && barCycle < 8) {
          transposeSemitones = 5;   // IV
        } else if (barCycle >= 8 && barCycle < 12) {
          transposeSemitones = 10;  // bVII (funky minor seventh)
        } else if (barCycle >= 12 && barCycle < 16) {
          transposeSemitones = 7;   // V
        }
        // Funky syncopation pause on steps 11 and 15
        if (step === 11 || step === 15) {
          if (Math.random() > 0.6) isDropSection = true;
        }
      }
      else if (varStyle === 'orchestral') {
        const barCycle = this.barCount % 16;
        if (barCycle >= 4 && barCycle < 8) {
          transposeSemitones = 8;   // bVI major
        } else if (barCycle >= 8 && barCycle < 12) {
          transposeSemitones = 3;   // bIII major
        } else if (barCycle >= 12 && barCycle < 16) {
          transposeSemitones = 10;  // bVII major
        }
        // Epic orchestral slow build break
        if (this.barCount % 8 === 7) {
          isDropSection = true;
        }
      }
    }

    // --- 1. Kick Drum ---
    let triggerKick = (this.patterns.kick[step] === 1);
    if (this.variationEnabled) {
      if (!isDropSection && varStyle === 'progression' && isFourthBar && step === (this.stepsPerLoop - 2)) {
        triggerKick = true; // double kick transient beat
      } else if (!isDropSection && varStyle === 'minimal' && step % 4 === 0 && Math.random() > 0.9) {
        // subtle organic kick skip
        triggerKick = (Math.random() > 0.25);
      } else if (!isDropSection && varStyle === 'cyberpunk' && step % 4 === 0) {
        triggerKick = true; // heavy four-on-the-floor continuous kick
      } else if (!isDropSection && varStyle === 'funky' && step % 8 === 4 && Math.random() > 0.8) {
        triggerKick = true; // funky syncopated double kick
      } else if (isDropSection && varStyle === 'orchestral' && step % 4 === 0) {
        triggerKick = true; // heavy thunderous quarter note cinematic kicks during drop
      }
    }

    if (triggerKick && (!isDropSection || (this.variationEnabled && varStyle === 'orchestral' && isDropSection))) {
      this.triggerKick(time, context, outputNode);
    }

    // --- 2. Snare ---
    let triggerSnare = (this.patterns.snare[step] === 1);
    let snareVolume = 0.28;
    
    if (this.variationEnabled) {
      if (varStyle === 'minimal' && isDropSection) {
        // play fast chattering drum roll during drops
        if (step >= (this.stepsPerLoop - 3)) {
          triggerSnare = true;
          snareVolume = 0.11;
        }
      } else if (varStyle === 'progression' && isEighthBar) {
        // play quiet backbeat roll fills
        if (step === (this.stepsPerLoop - 5) || step === (this.stepsPerLoop - 1)) {
          triggerSnare = true;
          snareVolume = 0.15;
        }
      } else if (varStyle === 'cyberpunk' && isFourthBar && step % 4 === 2) {
        triggerSnare = true; // guaranteed sharp snare on beats 2 and 4
      } else if (varStyle === 'funky' && step % 8 === 6 && Math.random() > 0.70) {
        triggerSnare = true; // ghost snare notes
        snareVolume = 0.12;
      }
    }

    if (triggerSnare && (!isDropSection || (varStyle === 'minimal' && isDropSection))) {
      this.triggerSnare(time, snareVolume, context, outputNode);
    }

    // --- 3. Hi-Hat ---
    let triggerHiHat = (this.patterns.hihat[step] === 1);
    if (this.variationEnabled) {
      // Dynamic additional hats for offbeat groove
      if (step % 2 === 1 && Math.random() > 0.45) {
        triggerHiHat = true;
      }
      if (varStyle === 'funky' && step % 2 === 1) {
        triggerHiHat = true; // bouncy funky hats
      }
    }
    const hihatMuted = isDropSection && (step < (this.stepsPerLoop - 2)) && (varStyle !== 'ambient');
    if (triggerHiHat && !hihatMuted) {
      const isAmbientDrop = isDropSection && varStyle === 'ambient';
      const hatVolume = isAmbientDrop ? 0.025 : ((step % 2 === 0) ? 0.07 : 0.04) * (varStyle === 'funky' ? 1.4 : 1.0); 
      this.triggerHiHat(time, hatVolume, context, outputNode);
    }

    // --- 4. Percussion / Handclap Line ---
    let triggerPerc = this.patterns.perc ? (this.patterns.perc[step] === 1) : false;
    if (this.variationEnabled && !isDropSection) {
      if (varStyle === 'jazz' && step % 4 === 2 && Math.random() > 0.40) {
        triggerPerc = true; // add syncopated jazz clap bounce
      } else if (varStyle === 'cyberpunk' && step % 4 === 3 && Math.random() > 0.6) {
        triggerPerc = true; // aggressive metal industrial percussion ticking
      } else if (varStyle === 'funky' && step % 4 === 2) {
        triggerPerc = true; // strong double claps on offbeat
      } else if (isFourthBar && step === 10 && Math.random() > 0.5) {
        triggerPerc = true;
      }
    }

    if (triggerPerc && !isDropSection) {
      this.triggerPerc(time, context, outputNode);
      if (this.variationEnabled && varStyle === 'funky' && Math.random() > 0.4) {
        // double clap delay for retro funk
        this.triggerPerc(time + 0.08, context, outputNode);
      }
    }

    // --- 5. Bass Line Synth ---
    let bassNote = this.patterns.bass[step];
    if (this.variationEnabled && bassNote) {
      if (varStyle === 'chiptune' && step % 2 === 1) {
        // play bouncy minor third chiptune bass notes
        bassNote = this.transposeNoteName(bassNote, 3);
      } else if (varStyle === 'funky' && step % 2 === 1) {
        // Funky slap octave jump up/down
        bassNote = this.transposeNoteName(bassNote, 12);
      } else if (varStyle === 'cyberpunk' && step % 4 === 3) {
        // Cyberpunk minor second drop for gritty tension
        bassNote = this.transposeNoteName(bassNote, -1);
      } else if (step === (this.stepsPerLoop - 1) && isFourthBar && NOTE_FREQS[bassNote]) {
        // Random octave slide on transitioning end steps
        bassNote = bassNote.replace(/[23]/g, (match) => String(Number(match) + 1));
      }
    }

    // Apply harmonic chord progressions in realtime
    if (bassNote && transposeSemitones !== 0) {
      bassNote = this.transposeNoteName(bassNote, transposeSemitones);
    }

    if (bassNote && NOTE_FREQS[bassNote]) {
      const freq = NOTE_FREQS[bassNote];
      this.triggerBass(freq, time, context, outputNode);
    }

    // --- 6. Lead Synth ---
    let leadNoteString = this.patterns.lead[step];
    if (this.variationEnabled && !leadNoteString && step % 4 === 2) {
      // fill sparse notes with adjacent keys for dynamic flow
      const adjacentStep = step - 2 >= 0 ? step - 2 : Math.max(0, this.stepsPerLoop - 2);
      const nearbyNote = this.patterns.lead[adjacentStep];
      if (nearbyNote && nearbyNote !== 'null' && Math.random() > 0.6) {
        leadNoteString = nearbyNote;
      }
    }

    if (leadNoteString && leadNoteString !== 'null' && this.variationEnabled) {
      // Apply voice leading/voicing modifications dynamically in real-time
      leadNoteString = this.getDynamicChordVoicing(leadNoteString, this.barCount, step, varStyle);
    }

    if (leadNoteString && leadNoteString !== 'null') {
      if (transposeSemitones !== 0) {
        leadNoteString = this.transposeNoteName(leadNoteString, transposeSemitones);
      }
      
      const notesArray = leadNoteString.split(',').map(n => n.trim()).filter(Boolean);
      const noteCount = notesArray.length;
      notesArray.forEach((singleNote, idx) => {
        if (NOTE_FREQS[singleNote]) {
          const freq = NOTE_FREQS[singleNote];
          
          // Apply a lovely chord strum stagger delay (approx 12ms per chord voice) to widen the sound and prevent overlapping muddiness
          const strumDelay = idx * 0.012;
          const triggerTime = time + strumDelay;
          
          if (this.variationEnabled && varStyle === 'chiptune') {
            // Rapid 8-bit chiptune triplets to emulate hardware synth chips
            const arpStep = 0.05;
            this.triggerLead(freq, triggerTime, context, filterOutputNode, noteCount);
            this.triggerLead(freq * 1.25, triggerTime + arpStep, context, filterOutputNode, noteCount);
            this.triggerLead(freq * 1.5, triggerTime + arpStep * 2, context, filterOutputNode, noteCount);
          } else if (this.variationEnabled && varStyle === 'cyberpunk') {
            // Rapid stuttered gates
            this.triggerLead(freq, triggerTime, context, filterOutputNode, noteCount);
            this.triggerLead(freq, triggerTime + 0.04, context, filterOutputNode, noteCount * 1.2);
            this.triggerLead(freq, triggerTime + 0.08, context, filterOutputNode, noteCount * 1.4);
          } else if (this.variationEnabled && varStyle === 'ambient') {
            // Overlapping harmonized fifths
            this.triggerLead(freq, triggerTime, context, filterOutputNode, noteCount);
            this.triggerLead(freq * 1.5, triggerTime + 0.06, context, filterOutputNode, noteCount * 0.8);
          } else if (this.variationEnabled && varStyle === 'orchestral') {
            // Epic brass fanfare arpeggio
            const arpStep = 0.045;
            this.triggerLead(freq, triggerTime, context, filterOutputNode, noteCount * 1.1);
            this.triggerLead(freq * 1.25, triggerTime + arpStep, context, filterOutputNode, noteCount * 1.1);
            this.triggerLead(freq * 1.5, triggerTime + arpStep * 2, context, filterOutputNode, noteCount * 1.1);
            this.triggerLead(freq * 2.0, triggerTime + arpStep * 3, context, filterOutputNode, noteCount * 1.1);
          } else {
            this.triggerLead(freq, triggerTime, context, filterOutputNode, noteCount);
          }
        }
      });
    }

    // --- 7. Secondary Synth2 (Crystal Pluck/Bell) Channel ---
    let synth2Note = this.patterns.synth2 ? this.patterns.synth2[step] : null;
    if (this.variationEnabled && !synth2Note && step % 4 === 1 && Math.random() > 0.70) {
      if (bassNote) {
        // echo chime lines dynamically mapped from current chord progression roots
        synth2Note = bassNote.replace(/[23]/g, '5');
      }
    }

    if (synth2Note && synth2Note !== 'null' && this.variationEnabled) {
      // Apply voice leading/voicing modifications dynamically in real-time
      synth2Note = this.getDynamicChordVoicing(synth2Note, this.barCount, step, varStyle);
    }

    if (synth2Note && synth2Note !== 'null') {
      if (transposeSemitones !== 0) {
        synth2Note = this.transposeNoteName(synth2Note, transposeSemitones);
      }
      const notesArray = synth2Note.split(',').map(n => n.trim()).filter(Boolean);
      const noteCount = notesArray.length;
      notesArray.forEach((singleNote, idx) => {
        if (NOTE_FREQS[singleNote]) {
          const freq = NOTE_FREQS[singleNote];
          
          // Apply a lovely chord strum stagger delay (approx 12ms per chord voice) to widen the sound and prevent overlapping muddiness
          const strumDelay = idx * 0.012;
          const triggerTime = time + strumDelay;
          
          if (this.variationEnabled && varStyle === 'chiptune') {
            // Rapid cute chiptune bubble bounces
            this.triggerSynth2(freq, triggerTime, context, filterOutputNode, noteCount);
            this.triggerSynth2(freq * 2.0, triggerTime + 0.045, context, filterOutputNode, noteCount);
          } else if (this.variationEnabled && varStyle === 'jazz') {
            // Jazz major 7th chime sparkles
            this.triggerSynth2(freq, triggerTime, context, filterOutputNode, noteCount);
            this.triggerSynth2(freq * 1.88, triggerTime + 0.055, context, filterOutputNode, noteCount);
          } else if (this.variationEnabled && varStyle === 'cyberpunk') {
            // Ring modulation high chime
            this.triggerSynth2(freq, triggerTime, context, filterOutputNode, noteCount);
            this.triggerSynth2(freq * 1.414, triggerTime + 0.03, context, filterOutputNode, noteCount);
          } else if (this.variationEnabled && varStyle === 'ambient') {
            // Deep cloud chime shower
            const stepT = 0.06;
            this.triggerSynth2(freq, triggerTime, context, filterOutputNode, noteCount * 0.7);
            this.triggerSynth2(freq * 1.25, triggerTime + stepT, context, filterOutputNode, noteCount * 0.7);
            this.triggerSynth2(freq * 1.5, triggerTime + stepT * 2, context, filterOutputNode, noteCount * 0.7);
            this.triggerSynth2(freq * 2.0, triggerTime + stepT * 3, context, filterOutputNode, noteCount * 0.7);
          } else if (this.variationEnabled && varStyle === 'funky') {
            // Syncopated high bell accent
            this.triggerSynth2(freq, triggerTime, context, filterOutputNode, noteCount);
            this.triggerSynth2(freq * 1.5, triggerTime + 0.04, context, filterOutputNode, noteCount * 0.9);
          } else if (this.variationEnabled && varStyle === 'orchestral') {
            // high tremolo strings
            const delay = 0.03;
            this.triggerSynth2(freq, triggerTime, context, filterOutputNode, noteCount);
            this.triggerSynth2(freq, triggerTime + delay, context, filterOutputNode, noteCount);
            this.triggerSynth2(freq, triggerTime + delay * 2, context, filterOutputNode, noteCount);
          } else {
            this.triggerSynth2(freq, triggerTime, context, filterOutputNode, noteCount);
          }
        }
      });
    }
  }

  // --- RE-CALIBRATED CHANNELS (PURE GAIN BALANCING & HEADROOM ASSURANCE) ---

  private triggerKick(time: number, context: BaseAudioContext, destination: AudioNode) {
    const osc = context.createOscillator();
    const gainNode = context.createGain();

    osc.connect(gainNode);
    gainNode.connect(destination);

    osc.type = 'sine';
    
    // Clean decay - no clicks
    osc.frequency.setValueAtTime(115, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.08);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.35, time + 0.005); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.start(time);
    osc.stop(time + 0.17);
  }

  private triggerSnare(time: number, volumeScale: number, context: BaseAudioContext, destination: AudioNode) {
    if (!this.noiseBuffer) return;

    const noiseSource = context.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1050;

    const noiseGain = context.createGain();
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);

    noiseGain.gain.setValueAtTime(0, time);
    noiseGain.gain.linearRampToValueAtTime(volumeScale * 0.7, time + 0.006);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.10);

    // Shell snap element
    const toneOsc = context.createOscillator();
    const toneGain = context.createGain();

    toneOsc.connect(toneGain);
    toneGain.connect(destination);

    toneOsc.type = 'triangle';
    toneOsc.frequency.setValueAtTime(155, time);
    toneOsc.frequency.exponentialRampToValueAtTime(95, time + 0.04);

    toneGain.gain.setValueAtTime(0, time);
    toneGain.gain.linearRampToValueAtTime(volumeScale * 0.5, time + 0.005);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noiseSource.start(time);
    noiseSource.stop(time + 0.11);

    toneOsc.start(time);
    toneOsc.stop(time + 0.07);
  }

  private triggerHiHat(time: number, volumeScale: number, context: BaseAudioContext, destination: AudioNode) {
    if (!this.noiseBuffer) return;

    const noiseSource = context.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(8200, time);

    const gainNode = context.createGain();

    noiseSource.connect(highpass);
    highpass.connect(gainNode);
    gainNode.connect(destination);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volumeScale, time + 0.002);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

    noiseSource.start(time);
    noiseSource.stop(time + 0.05);
  }

  private triggerPerc(time: number, context: BaseAudioContext, destination: AudioNode) {
    if (!this.noiseBuffer) return;

    // Elegant multi-trigger bounce-back clap percussion synthesis
    const bounceTimes = [0, 0.012, 0.024];
    bounceTimes.forEach((delay) => {
      const clapSubSrc = context.createBufferSource();
      clapSubSrc.buffer = this.noiseBuffer;
      
      const clapFilter = context.createBiquadFilter();
      clapFilter.type = 'bandpass';
      clapFilter.frequency.setValueAtTime(1500, time + delay);
      clapFilter.Q.setValueAtTime(4.0, time + delay);

      const clapGain = context.createGain();
      clapSubSrc.connect(clapFilter);
      clapFilter.connect(clapGain);
      clapGain.connect(destination);

      clapGain.gain.setValueAtTime(0, time + delay);
      clapGain.gain.linearRampToValueAtTime(0.12, time + delay + 0.002);
      clapGain.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.015);

      clapSubSrc.start(time + delay);
      clapSubSrc.stop(time + delay + 0.02);
    });

    // Main snappy snap tail
    const delay = 0.036;
    const clapSrc = context.createBufferSource();
    clapSrc.buffer = this.noiseBuffer;
    
    const clapFilter = context.createBiquadFilter();
    clapFilter.type = 'bandpass';
    clapFilter.frequency.setValueAtTime(1200, time + delay);
    clapFilter.Q.setValueAtTime(3.0, time + delay);

    const clapGain = context.createGain();
    clapSrc.connect(clapFilter);
    clapFilter.connect(clapGain);
    clapGain.connect(destination);

    clapGain.gain.setValueAtTime(0, time + delay);
    clapGain.gain.linearRampToValueAtTime(0.18, time + delay + 0.003);
    clapGain.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.16);

    clapSrc.start(time + delay);
    clapSrc.stop(time + delay + 0.18);
  }

  private triggerBass(frequency: number, time: number, context: BaseAudioContext, destination: AudioNode) {
    const osc = context.createOscillator();
    const gainNode = context.createGain();

    osc.connect(gainNode);
    gainNode.connect(destination);

    const bassInst = this.settings?.bassInstrument || 'triangle';
    const stepDuration = 60.0 / this.bpm / 4.0;
    const bassDuration = Math.min(0.40, Math.max(0.08, stepDuration * 0.85));

    // Voice choking for Bass channel to prevent overlapping sub mud
    this.lastBassVoices = this.lastBassVoices.filter(voice => {
      if (voice.time < time - 0.001) {
        try {
          voice.gainNode.gain.cancelScheduledValues(time);
          voice.gainNode.gain.setValueAtTime(0.05, time);
          voice.gainNode.gain.linearRampToValueAtTime(0.0, time + 0.012);
        } catch (e) {
          // ignore
        }
        return false;
      }
      return true;
    });
    this.lastBassVoices.push({ gainNode, time });

    if (bassInst === 'saw') {
      osc.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.11, time + 0.008); 
      gainNode.gain.setTargetAtTime(0.001, time + bassDuration * 0.4, Math.max(0.01, bassDuration * 0.2));
    } else if (bassInst === 'sub') {
      osc.type = 'sine';
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.24, time + 0.015); 
      gainNode.gain.setTargetAtTime(0.001, time + bassDuration * 0.5, Math.max(0.01, bassDuration * 0.25));
    } else if (bassInst === 'slap') {
      // Slap Bass Synth: Short punchy sawtooth with slap sine click resonance
      osc.type = 'square';
      osc.frequency.setValueAtTime(frequency, time);
      
      const bounceOsc = context.createOscillator();
      bounceOsc.type = 'sine';
      bounceOsc.frequency.setValueAtTime(frequency * 2, time);
      
      const bounceGain = context.createGain();
      bounceOsc.connect(bounceGain);
      bounceGain.connect(destination);
      
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.08, time + 0.004); 
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + bassDuration * 0.5);
      
      bounceGain.gain.setValueAtTime(0, time);
      bounceGain.gain.linearRampToValueAtTime(0.14, time + 0.006);
      bounceGain.gain.exponentialRampToValueAtTime(0.001, time + bassDuration * 0.25);
      
      bounceOsc.start(time);
      bounceOsc.stop(time + bassDuration * 0.6);
    } else { // default 'triangle'
      osc.type = 'triangle'; 
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.16, time + 0.012); 
      gainNode.gain.setTargetAtTime(0.001, time + bassDuration * 0.45, Math.max(0.01, bassDuration * 0.22));
    }

    if (bassInst !== 'slap') {
      osc.frequency.setValueAtTime(frequency, time);
    }
    
    osc.start(time);
    osc.stop(time + bassDuration + 0.05);
  }

  private triggerLead(frequency: number, time: number, context: BaseAudioContext, filterDestination: AudioNode, noteCount: number = 1) {
    if (!this.settings) return;

    const osc1 = context.createOscillator();
    const osc2 = context.createOscillator();
    const synthGain = context.createGain();

    osc1.connect(synthGain);
    osc2.connect(synthGain);
    synthGain.connect(filterDestination);

    const leadInst = this.settings.leadInstrument || 'saw';
    
    let att = Math.max(0.005, this.settings.attack);
    let dec = Math.max(0.02, this.settings.decay);
    const sus = this.settings.sustain;
    let rel = Math.max(0.02, this.settings.release);
    
    // Dynamic duration based on current BPM (leaving a 15% clean transition gap)
    const stepDuration = 60.0 / this.bpm / 4.0;
    const duration = Math.min(0.40, Math.max(0.07, stepDuration * 0.85));

    // Voice choking for Lead channel to prevent overlapping mud
    this.lastLeadVoices = this.lastLeadVoices.filter(voice => {
      if (voice.time < time - 0.001) {
        try {
          voice.gainNode.gain.cancelScheduledValues(time);
          voice.gainNode.gain.setValueAtTime(0.03, time);
          voice.gainNode.gain.linearRampToValueAtTime(0.0, time + 0.012);
        } catch (e) {
          // ignore
        }
        return false;
      }
      return true;
    });
    this.lastLeadVoices.push({ gainNode: synthGain, time });

    if (leadInst === 'square') {
      osc1.type = 'square';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(frequency, time);
      osc1.detune.setValueAtTime(-6, time);
      osc2.frequency.setValueAtTime(frequency, time);
      osc2.detune.setValueAtTime(6, time);
    } else if (leadInst === 'pad') {
      // Warm soft lush pad: slow attack, slow release, detuned sine/triangle blend
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(frequency * 0.5, time); // sub harmonic
      osc1.detune.setValueAtTime(-14, time);
      osc2.frequency.setValueAtTime(frequency, time);
      osc2.detune.setValueAtTime(14, time);
      att = Math.max(0.12, att * 1.5);
      rel = Math.max(0.40, rel * 1.5);
    } else if (leadInst === 'epiano') {
      // Electric Piano: Rhodes-like sound
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(frequency, time);
      osc1.detune.setValueAtTime(0, time);
      osc2.frequency.setValueAtTime(frequency * 2, time); // clean bell overtone
      osc2.detune.setValueAtTime(4, time);
      dec = Math.max(0.18, dec);
    } else if (leadInst === 'triangle') {
      // Warm flute lead
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(frequency, time);
      osc1.detune.setValueAtTime(-4, time);
      osc2.frequency.setValueAtTime(frequency * 2, time);
      osc2.detune.setValueAtTime(2, time);
    } else { // default 'saw'
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(frequency, time);
      osc1.detune.setValueAtTime(-8, time);
      osc2.frequency.setValueAtTime(frequency, time);
      osc2.detune.setValueAtTime(8, time);
    }

    // Dynamic gain dividing scales chords cleanly down to eliminate audio clips
    const scaleFactor = noteCount > 1 ? Math.sqrt(noteCount) * 1.25 : 0.85;
    let baseGain = 0.08 / scaleFactor; 
    
    if (leadInst === 'pad') baseGain *= 1.2;
    if (leadInst === 'triangle') baseGain *= 0.9;

    synthGain.gain.setValueAtTime(0, time);
    synthGain.gain.linearRampToValueAtTime(baseGain, time + att); 
    synthGain.gain.exponentialRampToValueAtTime(Math.max(0.001, baseGain * sus), time + att + dec);
    synthGain.gain.setTargetAtTime(0, time + duration, Math.max(0.01, rel / 2.5));

    osc1.start(time);
    osc1.stop(time + duration + rel * 4 + 0.05);

    osc2.start(time);
    osc2.stop(time + duration + rel * 4 + 0.05);
  }

  private triggerSynth2(frequency: number, time: number, context: BaseAudioContext, filterDestination: AudioNode, noteCount: number = 1) {
    const oscChime = context.createOscillator();
    const oscTri = context.createOscillator();
    const chimeGain = context.createGain();

    oscChime.connect(chimeGain);
    oscTri.connect(chimeGain);
    chimeGain.connect(filterDestination);

    const chimeInst = this.settings?.synth2Instrument || 'chime';

    // Voice choking for Synth2 channel to avoid overlapping chime clouds
    this.lastSynth2Voices = this.lastSynth2Voices.filter(voice => {
      if (voice.time < time - 0.001) {
        try {
          voice.gainNode.gain.cancelScheduledValues(time);
          voice.gainNode.gain.setValueAtTime(0.02, time);
          voice.gainNode.gain.linearRampToValueAtTime(0.0, time + 0.012);
        } catch (e) {
          // ignore
        }
        return false;
      }
      return true;
    });
    this.lastSynth2Voices.push({ gainNode: chimeGain, time });

    if (chimeInst === 'celesta') {
      // Celesta: metallic high chime overtone spectrum Mimicking real celesta bar resonator
      oscChime.type = 'sine';
      oscChime.frequency.setValueAtTime(frequency * 3.03, time);
      oscTri.type = 'sine';
      oscTri.frequency.setValueAtTime(frequency, time);
      oscTri.detune.setValueAtTime(0, time);
    } else if (chimeInst === 'musicbox') {
      // Nostalgic tinkle box
      oscChime.type = 'sine';
      oscChime.frequency.setValueAtTime(frequency * 4.0, time);
      oscTri.type = 'triangle';
      oscTri.frequency.setValueAtTime(frequency, time);
      oscTri.detune.setValueAtTime(12, time); 
    } else if (chimeInst === 'pad') {
      // Nebular chime: soft, beautiful, slower pluck
      oscChime.type = 'sine';
      oscChime.frequency.setValueAtTime(frequency * 1.5, time); 
      oscTri.type = 'sine';
      oscTri.frequency.setValueAtTime(frequency, time);
      oscTri.detune.setValueAtTime(-8, time);
    } else if (chimeInst === 'epiano') {
      // FM Digital Keys pluck
      oscChime.type = 'sine';
      oscChime.frequency.setValueAtTime(frequency * 2.0, time);
      oscTri.type = 'sine';
      oscTri.frequency.setValueAtTime(frequency, time);
      oscTri.detune.setValueAtTime(4, time);
    } else { // default 'chime'
      oscChime.type = 'sine';
      oscChime.frequency.setValueAtTime(frequency * 2, time);
      oscTri.type = 'triangle';
      oscTri.frequency.setValueAtTime(frequency, time);
      oscTri.detune.setValueAtTime(5, time);
    }

    const scaleFactor = noteCount > 1 ? Math.sqrt(noteCount) * 1.15 : 0.85;
    let baseGain = 0.05 / scaleFactor;
    
    const stepDuration = 60.0 / this.bpm / 4.0;
    let pluckDecay = stepDuration * 0.90;
    if (chimeInst === 'pad') {
      pluckDecay = stepDuration * 1.8;
      baseGain *= 1.3;
    } else if (chimeInst === 'celesta') {
      pluckDecay = stepDuration * 0.70;
    }
    pluckDecay = Math.min(0.40, Math.max(0.05, pluckDecay));

    chimeGain.gain.setValueAtTime(0, time);
    chimeGain.gain.linearRampToValueAtTime(baseGain, time + 0.005);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, time + pluckDecay);

    oscChime.start(time);
    oscChime.stop(time + pluckDecay + 0.1);

    oscTri.start(time);
    oscTri.stop(time + pluckDecay + 0.1);
  }

  private getDynamicChordVoicing(noteString: string, barCount: number, step: number, varStyle: string): string {
    if (!noteString || !noteString.includes(',')) return noteString; // not a chord, single note
    
    const notes = noteString.split(',').map(n => n.trim()).filter(Boolean);
    if (notes.length <= 1) return noteString;

    // Apply voice leading/voicing modifications to avoid boring blocks
    const barCycle = barCount % 4;
    
    if (varStyle === 'ambient' || varStyle === 'jazz' || varStyle === 'progression') {
      // Bar 1: Standard voicing
      // Bar 2: Raise first note by 1 octave to create 1st inversion
      if (barCycle === 1) {
        return [
          ...notes.slice(1), 
          this.shiftOctave(notes[0], 1)
        ].join(',');
      }
      // Bar 3: Drop high note by 1 octave to make a compact low voicing
      if (barCycle === 2) {
        return [
          this.shiftOctave(notes[notes.length - 1], -1),
          ...notes.slice(0, notes.length - 1)
        ].join(',');
      }
      // Bar 4: Shell chord voicing (remove the middle note to create structured fifths/roots, avoiding muddy overlaps in background)
      if (barCycle === 3) {
        if (notes.length >= 3) {
          return [notes[0], notes[notes.length - 1]].join(',');
        }
      }
    } else if (varStyle === 'minimal' || varStyle === 'cyberpunk') {
      // In techno/cyberpunk, keep chord very sparse on non-accent steps to avoid clutter
      if (step % 4 !== 0) {
        if (notes.length >= 2) {
          return [notes[0], notes[notes.length - 1]].join(',');
        }
      }
    } else if (varStyle === 'chiptune') {
      // Retro chiptune break down to rapid alternate duos
      if (step % 2 === 0) {
        return notes[0];
      } else {
        return notes[notes.length - 1];
      }
    }
    
    return noteString;
  }
  
  private shiftOctave(note: string, offset: number): string {
    const match = note.match(/^([A-G]#?)(\d)$/);
    if (!match) return note;
    const [_, pitch, octaveStr] = match;
    const octave = parseInt(octaveStr, 10) + offset;
    // Keep octave within safe audible synthesis range (2 to 6)
    const activeOctave = Math.max(2, Math.min(6, octave));
    return `${pitch}${activeOctave}`;
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * High performance Offline Audio Compilation to WAV.
   * Compiles current patterns and synthesizer parameters into studio WAV blobs entirely locally.
   */
  public async exportToWav(
    bpm: number, 
    patterns: SequencerPatterns, 
    settings: SynthSettings,
    targetDurationSeconds: number = 15
  ): Promise<Blob> {
    this.patterns = patterns;
    this.settings = settings;
    this.bpm = bpm;
    
    // 1 step time duration
    const stepDuration = 60.0 / bpm / 4.0;
    const totalDuration = targetDurationSeconds;
    const sampleRate = 44100;
    
    // Create Offline Context
    const offlineCtx = new OfflineAudioContext(2, sampleRate * totalDuration, sampleRate);
    
    // Regenerate noise buffer on offline context if needed
    this.generateNoiseBuffer(offlineCtx);

    // Recreate Synthesis Chain in Offline Sandbox
    const offlineFilter = offlineCtx.createBiquadFilter();
    offlineFilter.type = 'lowpass';
    offlineFilter.frequency.value = settings.filterCutoff;
    offlineFilter.Q.value = settings.filterResonance;

    const offlineDistortion = offlineCtx.createWaveShaper();
    offlineDistortion.curve = this.makeDistortionCurve(settings.distortion);
    offlineDistortion.oversample = '4x';

    const offlineDelay = offlineCtx.createDelay(1.0);
    offlineDelay.delayTime.value = settings.delayTime;

    const offlineDelayFeedback = offlineCtx.createGain();
    offlineDelayFeedback.gain.value = settings.delayFeedback * 0.5;

    const offlineCompressor = offlineCtx.createDynamicsCompressor();
    offlineCompressor.threshold.value = -12;
    offlineCompressor.knee.value = 10;
    offlineCompressor.ratio.value = 6.0;
    offlineCompressor.attack.value = 0.003;
    offlineCompressor.release.value = 0.15;

    const offlineMasterGain = offlineCtx.createGain();
    offlineMasterGain.gain.value = 0.85; // Solid rich levels for exporting

    // Connect Node Flow Chart
    offlineFilter.connect(offlineDistortion);
    offlineDistortion.connect(offlineCompressor);
    offlineDistortion.connect(offlineDelay);

    offlineDelay.connect(offlineDelayFeedback);
    offlineDelayFeedback.connect(offlineDelay);
    offlineDelayFeedback.connect(offlineCompressor);

    offlineCompressor.connect(offlineMasterGain);
    offlineMasterGain.connect(offlineCtx.destination);

    // Re-initialize stepsPerLoop based on time signature
    this.stepsPerLoop = this.getStepsPerLoopValue(patterns.timeSignature);
    const varStyle = patterns.variationStyle || 'progression';
    const originalBarCount = this.barCount;
    
    let currentBar = 0;
    let scheduleTime = 0;
    
    // Schedule multiple measures to fill the requested duration
    while (scheduleTime < targetDurationSeconds) {
      this.barCount = currentBar;
      for (let step = 0; step < this.stepsPerLoop; step++) {
        let stepTime = scheduleTime + step * stepDuration;
        
        // Stop scheduling if step exceeds target duration
        if (stepTime >= targetDurationSeconds) {
          break;
        }

        if (this.variationEnabled && varStyle === 'jazz' && (step % 2 === 1)) {
          stepTime += stepDuration * 0.16;
        }
        
        this.scheduleStep(step, stepTime, offlineCtx, offlineCompressor, offlineFilter);
      }
      
      scheduleTime += this.stepsPerLoop * stepDuration;
      currentBar++;
    }
    
    // Restore original barCount
    this.barCount = originalBarCount;

    // Compile offline buffer
    const renderedBuffer = await offlineCtx.startRendering();
    
    // Encode down to high compatibility PCM WAV format
    return this.encodeWavBinary(renderedBuffer);
  }

  private encodeWavBinary(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44; // 16-bit PCM (2 bytes) + 44 bytes WAV Header
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    
    const channels: Float32Array[] = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF identifier
    setUint32(0x46464952); // "RIFF" ASCII
    setUint32(length - 8); // chunk size
    setUint32(0x45564157); // "WAVE" ASCII
    
    // Format subchunk
    setUint32(0x20746d66); // "fmt " ASCII
    setUint32(16);         // subchunk1 size
    setUint16(1);          // Audio format 1 (uncompressed Linear PCM)
    setUint16(numOfChan);  // stereo channels
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2);                    // block align
    setUint16(16);                               // bits per sample (16-bit)

    // Data subchunk
    setUint32(0x61746164); // "data" ASCII
    setUint32(buffer.length * numOfChan * 2); // chunk size

    const totalSamples = buffer.length;
    for (let offset = 0; offset < totalSamples; offset++) {
      for (let chan = 0; chan < numOfChan; chan++) {
        let sample = channels[chan][offset];
        
        if (sample > 1.0) sample = 1.0;
        else if (sample < -1.0) sample = -1.0;

        const sampleInt16 = sample < 0 ? sample * 32768 : sample * 32767;
        view.setInt16(pos, sampleInt16, true);
        pos += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
}

export const audioEngine = new AudioEngine();
