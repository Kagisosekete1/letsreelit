import React, { createContext, useContext, useState, useEffect } from 'react';

interface DebugContextType {
  showVideoDebug: boolean;
  setShowVideoDebug: (show: boolean) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

const DEBUG_STORAGE_KEY = 'muvit_video_debug';

export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showVideoDebug, setShowVideoDebug] = useState(() => {
    const stored = localStorage.getItem(DEBUG_STORAGE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(DEBUG_STORAGE_KEY, showVideoDebug.toString());
  }, [showVideoDebug]);

  return (
    <DebugContext.Provider value={{ showVideoDebug, setShowVideoDebug }}>
      {children}
    </DebugContext.Provider>
  );
};

export const useDebug = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
};
