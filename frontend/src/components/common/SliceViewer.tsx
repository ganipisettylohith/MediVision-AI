import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Eye, Flame } from 'lucide-react';
import { ScanSeries } from '../../types';

interface SliceViewerProps {
  series: ScanSeries;
}

export const SliceViewer: React.FC<SliceViewerProps> = ({ series }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentIdx(prev => Math.min(prev + 1, series.slices.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIdx(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [series.slices.length]);

  const activeSlice = series.slices[currentIdx];
  if (!activeSlice) return null;

  const getImageUrl = (urlPath?: string) => {
    if (!urlPath) return undefined;
    if (urlPath.startsWith('http')) return urlPath;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const serverHost = baseUrl.replace('/api/v1', '');
    return `${serverHost}${urlPath}`;
  };

  const transitionStyle = prefersReducedMotion ? 'none' : 'all 150ms ease-out';

  return (
    <div ref={containerRef} className="space-y-4 focus:outline-none" tabIndex={0}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-cyan-400">
          <Eye className="h-4 w-4" />
          <span className="font-bold text-xs uppercase tracking-wider">Multi-slice Stack Viewer</span>
        </div>
        <span className="text-[10px] text-slate-400 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
          Slice {currentIdx + 1} of {series.slices.length}
        </span>
      </div>

      {/* Main Slice Viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-850 bg-slate-950 aspect-video flex items-center justify-center p-2">
        {/* Original Base Image */}
        {activeSlice.original_url ? (
          <img
            src={getImageUrl(activeSlice.original_url)}
            alt={`Slice ${currentIdx}`}
            className="max-h-full max-w-full rounded-xl object-contain absolute z-0"
            style={{ transition: transitionStyle }}
          />
        ) : (
          <div className="text-xs text-slate-600">Original image unavailable</div>
        )}

        {/* Heatmap Overlay */}
        {activeSlice.heatmap_url && (
          <img
            src={getImageUrl(activeSlice.heatmap_url)}
            alt={`Heatmap Slice ${currentIdx}`}
            className="max-h-full max-w-full rounded-xl object-contain absolute z-10 mix-blend-screen pointer-events-none"
            style={{
              opacity: overlayOpacity / 100,
              transition: transitionStyle
            }}
          />
        )}

        {/* Navigation Overlays */}
        <button
          onClick={() => setCurrentIdx(prev => Math.max(prev - 1, 0))}
          disabled={currentIdx === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed z-20"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCurrentIdx(prev => Math.min(prev + 1, series.slices.length - 1))}
          disabled={currentIdx === series.slices.length - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed z-20"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Status bar */}
        <div className="absolute bottom-2 left-2 right-2 bg-slate-950/90 border border-slate-850 px-3 py-1.5 rounded-xl flex items-center justify-between z-20">
          <span className="text-[10px] text-slate-300 font-medium truncate">{activeSlice.filename}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-bold uppercase">
            {activeSlice.prediction_class} ({Math.round(activeSlice.confidence_score * 100)}%)
          </span>
        </div>
      </div>

      {/* Slide / Opacity Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Slider Navigation */}
        <div className="flex items-center space-x-3 bg-slate-900/50 p-3 rounded-xl border border-slate-850">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Slice Stack</span>
          <input
            type="range"
            min="0"
            max={series.slices.length - 1}
            value={currentIdx}
            onChange={(e) => setCurrentIdx(Number(e.target.value))}
            className="flex-1 accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>

        {/* Opacity Control */}
        <div className="flex items-center space-x-3 bg-slate-900/50 p-3 rounded-xl border border-slate-850">
          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Flame className="h-3 w-3 text-cyan-400" />
            Heatmap Opacity
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
            className="flex-1 accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <span className="text-[11px] font-bold text-cyan-400 w-8 text-right">{overlayOpacity}%</span>
        </div>
      </div>

      {/* Mini-map / Thumbnail strip */}
      <div className="space-y-1">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Thumbnail Map</span>
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
          {series.slices.map((slice, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg border overflow-hidden relative transition-all ${
                currentIdx === idx ? 'border-cyan-500 scale-95 ring-1 ring-cyan-500' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {slice.original_url ? (
                <img
                  src={getImageUrl(slice.original_url)}
                  alt={`Thumb ${idx}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[9px] text-slate-600 font-bold">
                  S{idx + 1}
                </div>
              )}
              {slice.prediction_class.toUpperCase() !== 'NORMAL' && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl-lg" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
