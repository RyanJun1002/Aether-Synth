/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { SequencerPatterns, InstrumentType } from '../types';
import { Volume2, ChevronRight, Music, Disc } from 'lucide-react';

interface SequencerGridProps {
  patterns: SequencerPatterns;
  onChange: (patterns: SequencerPatterns) => void;
  activeStep: number;
  isActuallyPlaying: boolean;
  accentColor: string;
}

const BASS_PITCHES = ['C2', 'D2', 'Eb2', 'E2', 'F2', 'G2', 'A2', 'Bb2', 'C3', 'D3', 'Eb3', 'F3', 'G3', 'Bb3'];
const LEAD_PITCHES = ['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'A4', 'Bb4', 'C5', 'D5', 'Eb5', 'G5', 'A5', 'B5'];
const BELL_PITCHES = ['C5', 'Eb5', 'E5', 'G5', 'Ab5', 'Bb5', 'C6', 'D6', 'Eb6', 'F6', 'G6', 'Ab6', 'Bb6', 'C7'];

export default function SequencerGrid({
  patterns,
  onChange,
  activeStep,
  isActuallyPlaying,
  accentColor
}: SequencerGridProps) {
  const [editingCell, setEditingCell] = useState<{ instrument: 'bass' | 'lead' | 'synth2'; step: number } | null>(null);

  const getStepsPerLoopValue = (timeSig?: string): number => {
    switch (timeSig) {
      case '3/4': return 12;
      case '5/4': return 10;
      case '6/8': return 12;
      case '4/4':
      default:
        return 16;
    }
  };
  const activeStepsCount = getStepsPerLoopValue(patterns.timeSignature);

  // Toggle Drum Step
  const handleDrumToggle = (instrument: 'kick' | 'snare' | 'hihat' | 'perc', stepIndex: number) => {
    const currentArr = patterns[instrument] || Array(16).fill(0);
    const nextArr = [...currentArr];
    nextArr[stepIndex] = nextArr[stepIndex] === 1 ? 0 : 1;
    onChange({ ...patterns, [instrument]: nextArr });
  };

  // Toggle Synth/Note Step
  const handleSynthToggle = (instrument: 'bass' | 'lead' | 'synth2', stepIndex: number) => {
    const currentArr = patterns[instrument] || Array(16).fill(null);
    const nextArr = [...currentArr];
    const currentVal = nextArr[stepIndex];

    if (currentVal) {
      // Toggle off
      nextArr[stepIndex] = null;
      onChange({ ...patterns, [instrument]: nextArr });
      if (editingCell?.instrument === instrument && editingCell?.step === stepIndex) {
        setEditingCell(null);
      }
    } else {
      // Toggle on to a logical default root note
      const defaultNote = instrument === 'bass' ? 'C3' : instrument === 'lead' ? 'C5' : 'G5';
      nextArr[stepIndex] = defaultNote;
      onChange({ ...patterns, [instrument]: nextArr });
      // Open selector immediately for premium editing experience!
      setEditingCell({ instrument, step: stepIndex });
    }
  };

  // Update Note Pitch specifically
  const handlePitchSelect = (instrument: 'bass' | 'lead' | 'synth2', stepIndex: number, pitch: string) => {
    const currentArr = patterns[instrument] || Array(16).fill(null);
    const nextArr = [...currentArr];
    nextArr[stepIndex] = pitch;
    onChange({ ...patterns, [instrument]: nextArr });
    setEditingCell(null); // auto close
  };

  const drumLanes: { key: 'kick' | 'snare' | 'hihat' | 'perc'; label: string; icon: string }[] = [
    { key: 'kick', label: 'Kick', icon: '🥁' },
    { key: 'snare', label: 'Snare', icon: '⚡' },
    { key: 'hihat', label: 'Hi-Hat', icon: '✨' },
    { key: 'perc', label: 'Perc', icon: '👏' },
  ];

  return (
    <div className="bg-[#0F0F11] border border-white/5 p-4 md:p-6 rounded-2xl shadow-lg relative overflow-visible">
      {/* Header section explaining interactions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6 border-b border-white/5 pb-4">
        <div className="flex items-center space-x-2">
          <Disc className="text-white/30 animate-spin-slow" size={16} style={{ color: accentColor }} />
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-white">16-Step Step Sequencer Matrix</h3>
        </div>
        <p className="text-[11px] font-sans text-white/30">
          Click drums to toggle gates. Click synths to toggle &amp; edit notes.
        </p>
      </div>

      {/* Grid Canvas */}
      <div className="space-y-4">
        {/* Step Indicator Header Line */}
        <div className="flex items-center space-x-2">
          {/* Label Spacer */}
          <div className="w-16 md:w-24 shrink-0 text-right opacity-0 text-[10px] font-sans">Steps</div>
          {/* Timeline Grid */}
          <div className="grid grid-cols-16 gap-1 md:gap-1.5 flex-1 select-none">
            {Array.from({ length: 16 }).map((_, idx) => {
              const isDisabled = idx >= activeStepsCount;
              return (
                <div 
                  key={idx} 
                  className={`text-[10px] font-sans text-center pb-1 transition-all ${
                    isDisabled
                      ? 'opacity-10 text-zinc-600'
                      : isActuallyPlaying && activeStep === idx 
                        ? 'font-bold scale-110 text-white font-black' 
                        : 'text-white/30'
                  }`}
                  style={{ color: !isDisabled && isActuallyPlaying && activeStep === idx ? accentColor : undefined }}
                >
                  {(idx + 1).toString().padStart(2, '0')}
                </div>
              );
            })}
          </div>
        </div>

        {/* DRUMS MATRIX SECTION */}
        {drumLanes.map(({ key, label, icon }) => (
          <div key={key} className="flex items-center space-x-2">
            {/* Instrument Label */}
            <div className="w-16 md:w-24 shrink-0 flex items-center space-x-1.5 justify-end">
              <span className="text-sm">{icon}</span>
              <span className="text-[11px] font-sans text-white/60 font-medium truncate uppercase tracking-tight">{label}</span>
            </div>

            {/* Blocks */}
            <div className="grid grid-cols-16 gap-1 md:gap-1.5 flex-1 animate-fade-in">
              {(patterns[key] || Array(16).fill(0)).map((active, stepIdx) => {
                const isDisabled = stepIdx >= activeStepsCount;
                const isCurrent = isActuallyPlaying && activeStep === stepIdx && !isDisabled;
                const isBeatStart = stepIdx % 4 === 0;

                return (
                  <button
                    key={stepIdx}
                    id={`btn-${key}-${stepIdx}`}
                    onClick={() => !isDisabled && handleDrumToggle(key, stepIdx)}
                    disabled={isDisabled}
                    className={`h-8 min-w-0 rounded-md transition-all relative group flex items-center justify-center ${
                      isDisabled
                        ? 'opacity-[0.05] bg-black border-none cursor-not-allowed'
                        : active 
                          ? 'shadow-lg shadow-[#0A0A0B] scale-[1.02] cursor-pointer' 
                          : isBeatStart 
                            ? 'bg-[#151518]/80 hover:bg-[#151518] border border-white/10 cursor-pointer' 
                            : 'bg-[#0A0A0B]/80 hover:bg-[#151518]/50 border border-white/5 cursor-pointer'
                    } ${
                      isCurrent ? 'ring-2 ring-white/15' : ''
                    }`}
                    style={{
                      backgroundColor: !isDisabled && active ? accentColor : undefined,
                      borderColor: !isDisabled && active ? accentColor : undefined,
                    }}
                  >
                    {!isDisabled && (
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        active 
                          ? 'bg-[#0A0A0B]' 
                          : isCurrent 
                            ? 'bg-white/60 scale-125 animate-ping' 
                            : 'bg-transparent group-hover:bg-white/10'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Dividers */}
        <div className="h-[1px] bg-white/5 my-2" />

        {/* BASS MATRIX SECTION */}
        <div className="flex items-center space-x-2 relative">
          <div className="w-16 md:w-24 shrink-0 flex items-center space-x-1.5 justify-end">
            <span className="text-xs">🎸</span>
            <span className="text-[11px] font-sans text-white/60 font-medium select-none uppercase tracking-tight">Bass</span>
          </div>

          <div className="grid grid-cols-16 gap-1 md:gap-1.5 flex-1 relative">
            {patterns.bass.map((noteValue, stepIdx) => {
              const isDisabled = stepIdx >= activeStepsCount;
              const isCurrent = isActuallyPlaying && activeStep === stepIdx && !isDisabled;
              const hasNote = noteValue !== null && !isDisabled;
              const isBeatStart = stepIdx % 4 === 0;
              const isEditing = editingCell?.instrument === 'bass' && editingCell?.step === stepIdx && !isDisabled;

              return (
                <div key={stepIdx} className="relative">
                  <button
                    id={`btn-bass-${stepIdx}`}
                    onClick={() => !isDisabled && handleSynthToggle('bass', stepIdx)}
                    disabled={isDisabled}
                    className={`w-full h-9 rounded-md transition-all relative flex flex-col items-center justify-center border text-[9px] font-sans overflow-hidden ${
                      isDisabled
                        ? 'opacity-[0.05] bg-black border-none cursor-not-allowed'
                        : hasNote 
                          ? 'text-black font-semibold cursor-pointer' 
                          : isBeatStart 
                            ? 'bg-[#151518]/80 hover:bg-[#151518] border-white/10 cursor-pointer' 
                            : 'bg-[#0A0A0B]/80 hover:bg-[#151518]/50 border-white/5 cursor-pointer'
                    } ${isCurrent ? 'ring-2 ring-white/15' : ''}`}
                    style={{
                      backgroundColor: !isDisabled && hasNote ? accentColor : undefined,
                      borderColor: !isDisabled && hasNote ? accentColor : undefined,
                      opacity: !isDisabled && hasNote ? 0.95 : 1
                    }}
                  >
                    {!isDisabled && (
                      <>
                        {hasNote ? (
                          <span className="truncate max-w-full px-0.5 text-black font-bold uppercase">{noteValue}</span>
                        ) : (
                          <span className="text-[8px] text-white/20 group-hover:text-white/40">+</span>
                        )}

                        {/* Miniature selection indicator ring */}
                        {isEditing && (
                          <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white/60 animate-bounce" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Inline Pitch Dropdown Popup Panel */}
                  {isEditing && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-[#151518] border border-white/10 p-2 rounded-xl grid grid-cols-3 gap-1 shadow-2xl w-28 md:w-36 animate-fade-in">
                      <div className="col-span-3 text-[9px] font-sans text-center text-white/40 border-b border-white/5 pb-1 mb-1 font-bold uppercase tracking-wide">
                        Select Pitch
                      </div>
                      {BASS_PITCHES.map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePitchSelect('bass', stepIdx, p)}
                          className={`p-1 text-[9px] font-sans rounded hover:bg-white/5 text-white/60 transition text-center ${
                            noteValue === p ? 'bg-white/10 text-white font-bold border border-white/10' : ''
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setEditingCell(null)}
                        className="col-span-3 mt-1 py-0.5 text-[8px] font-sans rounded bg-[#0A0A0B] hover:bg-white/5 text-white/30 text-center uppercase tracking-wide font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* LEAD MATRIX SECTION */}
        <div className="flex items-center space-x-2 relative">
          <div className="w-16 md:w-24 shrink-0 flex items-center space-x-1.5 justify-end">
            <span className="text-xs">🎹</span>
            <span className="text-[11px] font-sans text-white/60 font-medium select-none uppercase tracking-tight">Lead</span>
          </div>

          <div className="grid grid-cols-16 gap-1 md:gap-1.5 flex-1 relative">
            {patterns.lead.map((noteValue, stepIdx) => {
              const isDisabled = stepIdx >= activeStepsCount;
              const isCurrent = isActuallyPlaying && activeStep === stepIdx && !isDisabled;
              const hasNote = noteValue !== null && !isDisabled;
              const isBeatStart = stepIdx % 4 === 0;
              const isEditing = editingCell?.instrument === 'lead' && editingCell?.step === stepIdx && !isDisabled;

              return (
                <div key={stepIdx} className="relative">
                  <button
                    id={`btn-lead-${stepIdx}`}
                    onClick={() => !isDisabled && handleSynthToggle('lead', stepIdx)}
                    disabled={isDisabled}
                    className={`w-full h-9 rounded-md transition-all relative flex flex-col items-center justify-center border text-[9px] font-sans overflow-hidden ${
                      isDisabled
                        ? 'opacity-[0.05] bg-black border-none cursor-not-allowed'
                        : hasNote 
                          ? 'text-black font-semibold cursor-pointer' 
                          : isBeatStart 
                            ? 'bg-[#151518]/80 hover:bg-[#151518] border-white/10 cursor-pointer' 
                            : 'bg-[#0A0A0B]/80 hover:bg-[#151518]/50 border-white/5 cursor-pointer'
                    } ${isCurrent ? 'ring-2 ring-white/15' : ''}`}
                    style={{
                      backgroundColor: !isDisabled && hasNote ? accentColor : undefined,
                      borderColor: !isDisabled && hasNote ? accentColor : undefined,
                      opacity: !isDisabled && hasNote ? 0.95 : 1
                    }}
                  >
                    {!isDisabled && (
                      <>
                        {hasNote ? (
                          <span className="truncate max-w-full px-0.5 text-black font-bold uppercase">{noteValue}</span>
                        ) : (
                          <span className="text-[8px] text-white/20 group-hover:text-white/40">+</span>
                        )}

                        {isEditing && (
                          <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white/60 animate-bounce" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Inline Pitch Dropdown Popup Panel */}
                  {isEditing && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-[#151518] border border-white/10 p-2 rounded-xl grid grid-cols-3 gap-1 shadow-2xl w-28 md:w-36 animate-fade-in">
                      <div className="col-span-3 text-[9px] font-sans text-center text-white/40 border-b border-white/5 pb-1 mb-1 font-bold uppercase tracking-wider">
                        Select Pitch
                      </div>
                      {LEAD_PITCHES.map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePitchSelect('lead', stepIdx, p)}
                          className={`p-1 text-[9px] font-sans rounded hover:bg-white/5 text-white/60 transition text-center ${
                            noteValue === p ? 'bg-white/10 text-white font-bold border border-white/10' : ''
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setEditingCell(null)}
                        className="col-span-3 mt-1 py-0.5 text-[8px] font-sans rounded bg-[#0A0A0B] hover:bg-white/5 text-white/30 text-center uppercase tracking-wide font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SYNTH 2 (BELL / PLUCK) MATRIX SECTION */}
        <div className="flex items-center space-x-2 relative">
          <div className="w-16 md:w-24 shrink-0 flex items-center space-x-1.5 justify-end">
            <span className="text-xs">🔔</span>
            <span className="text-[11px] font-sans text-white/60 font-medium select-none uppercase tracking-tight">Pluck</span>
          </div>

          <div className="grid grid-cols-16 gap-1 md:gap-1.5 flex-1 relative">
            {(patterns.synth2 || Array(16).fill(null)).map((noteValue, stepIdx) => {
              const isDisabled = stepIdx >= activeStepsCount;
              const isCurrent = isActuallyPlaying && activeStep === stepIdx && !isDisabled;
              const hasNote = noteValue !== null && !isDisabled;
              const isBeatStart = stepIdx % 4 === 0;
              const isEditing = editingCell?.instrument === 'synth2' && editingCell?.step === stepIdx && !isDisabled;

              return (
                <div key={stepIdx} className="relative">
                  <button
                    id={`btn-synth2-${stepIdx}`}
                    onClick={() => !isDisabled && handleSynthToggle('synth2', stepIdx)}
                    disabled={isDisabled}
                    className={`w-full h-9 rounded-md transition-all relative flex flex-col items-center justify-center border text-[9px] font-sans overflow-hidden ${
                      isDisabled
                        ? 'opacity-[0.05] bg-black border-none cursor-not-allowed'
                        : hasNote 
                          ? 'text-black font-semibold cursor-pointer' 
                          : isBeatStart 
                            ? 'bg-[#151518]/80 hover:bg-[#151518] border-white/10 cursor-pointer' 
                            : 'bg-[#0A0A0B]/80 hover:bg-[#151518]/50 border-white/5 cursor-pointer'
                    } ${isCurrent ? 'ring-2 ring-white/15' : ''}`}
                    style={{
                      backgroundColor: !isDisabled && hasNote ? accentColor : undefined,
                      borderColor: !isDisabled && hasNote ? accentColor : undefined,
                      opacity: !isDisabled && hasNote ? 0.95 : 1
                    }}
                  >
                    {!isDisabled && (
                      <>
                        {hasNote ? (
                          <span className="truncate max-w-full px-0.5 text-black font-bold uppercase">{noteValue}</span>
                        ) : (
                          <span className="text-[8px] text-white/20 group-hover:text-white/40">+</span>
                        )}

                        {isEditing && (
                          <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white/60 animate-bounce" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Inline Pitch Dropdown Popup Panel */}
                  {isEditing && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-[#151518] border border-white/10 p-2 rounded-xl grid grid-cols-3 gap-1 shadow-2xl w-28 md:w-36 animate-fade-in">
                      <div className="col-span-3 text-[9px] font-sans text-center text-white/40 border-b border-white/5 pb-1 mb-1 font-bold uppercase tracking-wider">
                        Select Pitch
                      </div>
                      {BELL_PITCHES.map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePitchSelect('synth2', stepIdx, p)}
                          className={`p-1 text-[9px] font-sans rounded hover:bg-white/5 text-white/60 transition text-center ${
                            noteValue === p ? 'bg-white/10 text-white font-bold border border-white/10' : ''
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setEditingCell(null)}
                        className="col-span-3 mt-1 py-0.5 text-[8px] font-sans rounded bg-[#0A0A0B] hover:bg-white/5 text-white/30 text-center uppercase tracking-wide font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
