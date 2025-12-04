import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Screen } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import ReelCard from './ui/ReelCard';
import logo from '@/assets/logo.jpg';

interface HomeScreenProps {
  setScreen: (screen: Screen, payload?: any) => void;
  currentScreen: Screen;
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
  created_at: string;
  profile?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    verified: boolean;
  };
}

const HomeScreen: React.FC<HomeScreenProps> = ({ setScreen, currentScreen }) => {
  const { currentUser, authUser } = useUser();
  const [reels, setReels] = useState<ReelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedReels = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchReels();
    if (authUser) fetchFollowing();
  }, [authUser]);

  // Track view when reel becomes active (only for non-owners)
  useEffect(() => {
    const currentReel = reels[activeReelIndex];
    if (currentReel && authUser && currentReel.user_id !== authUser.id && !viewedReels.current.has(currentReel.id)) {
      viewedReels.current.add(currentReel.id);
      incrementViewCount(currentReel.id);
    }
  }, [activeReelIndex, reels, authUser]);

  const incrementViewCount = async (reelId: string) => {
    try {
      await supabase.rpc('increment_view_count', { reel_id: reelId });
    } catch {
      // Fallback: direct update
      const currentReel = reels.find(r => r.id === reelId);
      await supabase
        .from('reels')
        .update({ views_count: (currentReel?.views_count || 0) + 1 })
        .eq('id', reelId);
    }
  };

  const fetchReels = async () => {
    try {
      const { data: reelsData } = await supabase
        .from('reels')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (reelsData && reelsData.length > 0) {
        const userIds = [...new Set(reelsData.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, username, display_name, avatar_url, verified')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const reelsWithProfiles = reelsData.map(r => ({
          ...r,
          profile: profileMap.get(r.user_id)
        }));
        
        // Shuffle reels randomly
        const shuffled = [...reelsWithProfiles].sort(() => Math.random() - 0.5);
        setReels(shuffled as ReelData[]);
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!authUser) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .single();

    if (profile) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profile.id);

      if (follows) {
        setFollowingIds(new Set(follows.map(f => f.following_id)));
      }
    }
  };

  const toggleFollow = async (profileId: string) => {
    if (!authUser) return;

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .single();

    if (!myProfile) return;

    if (followingIds.has(profileId)) {
      // Unfollow
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', myProfile.id)
        .eq('following_id', profileId);

      setFollowingIds(prev => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    } else {
      // Follow
      await supabase
        .from('follows')
        .insert({
          follower_id: myProfile.id,
          following_id: profileId,
        });

      setFollowingIds(prev => new Set([...prev, profileId]));
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    setReels(prev => prev.filter(r => r.id !== reelId));
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    if (newIndex !== activeReelIndex && newIndex >= 0 && newIndex < reels.length) {
      setActiveReelIndex(newIndex);
    }
  }, [activeReelIndex, reels.length]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black animate-fade-in">
      {/* Reels Feed - Full Screen */}
      {reels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2 text-white">No reels yet</h2>
          <p className="text-white/60 text-center text-sm">
            Be the first to share your dance moves!
          </p>
        </div>
      ) : (
        <div className="relative flex-1">
          {/* Subtle App Logo Watermark */}
          <div className="absolute top-4 left-4 z-50 flex items-center space-x-2 opacity-20 pointer-events-none">
            <img src={logo} alt="Reel'It" className="w-10 h-10 object-contain" />
            <span className="text-white font-bold text-lg drop-shadow-md">Reel'It</span>
          </div>
          
          <div 
            ref={containerRef}
            className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            onScroll={handleScroll}
          >
            {reels.map((reel, index) => (
              <ReelCard
                key={reel.id}
                reel={{
                  id: reel.id,
                  videoUrl: reel.video_url,
                  thumbnailUrl: reel.thumbnail_url || '',
                  title: reel.title,
                  description: reel.description || '',
                  user: {
                    id: reel.user_id,
                    profileId: reel.profile?.id || '',
                    username: reel.profile?.username || 'user',
                    displayName: reel.profile?.display_name || 'User',
                    avatarUrl: reel.profile?.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face',
                    verified: reel.profile?.verified || false,
                  },
                  stats: {
                    likes: reel.likes_count || 0,
                    comments: reel.comments_count || 0,
                    shares: reel.shares_count || 0,
                    views: reel.views_count || 0,
                  },
                  isLiked: false,
                }}
                followingIds={followingIds}
                toggleFollow={toggleFollow}
                isActive={index === activeReelIndex}
                isOwner={authUser?.id === reel.user_id}
                onDelete={handleDeleteReel}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;