import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { TikTokHeader } from '@/components/TikTokHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, Hash, Music } from 'lucide-react';

const Discover = () => {
  const [activeTab, setActiveTab] = useState('discover');
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    switch (tab) {
      case 'home':
        navigate('/');
        break;
      case 'discover':
        navigate('/discover');
        break;
      case 'create':
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

  const trendingHashtags = [
    { name: 'dance', count: '2.1M' },
    { name: 'cooking', count: '1.8M' },
    { name: 'travel', count: '1.5M' },
    { name: 'comedy', count: '1.2M' },
    { name: 'music', count: '900K' },
  ];

  const trendingSounds = [
    { name: 'Original Audio - @user1', count: '450K' },
    { name: 'Trending Beat Mix', count: '380K' },
    { name: 'Viral Sound 2024', count: '320K' },
  ];

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <TikTokHeader />
      
      <div className="pt-20 pb-20 px-4 h-full overflow-y-auto">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search videos, users, sounds..."
            className="pl-10 bg-secondary border-border rounded-xl py-3"
          />
        </div>

        {/* Trending Section */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Trending Hashtags</h2>
            </div>
            <div className="space-y-3">
              {trendingHashtags.map((hashtag) => (
                <Button
                  key={hashtag.name}
                  variant="ghost"
                  className="w-full justify-between p-4 rounded-xl bg-card hover:bg-card/80"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Hash className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">#{hashtag.name}</p>
                      <p className="text-sm text-muted-foreground">{hashtag.count} videos</p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Music className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-bold text-foreground">Trending Sounds</h2>
            </div>
            <div className="space-y-3">
              {trendingSounds.map((sound, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-between p-4 rounded-xl bg-card hover:bg-card/80"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                      <Music className="w-5 h-5 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{sound.name}</p>
                      <p className="text-sm text-muted-foreground">{sound.count} videos</p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Discover;