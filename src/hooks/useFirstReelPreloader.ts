import { useEffect, useRef } from 'react';

interface ReelData {
  video_url: string;
  thumbnail_url?: string | null;
}

/**
 * Lightweight preloader that warms the FIRST reel immediately on mount.
 * This ensures instant playback without any pause when the feed loads.
 * 
 * Uses a hidden video element to buffer the first chunk + load metadata,
 * so when the actual ReelCard mounts, the browser cache is already primed.
 */
export const useFirstReelPreloader = (reels: ReelData[]) => {
  const preloaderRef = useRef<HTMLVideoElement | null>(null);
  const hasPreloaded = useRef(false);

  useEffect(() => {
    // Only preload once, and only if we have reels
    if (hasPreloaded.current || reels.length === 0) return;
    
    const firstReel = reels[0];
    if (!firstReel?.video_url) return;

    hasPreloaded.current = true;

    // Create a hidden video element to warm the cache
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.style.position = 'absolute';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.style.left = '-9999px';
    
    // Set source and start buffering
    video.src = firstReel.video_url;
    
    // Append to DOM to trigger buffering
    document.body.appendChild(video);
    preloaderRef.current = video;

    // Start loading
    video.load();

    // Also preload thumbnail via Image
    if (firstReel.thumbnail_url) {
      const img = new Image();
      img.src = firstReel.thumbnail_url;
    }

    // Cleanup after a reasonable time or on unmount
    const cleanup = () => {
      if (preloaderRef.current) {
        try {
          preloaderRef.current.pause();
          preloaderRef.current.src = '';
          preloaderRef.current.load();
          document.body.removeChild(preloaderRef.current);
        } catch {
          // ignore
        }
        preloaderRef.current = null;
      }
    };

    // Remove preloader after 5 seconds (cache is warm by then)
    const timer = setTimeout(cleanup, 5000);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [reels]);
};
