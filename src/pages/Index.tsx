import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import HomeScreen from '@/components/HomeScreen';
import SplashScreen from '@/components/SplashScreen';
import CreateReelModal from '@/components/CreateReelModal';
import NotificationPermissionPrompt from '@/components/NotificationPermissionPrompt';
import { Screen } from '@/types';

const SPLASH_SHOWN_KEY = 'splashShown';

const Index = () => {
  const isNative = Capacitor.isNativePlatform();
  const [activeTab, setActiveTab] = useState('home');
  const [showSplash, setShowSplash] = useState(() => {
    // On native builds, rely ONLY on the native launch screen (avoid double splash).
    if (isNative) return false;
    // Only show splash once per session (web)
    return !sessionStorage.getItem(SPLASH_SHOWN_KEY);
  });
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const navigate = useNavigate();
  
  // Ref to pause videos when opening upload modal
  const pauseVideosRef = useRef<(() => void) | null>(null);

  useEffect(() => {
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
        pauseVideosRef.current?.();
        setIsCreateReelOpen(true);
        break;
      case 'inbox': 
        navigate('/inbox'); 
        break;
      case 'profile': 
        navigate('/profile'); 
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
  
  // Register pause callback from HomeScreen
  const registerPauseCallback = (pauseFn: () => void) => {
    pauseVideosRef.current = pauseFn;
  };

  if (showSplash) {
    return <div className="h-screen w-full"><SplashScreen /></div>;
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <NotificationPermissionPrompt enabled={!isCreateReelOpen} />

      <div className="pb-16 h-full">
        {currentScreen === 'home' && (
          <HomeScreen 
            setScreen={setScreen} 
            currentScreen={currentScreen}
            onRegisterPause={registerPauseCallback}
          />
        )}
      </div>
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      
      <CreateReelModal 
        isOpen={isCreateReelOpen} 
        onClose={() => setIsCreateReelOpen(false)} 
      />
    </div>
  );
};

export default Index;
