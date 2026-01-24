import { useState, useRef, useCallback, useEffect } from 'react';

interface BufferingMetrics {
  reelId: string;
  bufferingStartTime: number | null;
  totalBufferingMs: number;
  bufferingCount: number;
  loadStartTime: number | null;
  timeToFirstFrame: number | null;
}

interface TransitionState {
  isTransitioning: boolean;
  fromIndex: number | null;
  toIndex: number | null;
  fadeOpacity: number;
}

/**
 * Manages full-screen transitions between reels with consistent black fade
 * and logs buffering time per reel for performance tuning.
 */
export const useReelTransitionManager = () => {
  const [transitionState, setTransitionState] = useState<TransitionState>({
    isTransitioning: false,
    fromIndex: null,
    toIndex: null,
    fadeOpacity: 0,
  });

  const metricsRef = useRef<Map<string, BufferingMetrics>>(new Map());
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, []);

  /**
   * Start tracking metrics for a reel when it begins loading
   */
  const startLoadTracking = useCallback((reelId: string) => {
    const existing = metricsRef.current.get(reelId);
    if (!existing) {
      metricsRef.current.set(reelId, {
        reelId,
        bufferingStartTime: null,
        totalBufferingMs: 0,
        bufferingCount: 0,
        loadStartTime: performance.now(),
        timeToFirstFrame: null,
      });
    } else {
      // Reset load start time for re-loads
      existing.loadStartTime = performance.now();
      existing.timeToFirstFrame = null;
    }
  }, []);

  /**
   * Mark when the first frame is rendered (video ready)
   */
  const markFirstFrame = useCallback((reelId: string) => {
    const metrics = metricsRef.current.get(reelId);
    if (metrics && metrics.loadStartTime && metrics.timeToFirstFrame === null) {
      metrics.timeToFirstFrame = performance.now() - metrics.loadStartTime;
      console.log(`[TransitionManager] Reel ${reelId.slice(0, 8)} - Time to first frame: ${metrics.timeToFirstFrame.toFixed(0)}ms`);
    }
  }, []);

  /**
   * Start buffering timer for a reel
   */
  const startBuffering = useCallback((reelId: string) => {
    let metrics = metricsRef.current.get(reelId);
    if (!metrics) {
      metrics = {
        reelId,
        bufferingStartTime: null,
        totalBufferingMs: 0,
        bufferingCount: 0,
        loadStartTime: null,
        timeToFirstFrame: null,
      };
      metricsRef.current.set(reelId, metrics);
    }
    
    if (metrics.bufferingStartTime === null) {
      metrics.bufferingStartTime = performance.now();
      metrics.bufferingCount++;
    }
  }, []);

  /**
   * Stop buffering timer and log the duration
   */
  const stopBuffering = useCallback((reelId: string) => {
    const metrics = metricsRef.current.get(reelId);
    if (metrics && metrics.bufferingStartTime !== null) {
      const bufferingDuration = performance.now() - metrics.bufferingStartTime;
      metrics.totalBufferingMs += bufferingDuration;
      metrics.bufferingStartTime = null;
      
      console.log(`[TransitionManager] Reel ${reelId.slice(0, 8)} - Buffering event: ${bufferingDuration.toFixed(0)}ms (total: ${metrics.totalBufferingMs.toFixed(0)}ms, count: ${metrics.bufferingCount})`);
    }
  }, []);

  /**
   * Get metrics summary for a reel
   */
  const getMetrics = useCallback((reelId: string): BufferingMetrics | undefined => {
    return metricsRef.current.get(reelId);
  }, []);

  /**
   * Log all metrics for debugging
   */
  const logAllMetrics = useCallback(() => {
    console.log('[TransitionManager] === All Reel Metrics ===');
    metricsRef.current.forEach((metrics, id) => {
      console.log(`  ${id.slice(0, 8)}: TTF=${metrics.timeToFirstFrame?.toFixed(0) ?? 'N/A'}ms, TotalBuffer=${metrics.totalBufferingMs.toFixed(0)}ms, BufferCount=${metrics.bufferingCount}`);
    });
  }, []);

  /**
   * Initiate a transition between reels with black fade
   */
  const startTransition = useCallback((fromIndex: number | null, toIndex: number) => {
    // Clear any existing transition
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    setTransitionState({
      isTransitioning: true,
      fromIndex,
      toIndex,
      fadeOpacity: 1, // Start fully black
    });

    // Fade out the black overlay over 200ms
    let opacity = 1;
    fadeIntervalRef.current = setInterval(() => {
      opacity -= 0.1;
      if (opacity <= 0) {
        opacity = 0;
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        setTransitionState(prev => ({
          ...prev,
          isTransitioning: false,
          fadeOpacity: 0,
        }));
      } else {
        setTransitionState(prev => ({
          ...prev,
          fadeOpacity: opacity,
        }));
      }
    }, 20); // ~10 steps over 200ms

    // Fallback timeout to ensure transition ends
    transitionTimeoutRef.current = setTimeout(() => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      setTransitionState({
        isTransitioning: false,
        fromIndex: null,
        toIndex: null,
        fadeOpacity: 0,
      });
    }, 300);
  }, []);

  /**
   * Force end transition immediately
   */
  const endTransition = useCallback(() => {
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    setTransitionState({
      isTransitioning: false,
      fromIndex: null,
      toIndex: null,
      fadeOpacity: 0,
    });
  }, []);

  return {
    transitionState,
    startTransition,
    endTransition,
    startLoadTracking,
    markFirstFrame,
    startBuffering,
    stopBuffering,
    getMetrics,
    logAllMetrics,
  };
};

export type ReelTransitionManager = ReturnType<typeof useReelTransitionManager>;
