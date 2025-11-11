import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { TikTokHeader } from '@/components/TikTokHeader';
import HomeScreen from '@/components/HomeScreen';
import SplashScreen from '@/components/SplashScreen';
import { Screen } from '@/types';
import { mockReels } from '@/data/mockData';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    // Show splash screen for 3 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Navigate to different routes based on tab
    switch (tab) {
      case 'home':
        setCurrentScreen('home');
        navigate('/');
        break;
      case 'tutorials':
        navigate('/tutorials');
        break;
      case 'create':
        setCurrentScreen('create');
        console.log('Open camera/video creation');
        break;
      case 'inbox':
        navigate('/inbox');
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };

  const setScreen = (screen: Screen, payload?: any) => {
    setCurrentScreen(screen);
    // Handle screen navigation logic here
    console.log('Navigate to screen:', screen, payload);
  };

  const toggleFollow = (userId: string) => {
    setFollowingIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  if (showSplash) {
    return (
      <div className="h-screen w-full">
        <SplashScreen />
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <TikTokHeader />
      
      {/* Main Content */}
      <div className="pt-16 pb-16 h-full">
        {currentScreen === 'home' && (
          <HomeScreen
            setScreen={setScreen}
            currentScreen={currentScreen}
            reels={mockReels}
            followingIds={followingIds}
            toggleFollow={toggleFollow}
          />
        )}
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;
