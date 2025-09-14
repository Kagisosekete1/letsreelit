import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoFeed } from '@/components/VideoFeed';
import { BottomNavigation } from '@/components/BottomNavigation';
import { TikTokHeader } from '@/components/TikTokHeader';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const navigate = useNavigate();

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
