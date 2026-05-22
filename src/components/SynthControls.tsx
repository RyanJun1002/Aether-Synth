/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SynthSettings } from '../types';
import { Sliders, Activity, Zap, Layers } from 'lucide-react';

interface SynthControlsProps {
  settings: SynthSettings;
  onChange: (settings: SynthSettings) => void;
  accentColor: string;
}

export default function SynthControls({ settings, onChange, accentColor }: SynthControlsProps) {
  
  const setParam = (key: keyof SynthSettings, val: number) => {
    const next = { ...settings, [key]: val };
    onChange(next);
  };

  return (
    <div className="bg-[#0F0F11] border border-white/5 p-5 rounded-2xl shadow-lg">
      <div className="flex items-center space-x-2 mb-4">
        <Sliders size={16} className="text-white/30" />
        <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-white">Analog Synth Parameters & Timbres</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Instrument Voices Section */}
        <div className="space-y-4 bg-[#151518] p-4 rounded-xl border border-white/5">
          <div className="flex items-center space-x-1.5 text-[10px] font-sans font-bold text-white/40 border-b border-white/5 pb-1.5 mb-2 uppercase tracking-wider">
            <Sliders size={12} style={{ color: accentColor }} />
            <span>Companion Voices (반주 악기)</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[9px] text-white/40 mb-1 font-semibold uppercase tracking-wider">Lead Synth (멜로디 건반)</label>
              <select
                value={settings.leadInstrument || 'saw'}
                onChange={(e) => setParam('leadInstrument', e.target.value as any)}
                className="w-full text-xs bg-[#0F0F11] border border-white/5 text-white/90 p-2 rounded-lg outline-none tracking-wide cursor-pointer hover:border-white/10 transition-colors"
              >
                <option value="saw">🎹 Analog Sawtooth</option>
                <option value="square">👾 Chiptune Square</option>
                <option value="pad">☁️ Warm Ambient Pad</option>
                <option value="epiano">✨ Electric Rhodes EP</option>
                <option value="triangle">🎵 Pure Triangle Flute</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] text-white/40 mb-1 font-semibold uppercase tracking-wider">Bell/Pluck (바른 반주)</label>
              <select
                value={settings.synth2Instrument || 'chime'}
                onChange={(e) => setParam('synth2Instrument', e.target.value as any)}
                className="w-full text-xs bg-[#0F0F11] border border-white/5 text-white/90 p-2 rounded-lg outline-none tracking-wide cursor-pointer hover:border-white/10 transition-colors"
              >
                <option value="chime">💎 Crystal Sine Chime</option>
                <option value="celesta">🔔 Classical Celesta</option>
                <option value="musicbox">🧸 Nostalgic Music Box</option>
                <option value="pad">🌌 Cosmic Bell Pad</option>
                <option value="epiano">⚡ FM Electric Keys</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] text-white/40 mb-1 font-semibold uppercase tracking-wider">Bass Voice (베이스 노선)</label>
              <select
                value={settings.bassInstrument || 'triangle'}
                onChange={(e) => setParam('bassInstrument', e.target.value as any)}
                className="w-full text-xs bg-[#0F0F11] border border-white/5 text-white/90 p-2 rounded-lg outline-none tracking-wide cursor-pointer hover:border-white/10 transition-colors"
              >
                <option value="triangle">🎸 Sub Tri-Bass</option>
                <option value="saw">🔥 Resonant Acid Bass</option>
                <option value="sub">💥 Deep 808 Sine Sub</option>
                <option value="slap">🎙️ Retro Slap Bass Synth</option>
              </select>
            </div>
          </div>
        </div>

        {/* VCF - Voltage Controlled Filter Section */}
        <div className="space-y-4 bg-[#151518] p-4 rounded-xl border border-white/5">
          <div className="flex items-center space-x-1.5 text-[10px] font-sans font-bold text-white/40 border-b border-white/5 pb-1.5 mb-2 uppercase tracking-wider">
            <Activity size={12} style={{ color: accentColor }} />
            <span>Lowpass Filter (VCF)</span>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-sans mb-1">
              <span className="text-white/40">Cutoff Frequency</span>
              <span className="font-semibold text-white" style={{ color: accentColor }}>{settings.filterCutoff} Hz</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="50"
              value={settings.filterCutoff}
              onChange={(e) => setParam('filterCutoff', Number(e.target.value))}
              className="w-full accent-neutral-200 cursor-pointer h-1 bg-[#0A0A0B] rounded"
              style={{ accentColor }}
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-sans mb-1">
              <span className="text-white/40">Resonance (Q)</span>
              <span className="font-semibold text-white" style={{ color: accentColor }}>Q: {settings.filterResonance.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={settings.filterResonance}
              onChange={(e) => setParam('filterResonance', Number(e.target.value))}
              className="w-full accent-neutral-200 cursor-pointer h-1 bg-[#0A0A0B] rounded"
              style={{ accentColor }}
            />
          </div>
        </div>

        {/* Envelope Generator Section (ADSR) */}
        <div className="space-y-3 bg-[#151518] p-4 rounded-xl border border-white/5">
          <div className="flex items-center space-x-1.5 text-[10px] font-sans font-bold text-white/40 border-b border-white/5 pb-1.5 mb-2 uppercase tracking-wider">
            <Layers size={12} style={{ color: accentColor }} />
            <span>EG (ADSR Envelope)</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <div className="flex justify-between text-[10px] font-sans mb-0.5">
                <span className="text-white/40">Attack</span>
                <span className="text-white/80 font-semibold">{settings.attack.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="1.0"
                step="0.01"
                value={settings.attack}
                onChange={(e) => setParam('attack', Number(e.target.value))}
                className="w-full h-1 bg-[#0A0A0B] rounded appearance-none"
                style={{ accentColor }}
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-sans mb-0.5">
                <span className="text-white/40">Decay</span>
                <span className="text-white/80 font-semibold">{settings.decay.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.01"
                value={settings.decay}
                onChange={(e) => setParam('decay', Number(e.target.value))}
                className="w-full h-1 bg-[#0A0A0B] rounded appearance-none"
                style={{ accentColor }}
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-sans mb-0.5">
                <span className="text-white/40">Sustain</span>
                <span className="text-white/80 font-semibold">{(settings.sustain * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={settings.sustain}
                onChange={(e) => setParam('sustain', Number(e.target.value))}
                className="w-full h-1 bg-[#0A0A0B] rounded appearance-none"
                style={{ accentColor }}
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-sans mb-0.5">
                <span className="text-white/40">Release</span>
                <span className="text-white/80 font-semibold">{settings.release.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="2.0"
                step="0.05"
                value={settings.release}
                onChange={(e) => setParam('release', Number(e.target.value))}
                className="w-full h-1 bg-[#0A0A0B] rounded appearance-none"
                style={{ accentColor }}
              />
            </div>
          </div>
        </div>

        {/* Master Effects - Delay & Overdrive */}
        <div className="space-y-4 bg-[#151518] p-4 rounded-xl border border-white/5">
          <div className="flex items-center space-x-1.5 text-[10px] font-sans font-bold text-white/40 border-b border-white/5 pb-1.5 mb-2 uppercase tracking-wider">
            <Zap size={12} style={{ color: accentColor }} />
            <span>Master Effects FX</span>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-sans mb-1">
              <span className="text-white/40">Echo Delay Time</span>
              <span className="font-semibold text-white" style={{ color: accentColor }}>{settings.delayTime.toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={settings.delayTime}
              onChange={(e) => setParam('delayTime', Number(e.target.value))}
              className="w-full accent-neutral-200 cursor-pointer h-1 bg-[#0A0A0B] rounded"
              style={{ accentColor }}
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-sans mb-1">
              <span className="text-white/40">Overdrive Distortion</span>
              <span className="font-semibold text-white" style={{ color: accentColor }}>{(settings.distortion * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={settings.distortion}
              onChange={(e) => setParam('distortion', Number(e.target.value))}
              className="w-full accent-neutral-200 cursor-pointer h-1 bg-[#0A0A0B] rounded"
              style={{ accentColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
