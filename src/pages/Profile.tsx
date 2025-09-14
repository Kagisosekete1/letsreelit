import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Settings, Share, Heart, Eye, Grid3X3, Bookmark } from 'lucide-react';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [contentTab, setContentTab] = useState('posts');
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

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-8 pb-20 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-6">
          <Button variant="ghost" size="sm">
            <Settings className="w-6 h-6 text-foreground" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
          <Button variant="ghost" size="sm">
            <Share className="w-6 h-6 text-foreground" />
          </Button>
        </div>

        {/* Profile Info */}
        <div className="px-4 mb-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              <img
                src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face"
                alt="Profile"
                className="w-24 h-24 rounded-full border-3 border-primary"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs text-primary-foreground font-bold">✓</span>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-1">@yourhandle</h2>
            <p className="text-muted-foreground mb-4">✨ Content Creator | Dance Lover</p>
            
            {/* Stats */}
            <div className="flex items-center space-x-8 mb-6">
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">1.2M</p>
                <p className="text-sm text-muted-foreground">Following</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">8.7M</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">124.5M</p>
                <p className="text-sm text-muted-foreground">Likes</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 w-full">
              <Button variant="secondary" className="flex-1">
                Edit Profile
              </Button>
              <Button className="gradient-primary flex-1">
                Share Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="px-4">
          <div className="flex items-center justify-center space-x-8 mb-6 border-b border-border">
            <Button
              variant="ghost"
              className={`flex items-center space-x-2 pb-3 ${
                contentTab === 'posts' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground'
              }`}
              onClick={() => setContentTab('posts')}
            >
              <Grid3X3 className="w-5 h-5" />
              <span>Posts</span>
            </Button>
            <Button
              variant="ghost"
              className={`flex items-center space-x-2 pb-3 ${
                contentTab === 'liked' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground'
              }`}
              onClick={() => setContentTab('liked')}
            >
              <Heart className="w-5 h-5" />
              <span>Liked</span>
            </Button>
            <Button
              variant="ghost"
              className={`flex items-center space-x-2 pb-3 ${
                contentTab === 'saved' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground'
              }`}
              onClick={() => setContentTab('saved')}
            >
              <Bookmark className="w-5 h-5" />
              <span>Saved</span>
            </Button>
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square bg-card rounded-lg relative overflow-hidden group cursor-pointer"
              >
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <div className="text-center opacity-50 group-hover:opacity-70 transition-opacity">
                    <Eye className="w-6 h-6 text-foreground mx-auto mb-1" />
                    <p className="text-xs text-foreground">1.2M</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Profile;