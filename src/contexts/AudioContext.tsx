import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';

interface AudioContextType {
  // Register a video element and get permission to play audio
  requestAudioFocus: (videoElement: HTMLVideoElement, reelId: string) => void;
  // Release audio focus when reel becomes inactive
  releaseAudioFocus: (reelId: string) => void;
  // Check if this reel currently has audio focus
  hasAudioFocus: (reelId: string) => boolean;
  // Global mute state (user preference)
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  // Silence all audio globally
  silenceAll: () => void;
  // Force cleanup all audio elements
  forceCleanupAll: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Track which reel currently has audio focus
  const activeReelIdRef = useRef<string | null>(null);
  // Store reference to the active video element
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  // Track all registered video elements
  const registeredVideos = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  // Global mute state - DEFAULT TO FALSE (sound ON)
  const [isMuted, setIsMutedState] = useState(() => {
    const saved = sessionStorage.getItem('reelAudioMuted');
    return saved === 'true';
  });

  // Persist mute preference
  const setIsMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
    sessionStorage.setItem('reelAudioMuted', String(muted));
  }, []);

  // Force mute and pause a single media element
  const forceSilenceElement = useCallback((el: HTMLMediaElement) => {
    try {
      el.pause();
      el.muted = true;
      el.volume = 0;
      if ('currentTime' in el) {
        el.currentTime = 0;
      }
    } catch {
      // ignore
    }
  }, []);

  // Silence all media elements except the active one
  const silenceAllExcept = useCallback((exceptElement?: HTMLVideoElement) => {
    // Silence registered videos
    registeredVideos.current.forEach((video) => {
      if (video === exceptElement) return;
      forceSilenceElement(video);
    });

    // CRITICAL: Also silence any unregistered media elements in the DOM
    document.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
      if (video === exceptElement) return;
      forceSilenceElement(video);
    });

    document.querySelectorAll<HTMLAudioElement>('audio').forEach((audio) => {
      forceSilenceElement(audio);
    });
  }, [forceSilenceElement]);

  // Silence everything including the active one
  const silenceAll = useCallback(() => {
    activeReelIdRef.current = null;
    activeVideoRef.current = null;
    silenceAllExcept(undefined);
  }, [silenceAllExcept]);

  // Force cleanup all audio - more aggressive than silenceAll
  const forceCleanupAll = useCallback(() => {
    activeReelIdRef.current = null;
    activeVideoRef.current = null;
    registeredVideos.current.clear();

    // Aggressively silence and reset all media
    document.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
      try {
        video.pause();
        video.muted = true;
        video.volume = 0;
        video.currentTime = 0;
        video.removeAttribute('src');
        video.load();
      } catch {
        // ignore
      }
    });

    document.querySelectorAll<HTMLAudioElement>('audio').forEach((audio) => {
      try {
        audio.pause();
        audio.muted = true;
        audio.volume = 0;
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audio.load();
      } catch {
        // ignore
      }
    });
  }, []);

  // Request audio focus for a reel
  const requestAudioFocus = useCallback((videoElement: HTMLVideoElement, reelId: string) => {
    // Register this video
    registeredVideos.current.set(reelId, videoElement);

    // If this reel already has focus, just ensure state is correct
    if (activeReelIdRef.current === reelId) {
      videoElement.muted = isMuted;
      if (!isMuted) {
        videoElement.volume = 1;
      }
      return;
    }

    // CRITICAL: Silence ALL other media first before granting focus
    silenceAllExcept(videoElement);

    // Grant focus to this reel
    activeReelIdRef.current = reelId;
    activeVideoRef.current = videoElement;

    // Apply mute state based on user preference
    videoElement.muted = isMuted;
    if (!isMuted) {
      videoElement.volume = 1;
    }
  }, [isMuted, silenceAllExcept]);

  // Release audio focus
  const releaseAudioFocus = useCallback((reelId: string) => {
    const video = registeredVideos.current.get(reelId);
    if (video) {
      forceSilenceElement(video);
      try {
        video.removeAttribute('src');
        video.load();
      } catch {
        // ignore
      }
    }

    if (activeReelIdRef.current === reelId) {
      activeReelIdRef.current = null;
      activeVideoRef.current = null;
    }

    registeredVideos.current.delete(reelId);
  }, [forceSilenceElement]);

  // Check if a reel has audio focus
  const hasAudioFocus = useCallback((reelId: string) => {
    return activeReelIdRef.current === reelId;
  }, []);

  // Sync mute state to active video when isMuted changes
  useEffect(() => {
    if (activeVideoRef.current) {
      activeVideoRef.current.muted = isMuted;
      if (!isMuted) {
        activeVideoRef.current.volume = 1;
      }
    }
  }, [isMuted]);

  // AGGRESSIVE periodic safety check - runs every 150ms to catch any stray audio
  useEffect(() => {
    const interval = setInterval(() => {
      const activeVideo = activeVideoRef.current;
      const activeReelId = activeReelIdRef.current;

      // Silence all videos that are NOT the active one
      document.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
        // Skip the active video
        if (activeVideo && video === activeVideo) {
          // Ensure active video respects mute state
          if (isMuted && !video.muted) {
            video.muted = true;
          }
          return;
        }

        // Any other video should be silent and paused
        if (!video.paused || !video.muted || video.volume > 0) {
          try {
            video.pause();
            video.muted = true;
            video.volume = 0;
          } catch {
            // ignore
          }
        }
      });

      // ALL audio elements should always be silent (we don't use audio elements)
      document.querySelectorAll<HTMLAudioElement>('audio').forEach((audio) => {
        if (!audio.paused || !audio.muted || audio.volume > 0) {
          try {
            audio.pause();
            audio.muted = true;
            audio.volume = 0;
          } catch {
            // ignore
          }
        }
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      forceCleanupAll();
    };
  }, [forceCleanupAll]);

  return (
    <AudioContext.Provider
      value={{
        requestAudioFocus,
        releaseAudioFocus,
        hasAudioFocus,
        isMuted,
        setIsMuted,
        silenceAll,
        forceCleanupAll,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};
