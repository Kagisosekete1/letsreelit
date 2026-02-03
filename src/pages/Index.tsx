import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import DesktopSidebar from '@/components/DesktopSidebar';
import HomeScreen from '@/components/HomeScreen';
import SplashScreen from '@/components/SplashScreen';
import CreateReelModal from '@/components/CreateReelModal';
import NotificationPermissionPrompt from '@/components/NotificationPermissionPrompt';
import SettingsModal from '@/components/SettingsModal';
import DesktopCommentsPanel from '@/components/DesktopCommentsPanel';
import { Screen } from '@/types';

const SPLASH_SHOWN_KEY = 'splashShown';
const APP_INITIALIZED_KEY = 'muvit_app_initialized';

const Index = () => {
  const isNative = Capacitor.isNativePlatform();
  const [activeTab, setActiveTab] = useState('home');
  const [showSplash, setShowSplash] = useState(() => {
    // On native builds, rely ONLY on the native launch screen (avoid double splash).
    if (isNative) return false;
    // Check if app has been initialized this session - skip splash for internal navigation
    if (sessionStorage.getItem(APP_INITIALIZED_KEY)) return false;
    // Only show splash once per session (web)
    return !sessionStorage.getItem(SPLASH_SHOWN_KEY);
  });
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Desktop comments panel state
  const [desktopCommentsReelId, setDesktopCommentsReelId] = useState<string | null>(null);
  const [desktopCommentsOwnerId, setDesktopCommentsOwnerId] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Ref to pause videos when opening upload modal
  const pauseVideosRef = useRef<(() => void) | null>(null);
  const resumeVideosRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Mark app as initialized for this session
    sessionStorage.setItem(APP_INITIALIZED_KEY, 'true');
    
    if (isNative) return;
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem(SPLASH_SHOWN_KEY, 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSplash, isNative]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'home': 
        setCurrentScreen('home'); 
        navigate('/'); 
        break;
      case 'tutorials': 
        navigate('/tutorials'); 
        break;
      case 'create': 
        // Pause any playing video before opening upload modal
        try {
          pauseVideosRef.current?.();
        } catch (e) {
          console.warn('Error pausing videos:', e);
        }
        setIsCreateReelOpen(true);
        break;
      case 'notifications':
        navigate('/activity');
        break;
      case 'inbox': 
        navigate('/inbox'); 
        break;
      case 'dashboard':
        navigate('/monetization-analytics');
        break;
      case 'profile': 
        navigate('/profile'); 
        break;
      case 'settings':
        setIsSettingsOpen(true);
        break;
    }
  };

  const setScreen = (screen: Screen | 'following', payload?: any) => {
    if (screen === 'following') {
      navigate('/following');
      return;
    }
    setCurrentScreen(screen);
  };
  
  // Register pause and resume callbacks from HomeScreen
  const registerPauseCallback = (pauseFn: () => void) => {
    pauseVideosRef.current = pauseFn;
  };
  
  const registerResumeCallback = (resumeFn: () => void) => {
    resumeVideosRef.current = resumeFn;
  };

  // Handle upload modal close - resume videos
  const handleCreateReelClose = () => {
    setIsCreateReelOpen(false);
    // Small delay to ensure modal is closed before resuming
    setTimeout(() => {
      try {
        resumeVideosRef.current?.();
      } catch (e) {
        console.warn('Error resuming videos:', e);
      }
    }, 100);
  };

  // Desktop comments panel handler
  const handleOpenDesktopComments = (reelId: string, reelOwnerId: string) => {
    setDesktopCommentsReelId(reelId);
    setDesktopCommentsOwnerId(reelOwnerId);
  };

  const handleCloseDesktopComments = () => {
    setDesktopCommentsReelId(null);
    setDesktopCommentsOwnerId(null);
  };

  if (showSplash) {
    return <div className="h-screen w-full"><SplashScreen /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <DesktopSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Main Content */}
      <div className="lg:pl-[72px] xl:pl-[244px]">
        <div className="relative h-screen overflow-hidden flex">
          <NotificationPermissionPrompt enabled={!isCreateReelOpen} />

          <div className="pb-16 lg:pb-0 flex-1 h-full">
            {currentScreen === 'home' && (
              <HomeScreen 
                setScreen={setScreen} 
                currentScreen={currentScreen}
                onRegisterPause={registerPauseCallback}
                onRegisterResume={registerResumeCallback}
                onOpenDesktopComments={handleOpenDesktopComments}
              />
            )}
          </div>
          
          {/* Desktop Comments Side Panel */}
          {desktopCommentsReelId && (
            <DesktopCommentsPanel
              isOpen={!!desktopCommentsReelId}
              onClose={handleCloseDesktopComments}
              reelId={desktopCommentsReelId}
              reelOwnerId={desktopCommentsOwnerId || undefined}
            />
          )}
          
          {/* Mobile Bottom Navigation */}
          <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </div>
      
      {/* Modals */}
      <CreateReelModal 
        isOpen={isCreateReelOpen} 
        onClose={handleCreateReelClose} 
      />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default Index;
