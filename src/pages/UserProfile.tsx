import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreVertical, Grid3X3, Video, Bookmark, AlertCircle, Ban, Play } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import FollowersModal from '@/components/FollowersModal';
import ReelCard from '@/components/ui/ReelCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';

interface UserProfileData {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  verified: boolean;
  followers_count: number;
  following_count: number;
  reels_count: number;
}

interface ReelData {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  user_id: string;
}

const UserProfileMenu = ({ onReport, onBlock }: { onReport: () => void; onBlock: () => void }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-6 h-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onReport}>
          <AlertCircle className="w-4 h-4 mr-2" />
          Report
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onBlock}>
          <Ban className="w-4 h-4 mr-2" />
          Block
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const UserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, authUser } = useUser();
  const [activeTab, setActiveTab] = useState('home');
  const [contentTab, setContentTab] = useState('reels');
  
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [userReels, setUserReels] = useState<ReelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [selectedReelIndex, setSelectedReelIndex] = useState<number | null>(null);
  
  const [followersModal, setFollowersModal] = useState(false);
  const [followingModal, setFollowingModal] = useState(false);

  useEffect(() => {
    if (username) {
      fetchUserProfile();
    }
  }, [username, authUser]);

  const fetchUserProfile = async () => {
    setLoading(true);
    
    // Fetch user profile by username
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error || !profileData) {
      setLoading(false);
      return;
    }

    setUser(profileData);

    // Fetch user's reels
    const { data: reelsData } = await supabase
      .from('reels')
      .select('*')
      .eq('user_id', profileData.user_id)
      .order('created_at', { ascending: false });

    if (reelsData) {
      setUserReels(reelsData);
    }

    // Check if current user is following this user
    if (authUser && currentUser) {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authUser.id)
        .single();

      if (myProfile) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', myProfile.id)
          .eq('following_id', profileData.id)
          .maybeSingle();

        setIsFollowing(!!followData);
        setFollowingIds(followData ? new Set([profileData.id]) : new Set());
      }
    }

    setLoading(false);
  };

  const handleFollow = async () => {
    if (!authUser || !user) return;

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .single();

    if (!myProfile) return;

    if (isFollowing) {
      // Unfollow
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', myProfile.id)
        .eq('following_id', user.id);

      setIsFollowing(false);
      setFollowingIds(new Set());
      setUser(prev => prev ? { ...prev, followers_count: Math.max(0, prev.followers_count - 1) } : null);

      toast({ title: 'Unfollowed', description: `You unfollowed @${user.username}` });
      return;
    }

    // Follow (idempotent)
    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', myProfile.id)
      .eq('following_id', user.id)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('follows')
        .insert({
          follower_id: myProfile.id,
          following_id: user.id,
        });
    }

    setIsFollowing(true);
    setFollowingIds(new Set([user.id]));
    setUser(prev => prev ? { ...prev, followers_count: prev.followers_count + 1 } : null);

    toast({ title: 'Following', description: `You are now following @${user.username}` });
  };

  const toggleFollow = async (profileId: string) => {
    handleFollow();
  };

  const handleReport = () => {
    toast({ title: 'Report submitted', description: 'Thank you for your report. We will review it shortly.' });
  };

  const handleBlock = () => {
    toast({ title: 'User blocked', description: `@${user?.username} has been blocked.` });
    navigate(-1);
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
      case 'inbox':
        navigate('/inbox');
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <p className="text-lg font-semibold mb-2">User not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  // Full screen reel viewer
  if (selectedReelIndex !== null) {
    const reel = userReels[selectedReelIndex];
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 z-50 text-white bg-black/30 rounded-full"
          onClick={() => setSelectedReelIndex(null)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
          {userReels.map((r, index) => (
            <ReelCard
              key={r.id}
              reel={{
                id: r.id,
                videoUrl: r.video_url,
                thumbnailUrl: r.thumbnail_url || '',
                title: r.title,
                description: r.description || '',
                user: {
                  id: user.user_id,
                  profileId: user.id,
                  username: user.username,
                  displayName: user.display_name,
                  avatarUrl: user.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face',
                  verified: user.verified,
                },
                stats: {
                  likes: r.likes_count || 0,
                  comments: r.comments_count || 0,
                  shares: r.shares_count || 0,
                  views: r.views_count || 0,
                },
                isLiked: false,
              }}
              followingIds={followingIds}
              toggleFollow={toggleFollow}
              isActive={index === selectedReelIndex}
              isOwner={authUser?.id === user.user_id}
              variant="profile"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-4 pb-20 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold">@{user.username}</h1>
          <UserProfileMenu onReport={handleReport} onBlock={handleBlock} />
        </div>

        {/* Profile Info */}
        <div className="px-4 mb-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-3">
              <img
                src={user.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face'}
                alt={user.username}
                className="w-24 h-24 rounded-full object-cover border-2 border-border"
              />
              {user.verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs text-primary-foreground font-bold">✓</span>
                </div>
              )}
            </div>
            
            <h2 className="text-xl font-bold mb-1">{user.display_name || `@${user.username}`}</h2>
            <p className="text-muted-foreground text-sm mb-4">{user.bio || 'Dance Creator'}</p>
            
            {/* Stats */}
            <div className="flex items-center gap-6 mb-4">
              <Button 
                variant="ghost" 
                className="text-center flex flex-col items-center p-2 hover:bg-secondary/50 rounded-lg"
                onClick={() => setFollowingModal(true)}
              >
                <p className="text-lg font-bold">{user.following_count || 0}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </Button>
              <Button 
                variant="ghost" 
                className="text-center flex flex-col items-center p-2 hover:bg-secondary/50 rounded-lg"
                onClick={() => setFollowersModal(true)}
              >
                <p className="text-lg font-bold">{user.followers_count || 0}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </Button>
              <Button 
                variant="ghost" 
                className="text-center flex flex-col items-center p-2 hover:bg-secondary/50 rounded-lg"
                onClick={() => setContentTab('reels')}
              >
                <p className="text-lg font-bold">{userReels.length}</p>
                <p className="text-xs text-muted-foreground">Reels</p>
              </Button>
            </div>

            {/* Action Button - Only show if not own profile */}
            {authUser?.id !== user.user_id && (
              <Button 
                className="w-full rounded-xl" 
                variant={isFollowing ? "outline" : "default"}
                onClick={handleFollow}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
          </div>
        </div>

        {/* Content Tabs */}
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
          </div>
        </div>

        {/* Reels Grid */}
        {contentTab === 'reels' && (
          userReels.length === 0 ? (
            <div className="px-4 py-8">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium mb-2">No reels yet</p>
                <p className="text-sm">This user hasn't posted any reels</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 px-0.5 pt-0.5">
              {userReels.map((reel, index) => (
                <div
                  key={reel.id}
                  className="aspect-[9/16] bg-muted relative overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedReelIndex(index)}
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
              <p className="text-sm">This user hasn't posted any tutorials</p>
            </div>
          </div>
        )}
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Followers/Following Modals */}
      <FollowersModal
        isOpen={followersModal}
        onClose={() => setFollowersModal(false)}
        userId={user.user_id}
        type="followers"
        count={user.followers_count || 0}
        profileId={user.id}
      />
      <FollowersModal
        isOpen={followingModal}
        onClose={() => setFollowingModal(false)}
        userId={user.user_id}
        type="following"
        count={user.following_count || 0}
        profileId={user.id}
      />
    </div>
  );
};

export default UserProfile;
