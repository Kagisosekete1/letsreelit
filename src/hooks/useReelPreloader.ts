import { useEffect, useRef } from 'react';

interface ReelData {
  video_url: string;
  thumbnail_url?: string | null;
}

/**
 * Optimized reel preloader - prefetches next reel's video + thumbnail
 * using lightweight link prefetch to prevent DOM pressure and playback jamming.
 * 
 * Key optimizations:
 * - Uses link prefetch instead of video elements
 * - Debounces prefetch requests to prevent rapid state changes
 * - Limits concurrent prefetches
 * - Cleans up old links to prevent memory leaks
 */
export const useReelPreloader = (
  reels: ReelData[],
  activeIndex: number,
  prefetchCount: number = 1 // Reduced from 2 to 1 for better performance
) => {
  const preloadedUrls = useRef<Set<string>>(new Set());
  const linkElements = useRef<Map<string, HTMLLinkElement>>(new Map());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Debounce prefetch to prevent rapid changes during scroll
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      // Determine which reels to prefetch (next N reels only)
      const urlsToPrefetch: Set<string> = new Set();
      
      for (let i = 1; i <= prefetchCount; i++) {
        const nextIndex = activeIndex + i;
        if (nextIndex < reels.length) {
          const reel = reels[nextIndex];
          if (reel.video_url && !preloadedUrls.current.has(reel.video_url)) {
            urlsToPrefetch.add(reel.video_url);
          }
          if (reel.thumbnail_url && !preloadedUrls.current.has(reel.thumbnail_url)) {
            urlsToPrefetch.add(reel.thumbnail_url);
          }
        }
      }

      // Prefetch previous reel for smooth back-scrolling (only if not already cached)
      if (activeIndex > 0) {
        const prevReel = reels[activeIndex - 1];
        if (prevReel.video_url && !preloadedUrls.current.has(prevReel.video_url)) {
          urlsToPrefetch.add(prevReel.video_url);
        }
      }

      // Create prefetch links for new URLs
      urlsToPrefetch.forEach((url) => {
        if (preloadedUrls.current.has(url)) return;
        
        preloadedUrls.current.add(url);
        
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = url.includes('thumbnail') || url.match(/\.(jpg|jpeg|png|webp|gif)/i) ? 'image' : 'video';
        link.href = url;
        document.head.appendChild(link);
        linkElements.current.set(url, link);
      });

      // Cleanup old links that are far from current position (memory management)
      const maxCachedUrls = (prefetchCount + 2) * 2; // Allow some buffer
      if (preloadedUrls.current.size > maxCachedUrls) {
        const urlsToRemove: string[] = [];
        let count = 0;
        
        preloadedUrls.current.forEach((url) => {
          if (count >= preloadedUrls.current.size - maxCachedUrls) return;
          urlsToRemove.push(url);
          count++;
        });

        urlsToRemove.forEach((url) => {
          const link = linkElements.current.get(url);
          if (link) {
            try {
              document.head.removeChild(link);
            } catch {
              // ignore
            }
            linkElements.current.delete(url);
          }
          preloadedUrls.current.delete(url);
        });
      }
    }, 150); // 150ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [reels, activeIndex, prefetchCount]);

  // Cleanup all links on unmount
  useEffect(() => {
    return () => {
      linkElements.current.forEach((link) => {
        try {
          document.head.removeChild(link);
        } catch {
          // ignore
        }
      });
      linkElements.current.clear();
      preloadedUrls.current.clear();
    };
  }, []);
};
