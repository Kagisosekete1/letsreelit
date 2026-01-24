import { useEffect, useRef } from 'react';

interface ReelData {
  video_url: string;
  thumbnail_url?: string | null;
}

/**
 * Lightweight preloader that warms the FIRST reel immediately on mount.
 * Uses link prefetch instead of creating video elements to reduce DOM pressure
 * and prevent playback jamming issues.
 */
export const useFirstReelPreloader = (reels: ReelData[]) => {
  const hasPreloaded = useRef(false);
  const linkRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    // Only preload once, and only if we have reels
    if (hasPreloaded.current || reels.length === 0) return;
    
    const firstReel = reels[0];
    if (!firstReel?.video_url) return;

    hasPreloaded.current = true;

    // Use link prefetch instead of video element - much lighter on DOM
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'video';
    link.href = firstReel.video_url;
    document.head.appendChild(link);
    linkRef.current = link;

    // Also preload thumbnail via Image (this is lightweight)
    if (firstReel.thumbnail_url) {
      const img = new Image();
      img.src = firstReel.thumbnail_url;
    }

    // Cleanup
    return () => {
      if (linkRef.current) {
        try {
          document.head.removeChild(linkRef.current);
        } catch {
          // ignore
        }
        linkRef.current = null;
      }
    };
  }, [reels]);
};
