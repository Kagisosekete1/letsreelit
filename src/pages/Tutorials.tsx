import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, Video, Play } from 'lucide-react';

const Tutorials = () => {
  const [activeTab, setActiveTab] = useState('tutorials');
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    switch (tab) {
      case 'home':
        navigate('/');
        break;
      case 'tutorials':
        navigate('/tutorials');
        break;
      case 'inbox':
        navigate('/inbox');
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };

  const trendingTutorials = [
    { id: 1, title: 'Beginner Amapiano Steps', views: '2.1M', thumbnail: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=400' },
    { id: 2, title: 'Advanced Footwork', views: '1.8M', thumbnail: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=400' },
    { id: 3, title: 'Body Isolation Techniques', views: '1.5M', thumbnail: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=400' },
  ];

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-8 pb-20 px-4 h-full overflow-y-auto">
        {/* Header */}
        <h1 className="text-2xl font-bold mb-6">Tutorials</h1>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search dance tutorials..."
            className="pl-10 bg-secondary border-border"
          />
        </div>

        {/* Trending Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Trending Tutorials</h2>
          </div>

          <div className="space-y-3">
            {trendingTutorials.map((tutorial) => (
              <Button
                key={tutorial.id}
                variant="ghost"
                className="w-full h-auto p-0 justify-start"
              >
                <div className="flex gap-3 w-full">
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={tutorial.thumbnail} 
                      alt={tutorial.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" fill="white" />
                    </div>
                  </div>
                  <div className="flex-1 text-left py-1">
                    <p className="font-semibold line-clamp-2">{tutorial.title}</p>
                    <p className="text-sm text-muted-foreground">{tutorial.views} views</p>
                  </div>
                </div>
              </Button>
            ))}
          </div>

          {/* Create Tutorial Button */}
          <Button className="w-full mt-6" size="lg">
            <Video className="w-5 h-5 mr-2" />
            Create Tutorial
          </Button>
        </div>
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Tutorials;
