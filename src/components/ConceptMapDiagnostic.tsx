/**
 * Diagnostic Tool for Concept Map Performance
 * 
 * Add this temporarily to debug lag issues
 * Shows real-time performance metrics
 */

import { useEffect, useRef, useState } from "react";

export function ConceptMapDiagnostic() {
  const [fps, setFps] = useState(60);
  const [renderCount, setRenderCount] = useState(0);
  const [lastHover, setLastHover] = useState<string>("None");
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current++;
    setRenderCount(renderCountRef.current);
  });

  useEffect(() => {
    let animationId: number;

    const measureFps = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const currentFps = Math.round(1000 / avgDelta);
      setFps(currentFps);

      animationId = requestAnimationFrame(measureFps);
    };

    animationId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Listen for hover events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'CANVAS') {
        setLastHover(new Date().toLocaleTimeString());
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const fpsColor = fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="fixed top-20 left-4 glass-panel-strong rounded-xl p-4 z-50 text-xs space-y-2 max-w-xs">
      <div className="text-white mb-2 border-b border-white/10 pb-2">
        🔍 Performance Diagnostic
      </div>

      <div className="flex justify-between">
        <span className="text-white/60">FPS:</span>
        <span className={`${fpsColor} font-mono`}>{fps}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-white/60">Renders:</span>
        <span className="text-white font-mono">{renderCount}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-white/60">Last Hover:</span>
        <span className="text-white/80 font-mono text-xs">{lastHover}</span>
      </div>

      <div className="pt-2 border-t border-white/10 text-white/50 text-xs">
        <div><strong>Good:</strong> FPS 55-60, Renders ≤ 50</div>
        <div><strong>Bad:</strong> FPS < 30, Renders > 100</div>
      </div>

      <div className="pt-2 text-white/40 text-xs">
        ⚡ Hover over nodes and watch metrics
      </div>
    </div>
  );
}
