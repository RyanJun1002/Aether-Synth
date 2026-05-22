/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import { PRESETS } from './utils/presets';
import { audioEngine } from './utils/audioEngine';
import { Preset, SequencerPatterns, SynthSettings, GeneratedTrackResponse, GenerationHistoryItem } from './types';
import Visualizer from './components/Visualizer';
import SequencerGrid from './components/SequencerGrid';
import SynthControls from './components/SynthControls';
import { 
  Play, 
  Square, 
  Volume2, 
  Music, 
  Sparkles, 
  RefreshCw, 
  SlidersHorizontal, 
  Info, 
  Trash2, 
  Send, 
  Loader2, 
  Headphones, 
  Radio, 
  Compass, 
  Cpu,
  Download
} from 'lucide-react';

const THEME_CHIPS: Record<string, {
  accent: string;
  bg: string;
  border: string;
  text: string;
  glow: string;
}> = {
  cyber: {
    accent: '#3b82f6',
    bg: 'bg-[#050508]',
    border: 'border-blue-500/10 shadow-blue-500/5',
    text: 'text-blue-400',
    glow: 'shadow-[0_0_50px_rgba(59,130,246,0.12)]',
  },
  cosmic: {
    accent: '#8b5cf6',
    bg: 'bg-[#050508]',
    border: 'border-violet-500/10 shadow-violet-500/5',
    text: 'text-violet-400',
    glow: 'shadow-[0_0_50px_rgba(139,92,246,0.12)]',
  },
  sunset: {
    accent: '#f97316',
    bg: 'bg-[#050508]',
    border: 'border-orange-500/10 shadow-orange-500/5',
    text: 'text-orange-400',
    glow: 'shadow-[0_0_50px_rgba(249,115,22,0.12)]',
  },
  vaporwave: {
    accent: '#f43f5e',
    bg: 'bg-[#050508]',
    border: 'border-rose-500/10 shadow-rose-500/5',
    text: 'text-rose-400',
    glow: 'shadow-[0_0_50px_rgba(244,63,94,0.12)]',
  },
  emerald: {
    accent: '#10b981',
    bg: 'bg-[#050508]',
    border: 'border-emerald-500/10 shadow-emerald-500/5',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_50px_rgba(16,185,129,0.12)]',
  }
};

const PROMPT_SUGGESTIONS = [
  { text: "Warm cozy sunset lofi hiphop beat with jazzy guitar sweeps" },
  { text: "Aggressive neon driving cyberpunk techno with industrial grids" },
  { text: "Ethereal space ambient drift with slow cosmic filter reflections" },
  { text: "Playful retro 8-bit arcade game chiptune fast lead melodies" }
];

export default function App() {
  // Global States
  const [bpm, setBpm] = useState<number>(125);
  const [patterns, setPatterns] = useState<SequencerPatterns>(PRESETS[0].patterns);
  const [settings, setSettings] = useState<SynthSettings>(PRESETS[0].synthSettings);
  const [visualTheme, setVisualTheme] = useState<'cyber' | 'cosmic' | 'sunset' | 'vaporwave' | 'emerald'>('cyber');
  
  // Track Metadata
  const [trackTitle, setTrackTitle] = useState<string>('Midnight Cyberpunk');
  const [trackMood, setTrackMood] = useState<string>('Sleek dark outrun techno driven by continuous modular sweeps.');

  // Playback Engines
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [variationEnabled, setVariationEnabled] = useState<boolean>(true);
  const [showSequencer, setShowSequencer] = useState<boolean>(false);
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);

  // Synchronize audio engine improvisation mode on status adjustments
  useEffect(() => {
    audioEngine.setVariationEnabled(variationEnabled);
  }, [variationEnabled]);

  // AI Prompt Form States
  const [promptInput, setPromptInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportDuration, setExportDuration] = useState<number>(30);
  const [apiError, setApiError] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<GenerationHistoryItem[]>([]);

  const activeTheme = THEME_CHIPS[visualTheme];

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('aethersynth_history');
      if (stored) {
        setGenerationHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not read generation history from localStorage:", e);
    }
  }, []);

  // Update master audio node parameters on change
  useEffect(() => {
    if (isPlaying) {
      audioEngine.updatePatterns(patterns);
    }
  }, [patterns, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      audioEngine.updateSettings(settings);
    }
  }, [settings, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      audioEngine.updateBPM(bpm);
    }
  }, [bpm, isPlaying]);

  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  // Cleanup audio upon dismount
  useEffect(() => {
    return () => {
      audioEngine.stop();
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
      setActiveStep(0);
    } else {
      setIsPlaying(true);
      // Initialize contextual session volume
      audioEngine.setVolume(volume);
      audioEngine.start(bpm, patterns, settings, (step) => {
        setActiveStep(step);
      });
    }
  };

  const stopMusic = () => {
    audioEngine.stop();
    setIsPlaying(false);
    setActiveStep(0);
  };

  const handleLoadPreset = (preset: Preset) => {
    stopMusic();
    setBpm(preset.bpm);
    setPatterns(preset.patterns);
    setSettings(preset.synthSettings);
    setVisualTheme(preset.visualTheme);
    setTrackTitle(preset.name);
    setTrackMood(preset.description);
  };

  const handleWipe = () => {
    stopMusic();
    const cleanSheet: SequencerPatterns = {
      kick: Array(16).fill(0),
      snare: Array(16).fill(0),
      hihat: Array(16).fill(0),
      bass: Array(16).fill(null),
      lead: Array(16).fill(null),
      synth2: Array(16).fill(null),
    };
    setPatterns(cleanSheet);
    setTrackTitle('Blank Beats');
    setTrackMood('Completely silent modular sequence ready to be designed by AI or Preset soundboards.');
  };

  const handlePromptSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() || isGenerating) return;

    setIsGenerating(true);
    setApiError(null);

    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Composition server returned an invalid response.');
      }

      // Generation Complete! Load track contents
      stopMusic();
      setBpm(data.bpm);
      setPatterns(data.patterns);
      setSettings(data.synthSettings);
      setVisualTheme(data.visualTheme);
      setTrackTitle(data.themeName);
      setTrackMood(data.moodDescription);

      // Save to local history
      const logItem: GenerationHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        prompt: promptInput.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        bpm: data.bpm,
        themeName: data.themeName
      };

      const updatedHistory = [logItem, ...generationHistory].slice(0, 8);
      setGenerationHistory(updatedHistory);
      localStorage.setItem('aethersynth_history', JSON.stringify(updatedHistory));

      setPromptInput('');

      // Auto start music engine with a tiny layout offset for premium feel
      setTimeout(() => {
        setIsPlaying(true);
        audioEngine.setVolume(volume);
        audioEngine.start(data.bpm, data.patterns, data.synthSettings, (step) => {
          setActiveStep(step);
        });
      }, 200);

    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'Connecting to sound builder API failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChipClick = (suggestion: typeof PROMPT_SUGGESTIONS[0]) => {
    setPromptInput(suggestion.text);
  };

  const handleExportWav = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      // Offline compilation loop start with selected export duration
      const blob = await audioEngine.exportToWav(bpm, patterns, settings, exportDuration);
      
      // Setup dynamic system anchor for native browser trigger downloading
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Clean and safe filenames with selected duration metadata
      const safeTitle = trackTitle.replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣\_]/gi, '_').toLowerCase();
      const friendlyDuration = exportDuration >= 60 ? `${exportDuration / 60}m` : `${exportDuration}s`;
      a.download = `aethersynth_${safeTitle}_${bpm}bpm_${friendlyDuration}.wav`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("WAV Export execution failed:", e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`min-h-screen text-zinc-100 ${activeTheme.bg} flex flex-col justify-between p-4 md:p-8 select-none transition-colors duration-1000 overflow-x-hidden pb-24 relative`}>
      
      {/* Decorative Aura Spotlights matching vibe theme */}
      <div 
        className="fixed top-0 left-1 /2 -translate-x-1/2 w-full max-w-[1200px] h-96 -z-10 bg-radial opacity-[0.09] pointer-events-none blur-[150px] transition-all duration-1000 ease-out"
        style={{ backgroundImage: `radial-gradient(circle, ${activeTheme.accent} 0%, transparent 65%)` }}
      />

      <div className="max-w-7xl mx-auto w-full flex-grow flex flex-col justify-between space-y-8">
        
        {/* LOGO HEADER */}
        <header className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-5 gap-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-1000 shadow-md shadow-black/80"
              style={{ backgroundColor: activeTheme.accent }}
            >
              <Cpu size={14} className="text-black" />
            </div>
            <div>
              <h1 className="font-sans font-black tracking-widest text-[#FFF] uppercase text-sm sm:text-base flex items-center gap-2">
                Aethersynth <span className="text-[9px] bg-white/5 border border-white/10 text-white/50 tracking-wider font-semibold px-1.5 py-0.5 rounded">STUDENT BEATS</span>
              </h1>
              <p className="text-[10px] text-white/20 tracking-wider font-sans uppercase">Generative AI Space Station</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 justify-end">
            <div className="flex items-center space-x-2.5 bg-[#111114]/80 px-3 py-1.5 rounded-xl border border-white/5 shadow-inner">
              <span className="text-[10px] font-display font-medium text-white/50 uppercase tracking-widest select-none">Advanced Mode</span>
              <button
                type="button"
                onClick={() => setAdvancedMode(!advancedMode)}
                className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 relative flex items-center cursor-pointer ${
                  advancedMode ? 'bg-purple-600' : 'bg-zinc-800'
                }`}
                style={{ backgroundColor: advancedMode ? activeTheme.accent : undefined }}
                title="Toggle manual sequencer and performance controls"
              >
                <div 
                  className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                    advancedMode ? 'translate-x-[16px]' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>

            <div className="flex items-center space-x-2 text-[10px] text-white/30 font-medium select-none bg-white-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ready for Generation</span>
            </div>
          </div>
        </header>

        {/* MAIN CREATION DECK */}
        <main className="flex flex-col items-center justify-center py-6 w-full">
          
          {/* MAIN INTERACTIVE COLUMN */}
          <section className="w-full max-w-4xl flex flex-col items-center justify-center space-y-6">
            
            {/* Title Block */}
            <div className="text-center space-y-1 select-none animate-fade-in">
              <h2 className="font-sans font-black tracking-widest text-[#FFF] uppercase text-2xl sm:text-4xl">
                Create Your Own Music
              </h2>
              <p className="text-xs text-white/30 tracking-wide font-sans">
                A dynamic generative AI sound sphere sparked by your imagination (AetherSynth)
              </p>
            </div>

            {/* Circular Sound Equalizer Orb (Aether Orb CD layout) */}
            <div className="w-full flex justify-center py-2 relative">
              <Visualizer theme={visualTheme} isActuallyPlaying={isPlaying} />
            </div>

            {/* Translucent AI input area according to the drawing */}
            <div className="w-full max-w-2xl bg-[#09090c]/80 border border-white/5 rounded-3xl p-6 shadow-2xl relative">
              <form onSubmit={handlePromptSubmit} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    disabled={isGenerating}
                    placeholder="Describe your sound vision in detail... (e.g., 'Warm cozy sunset lofi beat with dusty piano chords' or 'Intense driving cyberpunk techno with sub-bass sweeps')"
                    className="w-full h-28 bg-[#111114] text-white placeholder-white/20 rounded-2xl p-5 border border-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/10 focus:outline-none transition-all text-xs font-sans resize-none leading-relaxed pr-12 scrollbar-none shadow-inner"
                  />
                  
                  {/* Arrow Send Button */}
                  <button
                    type="submit"
                    disabled={isGenerating || !promptInput.trim()}
                    className="absolute bottom-4 right-4 p-3 rounded-xl bg-white text-black hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-20 transition-all flex items-center justify-center cursor-pointer shadow-lg"
                    style={{ 
                      backgroundColor: promptInput.trim() && !isGenerating ? activeTheme.accent : undefined,
                      color: promptInput.trim() && !isGenerating ? '#050508' : undefined
                    }}
                  >
                    {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>

                {isGenerating && (
                  <div className="flex items-center justify-center space-x-2 text-xs text-white/40 animate-pulse font-medium">
                    <Loader2 size={13} className="animate-spin" style={{ color: activeTheme.accent }} />
                    <span>Gemini AI is composing a celestial soundtrack matching your prompt...</span>
                  </div>
                )}

                {apiError && (
                  <div className="bg-red-950/20 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-sans space-y-1 text-left">
                    <div className="font-bold flex items-center space-x-1 uppercase text-[10px] tracking-wider">
                      <span>⚠️ COMPOSITION RUNTIME ERROR</span>
                    </div>
                    <p className="opacity-80">{apiError}</p>
                    {apiError.includes('GEMINI_API_KEY') && (
                      <p className="text-[10px] text-red-400/50 pt-1 border-t border-red-500/10 mt-1">
                        * Resolution: Please register your <strong>GEMINI_API_KEY</strong> inside the [Settings &gt; Secrets] panel in your AI Studio dashboard to authorize voice synthesis.
                      </p>
                    )}
                  </div>
                )}
              </form>

              {/* Suggested Tags Area */}
              <div className="mt-5 space-y-2 border-t border-white/5 pt-4">
                <span className="text-[9px] font-sans font-extrabold tracking-widest text-[#FFF]/30 uppercase block select-none">
                  LO-FI HIP HOP • DEEP TECHNO • AMBIENT PIANO • chiptune
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_SUGGESTIONS.map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleChipClick(tag)}
                      disabled={isGenerating}
                      className="px-2.5 py-1 text-[10px] font-medium text-white/40 bg-[#121215] border border-white/5 hover:bg-white/5 hover:text-white rounded-lg transition-all truncate text-left cursor-pointer"
                    >
                      {tag.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fast Load Soundboard Presets */}
            <div className="w-full max-w-2xl bg-[#09090c]/40 border border-white/5 p-4 rounded-2xl shadow-md font-sans">
              <span className="text-[9px] font-sans font-extrabold tracking-widest text-white/30 uppercase block select-none mb-2 text-center">
                SOUNDBOARD PRESETS (INSTANT OFFLINE PLAYBACK)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleLoadPreset(preset)}
                    className="p-3 bg-[#111114]/40 hover:bg-[#111114]/80 border border-white/5 hover:border-white/10 rounded-xl transition text-left cursor-pointer flex flex-col justify-between group"
                  >
                    <span className="text-[10px] font-extrabold text-white/80 group-hover:text-[#FFF] truncate w-full uppercase tracking-tight">
                      {preset.name}
                    </span>
                    <span className="text-[8px] text-white/20 mt-1 font-mono tracking-wider w-full truncate font-medium">
                      {preset.bpm} BPM / {preset.visualTheme.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* EXPANDABLE COMPOSITION GRID & SYNTHESIZER CABINET */}
            {advancedMode && (
              <div className="w-full max-w-2xl bg-[#09090c]/80 border border-white/5 rounded-2xl p-4 shadow-md space-y-4 font-sans border-t-2 animate-fade-in" style={{ borderTopColor: activeTheme.accent }}>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowSequencer(!showSequencer)}
                    className="flex items-center space-x-2 text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                  >
                    <SlidersHorizontal size={14} style={{ color: activeTheme.accent }} />
                    <span>🎛️ {showSequencer ? "Manual Sequencer & Synth (Hide)" : "Manual Sequencer & Synth (Show)"}</span>
                  </button>
                  
                  {/* DYNAMIC METERS & MOOD TUNING DECK */}
                  <span className="text-[10px] font-bold text-white/50 tracking-wider">
                    {patterns.timeSignature || '4/4'} METER • {patterns.variationStyle ? patterns.variationStyle.toUpperCase() : 'PROGRESSION'} STYLE
                  </span>
                </div>

                {/* --- AETHER PERFORMANCE ENGINE DECK --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 pt-1 border-b border-light-white/5 border-zinc-800/40 text-sans">
                  {/* 1. Time Signature Select */}
                  <div className="flex flex-col space-y-1.5 text-left">
                    <label className="text-[9px] font-extrabold tracking-widest text-[#FFF]/40 uppercase">TIME SIGNATURE</label>
                    <div className="grid grid-cols-4 gap-1">
                      {(['4/4', '3/4', '5/4', '6/8'] as const).map((m) => {
                        const currentSig = patterns.timeSignature || '4/4';
                        const isSelected = currentSig === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              const updated = { ...patterns, timeSignature: m };
                              setPatterns(updated);
                              audioEngine.updatePatterns(updated);
                            }}
                            className={`text-[10px] py-1.5 rounded-lg border font-bold transition-all cursor-pointer text-center ${
                              isSelected
                                ? 'bg-white/10 text-white'
                                : 'bg-[#111114]/40 border-white/5 text-white/40 hover:text-white/70 hover:bg-[#111114]/80'
                            }`}
                            style={{
                              borderColor: isSelected ? activeTheme.accent : 'rgba(255,255,255,0.05)',
                            }}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Variation Style Select */}
                  <div className="flex flex-col space-y-1.5 text-left">
                    <label className="text-[9px] font-extrabold tracking-widest text-[#FFF]/40 uppercase">
                      VARIATION STYLE
                    </label>
                    <select
                      value={patterns.variationStyle || 'progression'}
                      onChange={(e) => {
                        const updated = { ...patterns, variationStyle: e.target.value as any };
                        setPatterns(updated);
                        audioEngine.updatePatterns(updated);
                      }}
                      disabled={!variationEnabled}
                      className="w-full bg-[#111114] text-xs text-white/80 rounded-lg p-2 border border-white/10 focus:border-white/20 focus:outline-none transition-all disabled:opacity-30 cursor-pointer font-bold h-[32px]"
                    >
                      <option value="progression">Original Majestic Modulation</option>
                      <option value="minimal">Minimal Techno Drops & Fills</option>
                      <option value="jazz">Jazz Shuffle Swing Bounce</option>
                      <option value="chiptune">Retro Chiptune Arpeggiator</option>
                      <option value="cyberpunk">Industrial Cyberpunk Grind Drive</option>
                      <option value="ambient">Ambient Cloud Frequency Sweep</option>
                      <option value="funky">Retro Funky Disco Slap Bass</option>
                      <option value="orchestral">Neo-Classical Epic Cinema Scale</option>
                    </select>
                  </div>
                </div>

                {/* Master Turn On Indicators & WAV trigger */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  {/* VARIATION MASTER TOGGLE */}
                  <div className="flex items-center space-x-2 bg-[#111114]/50 px-3 py-1.5 rounded-xl border border-white/5">
                    <span className="text-[9px] font-extrabold tracking-widest text-white/50 uppercase select-none">AI IMPROV VARIATION</span>
                    <button
                      type="button"
                      onClick={() => setVariationEnabled(!variationEnabled)}
                      className={`text-[9px] px-2 py-0.5 rounded-md font-bold tracking-tight transition-all cursor-pointer ${
                        variationEnabled 
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/20' 
                          : 'bg-white/5 text-white/30 border border-transparent'
                      }`}
                      style={{
                        borderColor: variationEnabled ? activeTheme.accent : undefined,
                        color: variationEnabled ? activeTheme.accent : undefined,
                        backgroundColor: variationEnabled ? `${activeTheme.accent}15` : undefined
                      }}
                    >
                      {variationEnabled ? 'ACTIVE' : 'STANDBY'}
                    </button>
                  </div>

                  {/* EXPORT DURATION SELECT CONTROLS */}
                  <div className="flex items-center space-x-2 bg-[#111114]/50 px-3 py-1.5 rounded-xl border border-white/5">
                    <span className="text-[9px] font-extrabold tracking-widest text-white/50 uppercase select-none">Length (길이)</span>
                    <div className="flex bg-black/40 rounded-lg p-0.5 gap-0.5 border border-white/5">
                      {([15, 30, 60, 120] as const).map((secs) => {
                        const labels = { 15: "15s", 30: "30s", 60: "1m", 120: "2m" };
                        const isSelected = exportDuration === secs;
                        return (
                          <button
                            key={secs}
                            type="button"
                            onClick={() => setExportDuration(secs)}
                            className={`text-[9px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer text-center ${
                              isSelected
                                ? 'bg-white text-zinc-950 shadow-sm'
                                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                            }`}
                          >
                            {labels[secs]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* VISIBLE HIGH-CONTRAST STUDIO DOWNLOAD */}
                  <button
                    type="button"
                    onClick={handleExportWav}
                    disabled={isExporting}
                    className="px-4 py-1.5 text-[10px] rounded-xl font-bold bg-[#FAF9F6] text-zinc-950 hover:bg-[#FAF9F6]/80 active:scale-95 transition-all text-center flex items-center justify-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-40"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 size={11} className="animate-spin" />
                        <span>EXPORTING WAV ({exportDuration >= 60 ? `${exportDuration / 60}M` : `${exportDuration}S`})...</span>
                      </>
                    ) : (
                      <>
                        <Download size={11} />
                        <span>DOWNLOAD MASTER WAV</span>
                      </>
                    )}
                  </button>
                </div>

                {showSequencer && (
                  <div className="space-y-6 pt-4 border-t border-white/5 animate-fade-in text-left">
                    <SequencerGrid 
                      patterns={patterns} 
                      onChange={setPatterns} 
                      activeStep={activeStep} 
                      isActuallyPlaying={isPlaying} 
                      accentColor={activeTheme.accent} 
                    />
                    
                    <SynthControls 
                      settings={settings} 
                      onChange={setSettings} 
                      accentColor={activeTheme.accent} 
                    />
                  </div>
                )}
              </div>
            )}

          </section>
        </main>
      </div>

      {/* FLOATING MASTER PERFORMANCE DECK / TRANSPORT CONTROL */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B0B0E]/90 backdrop-blur-2xl border-t border-white/5 p-4 py-3 select-none">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* VIBE SHIFTS */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[9px] font-sans font-extrabold tracking-widest text-white/30 uppercase">VIBE SHIFT</span>
            <div className="flex space-x-1">
              {(['cyber', 'cosmic', 'sunset', 'vaporwave', 'emerald'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setVisualTheme(t)}
                  className="w-5 h-5 rounded-full transition-all border shrink-0 hover:scale-110 active:scale-90 cursor-pointer flex items-center justify-center text-[10px] uppercase font-bold"
                  style={{ 
                    backgroundColor: THEME_CHIPS[t].accent,
                    borderColor: visualTheme === t ? '#FFF' : 'rgba(255,255,255,0.1)',
                    boxShadow: visualTheme === t ? `0 0 10px ${THEME_CHIPS[t].accent}` : undefined,
                  }}
                  title={`Shifter color: ${t}`}
                />
              ))}
            </div>
          </div>

          {/* MASTER PLAYER DEEPER DETAILS */}
          <div className="flex items-center space-x-4 bg-white/2 px-4 py-1.5 rounded-xl border border-white-[0.03] mx-auto md:mx-0 truncate max-w-xs md:max-w-md">
            
            {/* BIG PLAY CONTROLLER */}
            <button
              onClick={togglePlay}
              className="p-3.5 rounded-full text-black flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 cursor-pointer shadow-lg transition-all"
              style={{ 
                backgroundColor: isPlaying ? '#FFF' : activeTheme.accent,
                boxShadow: `0 0 15px ${isPlaying ? 'rgba(255,255,255,0.3)' : activeTheme.accent}80` 
              }}
              title={isPlaying ? "Pause Beat" : "Play Beat"}
            >
              {isPlaying ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            </button>

            <div className="truncate text-left">
              <div className="flex items-center space-x-1.5 truncate">
                <Music size={11} style={{ color: activeTheme.accent }} className="shrink-0" />
                <span className="text-xs font-bold text-white uppercase tracking-tight truncate">{trackTitle}</span>
              </div>
              <p className="text-[9px] text-[#A1A1AA] truncate leading-none mt-0.5">{trackMood}</p>
            </div>
          </div>

          {/* PARAMETER MODIFIERS */}
          <div className="flex items-center space-x-4 shrink-0 justify-between w-full md:w-auto">
            
            {/* BPM */}
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-sans font-extrabold text-white/30 uppercase">BPM</span>
              <span className="text-xs font-bold text-white/80 font-mono w-8 text-right">{bpm}</span>
              <input
                type="range"
                min="60"
                max="180"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-20 sm:w-24 h-1 bg-[#222] rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: activeTheme.accent }}
              />
            </div>

            {/* VOLUME */}
            <div className="flex items-center space-x-2">
              <Volume2 size={12} className="text-white/30" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-16 h-1 bg-[#222] rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: activeTheme.accent }}
              />
            </div>

            <div className="w-[1px] h-4 bg-white/10" />

            {/* AI VARIATION TOGGLE */}
            <button
              onClick={() => setVariationEnabled(!variationEnabled)}
              className={`p-2 rounded-lg text-xs font-semibold cursor-pointer border transition-all flex items-center gap-1.5 ${
                variationEnabled 
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300' 
                  : 'border-white/5 hover:border-white/10 text-white/40 bg-[#121215]/80'
              }`}
              style={{
                borderColor: variationEnabled ? activeTheme.accent : undefined,
                backgroundColor: variationEnabled ? `${activeTheme.accent}15` : undefined,
                color: variationEnabled ? activeTheme.accent : undefined
              }}
              title="Toggle Live AI Improvisational Variations"
            >
              <Sparkles size={12} className={variationEnabled ? "animate-pulse" : ""} />
              <span className="hidden sm:inline uppercase text-[9px] tracking-wider font-extrabold">AI IMPROV</span>
            </button>

            {/* DOWNLOAD WAV WITH DURATION SELECT */}
            <div className="flex items-center space-x-1 border border-white/5 bg-[#121215]/80 hover:border-white/10 rounded-lg p-0.5">
              <select
                value={exportDuration}
                onChange={(e) => setExportDuration(Number(e.target.value))}
                className="bg-transparent text-[9px] font-sans font-black text-white/50 hover:text-white/85 transition-all focus:outline-none cursor-pointer px-1 py-0.5"
                title="WAV Export Duration (WAV 내보내기 길이 설정)"
              >
                <option value="15" className="bg-zinc-900 text-white">15s</option>
                <option value="30" className="bg-zinc-900 text-white">30s</option>
                <option value="60" className="bg-zinc-900 text-white">1m</option>
                <option value="120" className="bg-zinc-900 text-white">2m</option>
              </select>
              <div className="w-[1px] h-3 bg-white/10" />
              <button
                onClick={handleExportWav}
                disabled={isExporting}
                className="p-1 px-1.5 text-white/30 hover:text-[#3b82f6] rounded transition-all cursor-pointer flex items-center justify-center disabled:opacity-30"
                title={`Download clean sequence loop (${exportDuration >= 60 ? `${exportDuration / 60}m` : `${exportDuration}s`} WAV)`}
              >
                {isExporting ? <Loader2 size={11} className="animate-spin text-blue-400" /> : <Download size={11} />}
              </button>
            </div>

            {/* ERASE SHEET */}
            <button
              onClick={handleWipe}
              className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
              title="Clear patterns sheet"
            >
              <Trash2 size={13} />
            </button>
          </div>

        </div>
      </footer>
    </div>
  );
}
