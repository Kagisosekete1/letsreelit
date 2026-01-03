import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import HomeScreen from '@/components/HomeScreen';
import SplashScreen from '@/components/SplashScreen';
import { Screen } from '@/types';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'home': setCurrentScreen('home'); navigate('/'); break;
      case 'tutorials': navigate('/tutorials'); break;
      case 'create': setCurrentScreen('create'); break;
      case 'inbox': navigate('/inbox'); break;
      case 'profile': navigate('/profile'); break;
    }
  };

  const setScreen = (screen: Screen | 'following', payload?: any) => {
    if (screen === 'following') {
      navigate('/following');
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
    </div>
  );
};

export default Index;