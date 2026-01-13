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
    // Default to false (sound ON) if no preference saved
    return saved === 'true';
  });

  // Persist mute preference
  const setIsMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
    sessionStorage.setItem('reelAudioMuted', String(muted));
  }, []);

  // Silence all videos except the active one
  const silenceAllExcept = useCallback((exceptElement?: HTMLVideoElement) => {
    registeredVideos.current.forEach((video, reelId) => {
      if (video === exceptElement) return;
      try {
        video.pause();
        video.muted = true;
        video.currentTime = 0;
      } catch {
        // ignore
      }
    });

    // Also silence any unregistered media elements in the DOM
    const allVideos = document.querySelectorAll<HTMLVideoElement>('video');
    allVideos.forEach((video) => {
      if (video === exceptElement) return;
      try {
        video.pause();
        video.muted = true;
      } catch {
        // ignore
      }
    });

    const allAudios = document.querySelectorAll<HTMLAudioElement>('audio');
    allAudios.forEach((audio) => {
      try {
        audio.pause();
        audio.muted = true;
      } catch {
        // ignore
      }
    });
  }, []);

  // Silence everything
  const silenceAll = useCallback(() => {
    activeReelIdRef.current = null;
    activeVideoRef.current = null;
    silenceAllExcept(undefined);
  }, [silenceAllExcept]);

  // Request audio focus for a reel
  const requestAudioFocus = useCallback((videoElement: HTMLVideoElement, reelId: string) => {
    // Register this video
    registeredVideos.current.set(reelId, videoElement);

    // If this reel already has focus, just ensure state is correct
    if (activeReelIdRef.current === reelId) {
      videoElement.muted = isMuted;
      return;
    }

    // Silence all other videos first
    silenceAllExcept(videoElement);

    // Grant focus to this reel
    activeReelIdRef.current = reelId;
    activeVideoRef.current = videoElement;

    // Apply mute state based on user preference
    videoElement.muted = isMuted;
  }, [isMuted, silenceAllExcept]);

  // Release audio focus
  const releaseAudioFocus = useCallback((reelId: string) => {
    const video = registeredVideos.current.get(reelId);
    if (video) {
      try {
        video.pause();
        video.muted = true;
        video.currentTime = 0;
      } catch {
        // ignore
      }
    }

    if (activeReelIdRef.current === reelId) {
      activeReelIdRef.current = null;
      activeVideoRef.current = null;
    }

    registeredVideos.current.delete(reelId);
  }, []);

  // Check if a reel has audio focus
  const hasAudioFocus = useCallback((reelId: string) => {
    return activeReelIdRef.current === reelId;
  }, []);

  // Sync mute state to active video when isMuted changes
  useEffect(() => {
    if (activeVideoRef.current) {
      activeVideoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Periodic safety check to ensure only one video plays audio
  useEffect(() => {
    const interval = setInterval(() => {
      const activeVideo = activeVideoRef.current;

      const allVideos = document.querySelectorAll<HTMLVideoElement>('video');
      allVideos.forEach((video) => {
        if (activeVideo && video === activeVideo) return;
        // If there is no active video, OR this isn't the active one, force it silent.
        if (!video.paused || !video.muted) {
          try {
            video.pause();
            video.muted = true;
          } catch {
            // ignore
          }
        }
      });

      const allAudios = document.querySelectorAll<HTMLAudioElement>('audio');
      allAudios.forEach((audio) => {
        if (!audio.paused || !audio.muted) {
          try {
            audio.pause();
            audio.muted = true;
          } catch {
            // ignore
          }
        }
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <AudioContext.Provider
      value={{
        requestAudioFocus,
        releaseAudioFocus,
        hasAudioFocus,
        isMuted,
        setIsMuted,
        silenceAll,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};
