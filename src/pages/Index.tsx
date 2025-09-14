import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoFeed } from '@/components/VideoFeed';
import { BottomNavigation } from '@/components/BottomNavigation';
import { TikTokHeader } from '@/components/TikTokHeader';
import SplashScreen from '@/components/SplashScreen';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [showSplash, setShowSplash] = useState(true);
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
        navigate('/');
        break;
      case 'discover':
        navigate('/discover');
        break;
      case 'create':
        // Handle create video action
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
      <div className="pt-16 pb-16">
        <VideoFeed />
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;
