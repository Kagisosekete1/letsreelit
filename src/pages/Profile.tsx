import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Settings, Share2, Grid3X3, Video, Bookmark } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import EditProfileModal from '@/components/EditProfileModal';
import SettingsModal from '@/components/SettingsModal';
import ShareProfileModal from '@/components/ShareProfileModal';
import CreateReelModal from '@/components/CreateReelModal';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [contentTab, setContentTab] = useState('reels');
  const navigate = useNavigate();
  const { currentUser } = useUser();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    switch (tab) {
      case 'home':
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

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-4 pb-20 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold">@{currentUser.username}</h1>
          <Button variant="ghost" size="sm" onClick={() => setIsShareOpen(true)}>
            <Share2 className="w-6 h-6" />
          </Button>
        </div>

        {/* Profile Info */}
        <div className="px-4 mb-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-3">
              <img
                src={currentUser.avatarUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-border"
              />
              {currentUser.verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs text-primary-foreground font-bold">✓</span>
                </div>
              )}
            </div>
            
            <h2 className="text-xl font-bold mb-1">{currentUser.displayName}</h2>
            <p className="text-muted-foreground text-sm mb-4">{currentUser.bio}</p>
            
            {/* Stats */}
            <div className="flex items-center gap-6 mb-4">
              <Button 
                variant="ghost" 
                className="text-center flex flex-col items-center p-2 hover:bg-secondary/50 rounded-lg"
                onClick={() => console.log('View following')}
              >
                <p className="text-lg font-bold">{currentUser.stats.following}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </Button>
              <Button 
                variant="ghost" 
                className="text-center flex flex-col items-center p-2 hover:bg-secondary/50 rounded-lg"
                onClick={() => console.log('View followers')}
              >
                <p className="text-lg font-bold">{currentUser.stats.followers}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </Button>
              <Button 
                variant="ghost" 
                className="text-center flex flex-col items-center p-2 hover:bg-secondary/50 rounded-lg"
                onClick={() => setContentTab('reels')}
              >
                <p className="text-lg font-bold">{currentUser.stats.reels}</p>
                <p className="text-xs text-muted-foreground">Reels</p>
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit Profile
              </Button>
              <Button 
                className="flex-1"
                onClick={() => setIsShareOpen(true)}
              >
                Share Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Content Tabs - Icons Only */}
        <div className="border-t border-border">
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              className={`flex-1 py-3 rounded-none ${
                contentTab === 'reels' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
              onClick={() => setContentTab('reels')}
            >
              <Grid3X3 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className={`flex-1 py-3 rounded-none ${
                contentTab === 'tutorials' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
              onClick={() => setContentTab('tutorials')}
            >
              <Video className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className={`flex-1 py-3 rounded-none ${
                contentTab === 'saved' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
              onClick={() => setContentTab('saved')}
            >
              <Bookmark className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-3 gap-0.5 px-0.5 pt-0.5">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square bg-muted relative overflow-hidden cursor-pointer"
            >
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
            </div>
          ))}
        </div>
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Modals */}
      <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ShareProfileModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)}
        username={currentUser.username}
      />
      <CreateReelModal isOpen={isCreateReelOpen} onClose={() => setIsCreateReelOpen(false)} />
    </div>
  );
};

export default Profile;