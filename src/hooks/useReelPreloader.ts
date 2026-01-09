import { useEffect, useRef } from 'react';

interface ReelData {
  video_url: string;
  thumbnail_url?: string | null;
}

/**
 * Lightweight reel preloader - prefetches next reel's video + thumbnail
 * to make scrolling feel instant on mobile/tablet/laptop
 */
export const useReelPreloader = (
  reels: ReelData[],
  activeIndex: number,
  prefetchCount: number = 2
) => {
  const preloadedUrls = useRef<Set<string>>(new Set());
  const linkElements = useRef<HTMLLinkElement[]>([]);

  useEffect(() => {
    // Clean up old preload links
    linkElements.current.forEach((link) => {
      try {
        document.head.removeChild(link);
      } catch {
        // ignore if already removed
      }
    });
    linkElements.current = [];

    // Determine which reels to prefetch (next N reels)
    const toPrefetch: ReelData[] = [];
    for (let i = 1; i <= prefetchCount; i++) {
      const nextIndex = activeIndex + i;
      if (nextIndex < reels.length) {
        toPrefetch.push(reels[nextIndex]);
      }
    }

    // Also prefetch previous reel for smooth back-scrolling
    if (activeIndex > 0) {
      toPrefetch.push(reels[activeIndex - 1]);
    }

    toPrefetch.forEach((reel) => {
      // Prefetch video using link preload
      if (reel.video_url && !preloadedUrls.current.has(reel.video_url)) {
        preloadedUrls.current.add(reel.video_url);
        
        const videoLink = document.createElement('link');
        videoLink.rel = 'prefetch';
        videoLink.as = 'video';
        videoLink.href = reel.video_url;
        document.head.appendChild(videoLink);
        linkElements.current.push(videoLink);
      }

      // Prefetch thumbnail using link preload
      if (reel.thumbnail_url && !preloadedUrls.current.has(reel.thumbnail_url)) {
        preloadedUrls.current.add(reel.thumbnail_url);
        
        const imgLink = document.createElement('link');
        imgLink.rel = 'prefetch';
        imgLink.as = 'image';
        imgLink.href = reel.thumbnail_url;
        document.head.appendChild(imgLink);
        linkElements.current.push(imgLink);
      }
    });

    return () => {
      // Cleanup on unmount
      linkElements.current.forEach((link) => {
        try {
          document.head.removeChild(link);
        } catch {
          // ignore
        }
      });
    };
  }, [reels, activeIndex, prefetchCount]);

  // Also use Image preloading as a fallback for thumbnails
  useEffect(() => {
    const toPrefetch: string[] = [];
    
    for (let i = 1; i <= prefetchCount; i++) {
      const nextIndex = activeIndex + i;
      if (nextIndex < reels.length && reels[nextIndex].thumbnail_url) {
        toPrefetch.push(reels[nextIndex].thumbnail_url!);
      }
    }

    // Preload images using Image constructor (more reliable for images)
    toPrefetch.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, [reels, activeIndex, prefetchCount]);
};
