/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { audioEngine } from '../utils/audioEngine';

interface VisualizerProps {
  theme: 'cyber' | 'cosmic' | 'sunset' | 'vaporwave' | 'emerald';
  isActuallyPlaying: boolean;
}

const THEME_COLORS: Record<string, { start: string; end: string; centerGlow: string; rayAlpha: string }> = {
  cyber: { start: '#3b82f6', end: '#60a5fa', centerGlow: 'rgba(59, 130, 246, 0.4)', rayAlpha: 'rgba(59, 130, 246, 0.8)' },
  cosmic: { start: '#8b5cf6', end: '#a78bfa', centerGlow: 'rgba(139, 92, 246, 0.4)', rayAlpha: 'rgba(139, 92, 246, 0.8)' },
  sunset: { start: '#f97316', end: '#fb923c', centerGlow: 'rgba(249, 115, 22, 0.4)', rayAlpha: 'rgba(249, 115, 22, 0.8)' },
  vaporwave: { start: '#f43f5e', end: '#f43f5e', centerGlow: 'rgba(244, 63, 94, 0.4)', rayAlpha: 'rgba(244, 63, 94, 0.8)' },
  emerald: { start: '#10b981', end: '#34d399', centerGlow: 'rgba(16, 185, 129, 0.4)', rayAlpha: 'rgba(16, 185, 129, 0.8)' },
};

export default function Visualizer({ theme, isActuallyPlaying }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const rotationAngle = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive Canvas Resizing using a ResizeObserver to prevent layout stretches
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(container);

    resizeCanvas();

    // Setup visual data
    let visualAnalyser = audioEngine.getAnalyserNode();
    const bufferLength = 64; // Smaller buffer size for elegant thick circular rays
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      
      // Clear with solid transparent black for smooth trace integration
      ctx.clearRect(0, 0, width, height);

      // Center coords
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.22;

      // Update rotation speed based on playing state
      if (isActuallyPlaying) {
        rotationAngle.current += 0.006;
      } else {
        rotationAngle.current += 0.002; // Slow breathing rotation
      }

      const colors = THEME_COLORS[theme];
      visualAnalyser = audioEngine.getAnalyserNode();

      // Draw background planetary rings (glowing orbits)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2.0, 0, Math.PI * 2);
      ctx.stroke();

      // Retrieve analyser data
      let averageVolume = 0;
      if (visualAnalyser && isActuallyPlaying) {
        visualAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        averageVolume = sum / bufferLength;
      } else {
        // Mock a natural breathing volume for resting state
        averageVolume = (Math.sin(Date.now() * 0.002) + 1.0) * 8 + 4;
      }

      // Compute dynamic breathing radius based on sound volume
      const dynamicRadius = baseRadius + (averageVolume / 255) * 45;

      // Draw Outer Neon Glow Backstage Shadow Circle
      ctx.save();
      ctx.shadowBlur = 40;
      ctx.shadowColor = colors.start;
      ctx.fillStyle = colors.centerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Equalizer Rays around the sphere
      const barCount = 48;
      for (let i = 0; i < barCount; i++) {
        const index = Math.floor((i / barCount) * bufferLength);
        const rawVal = visualAnalyser && isActuallyPlaying ? dataArray[index] : 0;
        
        // Simulating idle frequencies slightly
        const val = visualAnalyser && isActuallyPlaying 
          ? rawVal 
          : (Math.sin(i * 0.4 + Date.now() * 0.003) + 1) * 12 + 2;

        const maxRayHeight = 70;
        const rayHeight = (val / 255) * maxRayHeight;

        // Angle including rotation offset
        const angle = (i / barCount) * Math.PI * 2 + rotationAngle.current;

        const startX = centerX + Math.cos(angle) * dynamicRadius;
        const startY = centerY + Math.sin(angle) * dynamicRadius;
        const endX = centerX + Math.cos(angle) * (dynamicRadius + rayHeight);
        const endY = centerY + Math.sin(angle) * (dynamicRadius + rayHeight);

        // Gradient for each ray
        ctx.strokeStyle = colors.rayAlpha;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }

      // Draw center disc (CD Vinyl record layout!)
      ctx.fillStyle = '#0F0F12';
      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius * 0.88, 0, Math.PI * 2);
      ctx.fill();

      // Draw subtle orbital rings on the disc
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      // Center glowing core node
      const centerCoreRadius = Math.max(12, dynamicRadius * 0.18);
      ctx.fillStyle = colors.start;
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerCoreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Rotating shine sweep (Simulating vinyl look)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationAngle.current * 1.5);
      const gradientShine = ctx.createLinearGradient(-dynamicRadius, 0, dynamicRadius, 0);
      gradientShine.addColorStop(0, 'rgba(255, 255, 255, 0)');
      gradientShine.addColorStop(0.48, 'rgba(255, 255, 255, 0.01)');
      gradientShine.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
      gradientShine.addColorStop(0.52, 'rgba(255, 255, 255, 0.01)');
      gradientShine.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradientShine;
      ctx.fillRect(-dynamicRadius, -dynamicRadius, dynamicRadius * 2, dynamicRadius * 2);
      ctx.restore();

      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      resizeObserver.disconnect();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [theme, isActuallyPlaying]);

  return (
    <div ref={containerRef} className="w-full h-56 md:h-64 relative overflow-visible flex items-center justify-center">
      {/* Decorative center ring overlay */}
      <div 
        id="orb-aura"
        className="absolute inset-0 m-auto w-44 h-44 rounded-full border border-white/5 pointer-events-none transition-all duration-1000 -z-10 ease-out"
        style={{
          boxShadow: `0 0 60px ${THEME_COLORS[theme].centerGlow}`,
          transform: isActuallyPlaying ? 'scale(1.15)' : 'scale(1)'
        }}
      />
      <canvas ref={canvasRef} className="w-full h-full block relative z-10" />
    </div>
  );
}
