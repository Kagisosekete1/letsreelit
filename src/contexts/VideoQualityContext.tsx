import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type VideoQuality = 'auto' | 'low' | 'high';

interface NetworkInfo {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  saveData?: boolean;
}

interface VideoQualityContextType {
  quality: VideoQuality;
  setQuality: (q: VideoQuality) => void;
  getPreloadStrategy: () => 'auto' | 'metadata' | 'none';
  isSlowConnection: boolean;
}

const VideoQualityContext = createContext<VideoQualityContextType | undefined>(undefined);

const STORAGE_KEY = 'muvit_video_quality';

export const VideoQualityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [quality, setQualityState] = useState<VideoQuality>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'auto' || saved === 'low' || saved === 'high') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'auto';
  });

  const [isSlowConnection, setIsSlowConnection] = useState(false);

  // Detect network quality for auto mode
  useEffect(() => {
    const updateNetworkInfo = () => {
      const nav = navigator as any;
      const conn: NetworkInfo | undefined = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      if (conn) {
        const slow = 
          conn.saveData === true ||
          conn.effectiveType === '2g' ||
          conn.effectiveType === 'slow-2g' ||
          (conn.downlink !== undefined && conn.downlink < 1.5);
        
        setIsSlowConnection(slow);
      }
    };

    updateNetworkInfo();

    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn) {
      conn.addEventListener?.('change', updateNetworkInfo);
      return () => conn.removeEventListener?.('change', updateNetworkInfo);
    }
  }, []);

  const setQuality = (q: VideoQuality) => {
    setQualityState(q);
    try {
      localStorage.setItem(STORAGE_KEY, q);
    } catch {
      // ignore
    }
  };

  // Determine preload strategy based on quality setting and network
  const getPreloadStrategy = (): 'auto' | 'metadata' | 'none' => {
    if (quality === 'high') {
      return 'auto'; // Full preload
    }
    if (quality === 'low') {
      return 'metadata'; // Only metadata, no buffering
    }
    // Auto mode - adapt to network
    if (isSlowConnection) {
      return 'metadata';
    }
    return 'auto';
  };

  return (
    <VideoQualityContext.Provider value={{ quality, setQuality, getPreloadStrategy, isSlowConnection }}>
      {children}
    </VideoQualityContext.Provider>
  );
};

export const useVideoQuality = () => {
  const context = useContext(VideoQualityContext);
  if (!context) {
    throw new Error('useVideoQuality must be used within VideoQualityProvider');
  }
  return context;
};
