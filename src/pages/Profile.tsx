import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Settings, Grid3X3, Video, Bookmark, Play } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import EditProfileModal from '@/components/EditProfileModal';
import SettingsModal from '@/components/SettingsModal';
import ShareProfileModal from '@/components/ShareProfileModal';
import CreateReelModal from '@/components/CreateReelModal';
import FollowersModal from '@/components/FollowersModal';
import ReelsModal from '@/components/ReelsModal';
import { supabase } from '@/integrations/supabase/client';

interface ReelData {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number;
}

const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [contentTab, setContentTab] = useState('reels');
  const navigate = useNavigate();
  const { currentUser, authUser, loading } = useUser();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [followersModal, setFollowersModal] = useState(false);
  const [followingModal, setFollowingModal] = useState(false);
  const [reelsModal, setReelsModal] = useState(false);
  const [userReels, setUserReels] = useState<ReelData[]>([]);
  const [selectedReel, setSelectedReel] = useState<ReelData | null>(null);

  useEffect(() => {
    if (authUser) {
      fetchUserReels();
    }
  }, [authUser]);

  const fetchUserReels = async () => {
    if (!authUser) return;
    const { data } = await supabase
      .from('reels')
      .select('id, title, video_url, thumbnail_url, views_count')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });
    
    if (data) setUserReels(data);
  };

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

  const handleReelClick = (reel: ReelData) => {
    setSelectedReel(reel);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!currentUser) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-4 pb-20 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold">@{currentUser.username}</h1>
          <div className="w-10" /> {/* Spacer for alignment */}
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
            </div>
            
            <h2 className="text-xl font-bold mb-1">{currentUser.displayName}</h2>
            <p className="text-muted-foreground text-sm mb-4">{currentUser.bio}</p>
            
            {/* Stats */}
            <div className="flex items-center gap-6 mb-4">
              <Button 
                variant="ghost" 
                className="text-center flex flex-col items-center p-2 hover:bg-secondary/50 rounded-lg"
                onClick={() => setFollowingModal(true)}
              >
                <p className="text-lg font-bold">{currentUser.stats.following}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </Button>
              <Button 
                variant="ghost" 
                className="text-center flex flex-col items-center p-2 hover:bg-secondary/50 rounded-lg"
                onClick={() => setFollowersModal(true)}
              >
                <p className="text-lg font-bold">{currentUser.stats.followers}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </Button>
              <Button 
                variant="ghost" 
                className="text-center flex flex-col items-center p-2 hover:bg-secondary/50 rounded-lg"
                onClick={() => setReelsModal(true)}
              >
                <p className="text-lg font-bold">{currentUser.stats.reels}</p>
                <p className="text-xs text-muted-foreground">Reels</p>
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl"
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit Profile
              </Button>
              <Button 
                className="flex-1 rounded-xl"
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

        {/* Reels Grid */}
        {contentTab === 'reels' && (
          userReels.length === 0 ? (
            <div className="px-4 py-8">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium mb-2">No reels yet</p>
                <p className="text-sm">Your reels will appear here</p>
                <Button 
                  className="mt-4 rounded-xl"
                  onClick={() => setIsCreateReelOpen(true)}
                >
                  Create your first reel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 px-0.5 pt-0.5">
              {userReels.map((reel) => (
                <div
                  key={reel.id}
                  className="aspect-[9/16] bg-muted relative overflow-hidden cursor-pointer group"
                  onClick={() => handleReelClick(reel)}
                >
                  <video
                    src={reel.video_url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-8 h-8 text-white" fill="currentColor" />
                  </div>
                  <div className="absolute bottom-1 left-1 flex items-center gap-1">
                    <Play className="w-3 h-3 text-white" fill="currentColor" />
                    <span className="text-white text-xs font-medium">{reel.views_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {contentTab === 'tutorials' && (
          <div className="px-4 py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">No tutorials yet</p>
              <p className="text-sm">Your tutorials will appear here</p>
            </div>
          </div>
        )}

        {contentTab === 'saved' && (
          <div className="px-4 py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">No saved reels</p>
              <p className="text-sm">Your saved reels will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Full Screen Reel Player */}
      {selectedReel && (
        <div className="fixed inset-0 z-50 bg-black">
          <video
            src={selectedReel.video_url}
            className="w-full h-full object-contain"
            controls
            autoPlay
            playsInline
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full"
            onClick={() => setSelectedReel(null)}
          >
            ✕
          </Button>
        </div>
      )}
      
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
      
      {/* Stats Modals */}
      <FollowersModal
        isOpen={followersModal}
        onClose={() => setFollowersModal(false)}
        userId={authUser?.id || ''}
        type="followers"
        count={currentUser.stats.followers}
      />
      <FollowersModal
        isOpen={followingModal}
        onClose={() => setFollowingModal(false)}
        userId={authUser?.id || ''}
        type="following"
        count={currentUser.stats.following}
      />
      <ReelsModal
        isOpen={reelsModal}
        onClose={() => setReelsModal(false)}
        userId={authUser?.id || ''}
        count={currentUser.stats.reels}
        isOwnProfile={true}
      />
    </div>
  );
};

export default Profile;
