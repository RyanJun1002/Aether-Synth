/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { GeneratedTrackResponse, GenerationHistoryItem } from '../types';
import { Music, Send, Loader2, Sparkles, FolderUp, History, Info } from 'lucide-react';

interface AIPromptProps {
  onGenerationComplete: (data: GeneratedTrackResponse) => void;
  accentColor: string;
}

const SUGGESTIONS = [
  "8-bit retro gaming chiptune with cute fast lead melody",
  "Dark heavy industrial techno with pounding kick drums and raw overdrive",
  "80s outrun synthwave with analog filter cutoff sweeps and stereo echo delay",
  "Ethereal cosmic ambient drift with spatial reverbs and very slow chords",
  "Sunset lofi hiphop beat with warm lazy bass sweeps and cozy cozy textures"
];

export default function AIPrompt({ onGenerationComplete, accentColor }: AIPromptProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('aethersynth_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not read generation history from localStorage:", e);
    }
  }, []);

  // Save item to history
  const saveToHistory = (item: GenerationHistoryItem) => {
    try {
      const updated = [item, ...history].slice(0, 10); // Keep last 10 entries
      setHistory(updated);
      localStorage.setItem('aethersynth_history', JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not write generation history to localStorage:", e);
    }
  };

  const handleSuggestClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Server returned an error whilst composing.');
      }

      // Success
      onGenerationComplete(resData);
      
      const newItem: GenerationHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        prompt: prompt.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        bpm: resData.bpm,
        themeName: resData.themeName
      };
      
      saveToHistory(newItem);
      setPrompt('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connecting to AetherSynth API failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Click history item to auto reload it (we save full track objects in history or trigger prompt again)
  const handleHistoryPromptClick = (histPrompt: string) => {
    setPrompt(histPrompt);
  };

  return (
    <div className="bg-[#0F0F11] border border-white/5 p-5 rounded-2xl shadow-lg space-y-5 animate-fade-in">
      <div className="flex items-center space-x-2">
        <Sparkles size={16} style={{ color: accentColor }} />
        <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-white">AI Sound Composer</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            placeholder="Describe the musical cosmos you want to build... (e.g. 'heavy distorted analog acid house' or 'soft spacey chill ambient')"
            className="w-full h-24 bg-[#151518] text-white placeholder-white/20 rounded-xl p-4 border border-white/10 focus:border-white/30 focus:outline-none transition-all text-xs font-sans resize-none leading-relaxed pr-10"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="absolute bottom-3 right-3 p-2 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-white/20 transition flex items-center justify-center cursor-pointer shadow-md"
            style={{ backgroundColor: prompt.trim() && !loading ? accentColor : undefined, color: prompt.trim() && !loading ? '#050505' : undefined }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs font-sans space-y-1.5 leading-snug">
            <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wide">
              <Info size={12} />
              <span>Composition Error</span>
            </div>
            <p className="opacity-90">{error}</p>
            {error.includes('GEMINI_API_KEY') && (
              <p className="text-[10px] text-red-500/80 pt-1">
                Tip: Access the <strong className="text-neutral-300">Settings &gt; Secrets</strong> list on the upper right in the AI Studio editor interface and register your key.
              </p>
            )}
          </div>
        )}
      </form>

      {/* Suggested prompts list */}
      <div className="space-y-2">
        <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-white/30 select-none">Sonic Inspirations</span>
        <div className="flex flex-wrap gap-1.5 items-center">
          {SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestClick(suggestion)}
              disabled={loading}
              className="px-2.5 py-1 text-[10px] font-sans font-medium text-white/50 bg-[#151518] border border-white/5 hover:bg-white/5 hover:text-white rounded-full transition max-w-full truncate text-left cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Generation History Tracker */}
      {history.length > 0 && (
        <div className="border-t border-white/5 pt-3.5 space-y-2">
          <div className="flex items-center space-x-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-white/30 select-none">
            <History size={11} />
            <span>Creation Log</span>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {history.map((item) => (
              <div 
                key={item.id}
                onClick={() => handleHistoryPromptClick(item.prompt)}
                className="flex items-center justify-between p-2 rounded-lg bg-[#151518]/40 hover:bg-[#151518] border border-white/5 cursor-pointer transition text-[10px] font-sans group"
              >
                <div className="flex items-center space-x-2 truncate pr-2">
                  <Music size={10} className="text-white/20 group-hover:text-white/60 shrink-0" />
                  <span className="text-white/80 font-semibold truncate uppercase tracking-tight">{item.themeName}</span>
                  <span className="text-white/30 truncate hidden md:inline text-[9px]">({item.prompt})</span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[9px] text-white/20 font-mono">{item.timestamp}</span>
                  <span className="px-1.5 py-0.5 text-[8px] bg-[#0A0A0B]/80 text-[#3b82f6] rounded border border-white/5 font-mono">{item.bpm} BPM</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
