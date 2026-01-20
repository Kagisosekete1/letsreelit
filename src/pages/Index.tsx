import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import HomeScreen from '@/components/HomeScreen';
import SplashScreen from '@/components/SplashScreen';
import CreateReelModal from '@/components/CreateReelModal';
import { Screen } from '@/types';

const SPLASH_SHOWN_KEY = 'splashShown';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash once per session
    return !sessionStorage.getItem(SPLASH_SHOWN_KEY);
  });
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem(SPLASH_SHOWN_KEY, 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

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

  const setScreen = (screen: Screen | 'following' | 'live', payload?: any) => {
    if (screen === 'following') {
      navigate('/following');
      return;
    }
    if (screen === 'live') {
      navigate('/live');
      return;
    }
    setCurrentScreen(screen);
  };

  if (showSplash) {
    return <div className="h-screen w-full"><SplashScreen /></div>;
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pb-16 h-full">
        {currentScreen === 'home' && (
          <HomeScreen setScreen={setScreen} currentScreen={currentScreen} />
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
