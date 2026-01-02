import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Screen } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import ReelCard from './ui/ReelCard';

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
    followers_count?: number;
    following_count?: number;
  };
}

const AUTO_ADVANCE_KEY = 'reelit_auto_advance';

const HomeScreen: React.FC<HomeScreenProps> = ({ setScreen, currentScreen }) => {
  const { currentUser, authUser } = useUser();
  const [reels, setReels] = useState<ReelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [feedTab, setFeedTab] = useState<'forYou' | 'following'>('forYou');
  const [autoAdvance, setAutoAdvance] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AUTO_ADVANCE_KEY) === 'true';
    }
    return false;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedReels = useRef<Set<string>>(new Set());

  const displayedReels = useMemo(() => {
    if (feedTab === 'forYou') return reels;
    return reels.filter(r => (r.profile?.id ? followingIds.has(r.profile.id) : false));
  }, [feedTab, reels, followingIds]);

  // Reset position when switching tabs
  useEffect(() => {
    setActiveReelIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [feedTab]);

  // Sync reels when screen becomes active or on mount
  useEffect(() => {
    if (currentScreen === 'home') {
      fetchReels();
      if (authUser) fetchFollowing();
    }
  }, [currentScreen, authUser]);

  // Track view when reel becomes active (only for non-owners)
  useEffect(() => {
    const currentReel = displayedReels[activeReelIndex];
    if (currentReel && authUser && currentReel.user_id !== authUser.id && !viewedReels.current.has(currentReel.id)) {
      viewedReels.current.add(currentReel.id);
      incrementViewCount(currentReel.id);
    }
  }, [activeReelIndex, displayedReels, authUser]);

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

        // Fetch live follow counts for all profiles
        const profileIds = profiles?.map(p => p.id) || [];
        const [{ data: followersData }, { data: followingData }] = await Promise.all([
          supabase.from('follows').select('following_id').in('following_id', profileIds),
          supabase.from('follows').select('follower_id').in('follower_id', profileIds),
        ]);

        const followersCountMap = new Map<string, number>();
        const followingCountMap = new Map<string, number>();

        (followersData || []).forEach(f => {
          followersCountMap.set(f.following_id, (followersCountMap.get(f.following_id) || 0) + 1);
        });
        (followingData || []).forEach(f => {
          followingCountMap.set(f.follower_id, (followingCountMap.get(f.follower_id) || 0) + 1);
        });

        const profileMap = new Map(profiles?.map(p => [p.user_id, {
          ...p,
          followers_count: followersCountMap.get(p.id) || 0,
          following_count: followingCountMap.get(p.id) || 0,
        }]) || []);
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
    if (!profileId) return;

    // Optimistic UI first (feels instant)
    const wasFollowing = followingIds.has(profileId);
    setFollowingIds(prev => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(profileId);
      else next.add(profileId);
      return next;
    });

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .single();

    if (!myProfile) {
      // Revert if we can't resolve the current user's profile
      setFollowingIds(prev => {
        const next = new Set(prev);
        if (wasFollowing) next.add(profileId);
        else next.delete(profileId);
        return next;
      });
      return;
    }

    if (wasFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', myProfile.id)
        .eq('following_id', profileId);
      return;
    }

    // Follow (idempotent)
    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', myProfile.id)
      .eq('following_id', profileId)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('follows')
        .insert({
          follower_id: myProfile.id,
          following_id: profileId,
        });
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    setReels(prev => prev.filter(r => r.id !== reelId));
  };

  const handleScroll = useCallback(() => {
    // IntersectionObserver drives the active index (more stable than scroll math).
    // Keep this handler as a no-op to avoid mid-swipe index flicker.
  }, []);

  // Determine active reel by visibility (TikTok-style: only the centered reel becomes active)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.querySelectorAll<HTMLElement>('[data-reel-item="true"]'));
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the most visible item
        const best = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];

        if (!best?.target) return;
        const idx = Number((best.target as HTMLElement).dataset.reelIndex);
        if (!Number.isFinite(idx)) return;

        setActiveReelIndex((prev) => (prev === idx ? prev : idx));
      },
      {
        root: container,
        threshold: [0.6, 0.75, 0.9],
      }
    );

    items.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [reels.length]);

  const goToReel = useCallback((index: number) => {
    if (containerRef.current && index >= 0 && index < displayedReels.length) {
      const itemHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      });
      setActiveReelIndex(index);
    }
  }, [displayedReels.length]);

  const handleReelEnded = useCallback(() => {
    if (activeReelIndex < displayedReels.length - 1) {
      goToReel(activeReelIndex + 1);
    }
  }, [activeReelIndex, displayedReels.length, goToReel]);

  const toggleAutoAdvance = () => {
    setAutoAdvance(prev => {
      const next = !prev;
      localStorage.setItem(AUTO_ADVANCE_KEY, String(next));
      return next;
    });
  };

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
      {displayedReels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2 text-white">
            {feedTab === 'following' ? 'No reels from people you follow' : 'No reels yet'}
          </h2>
          <p className="text-white/60 text-center text-sm">
            {feedTab === 'following'
              ? (authUser ? 'Follow creators to see their reels here.' : 'Sign in and follow creators to build your Following feed.')
              : 'Be the first to share your dance moves!'}
          </p>
        </div>
      ) : (
        <div className="relative flex-1 h-full">
          {/* Subtle App Logo Watermark */}
          <div className="absolute top-4 left-4 z-50 pointer-events-none">
            <span className="text-gray-400 font-bold text-xl opacity-45 drop-shadow-md">Reel'it</span>
          </div>

          {/* Feed Tabs */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full p-1">
            <button
              onClick={() => setFeedTab('forYou')}
              className={`px-3 py-1 text-xs rounded-full ${feedTab === 'forYou' ? 'bg-white/15 text-white' : 'text-white/70'}`}
            >
              For You
            </button>
            <button
              onClick={() => setFeedTab('following')}
              className={`px-3 py-1 text-xs rounded-full ${feedTab === 'following' ? 'bg-white/15 text-white' : 'text-white/70'}`}
            >
              Following
            </button>
          </div>

          {/* Auto-advance toggle */}
          <button 
            onClick={toggleAutoAdvance}
            className="absolute top-4 right-14 z-50 px-2 py-1 text-[10px] text-white bg-black/40 rounded-full backdrop-blur-sm"
          >
            {autoAdvance ? 'Auto: On' : 'Auto: Off'}
          </button>
          
          <div 
            ref={containerRef}
            className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-none"
            style={{ scrollSnapStop: 'always' }}
            onScroll={handleScroll}
          >
            {displayedReels.map((reel, index) => (
              <div
                key={reel.id}
                className="relative h-full w-full snap-start snap-always"
                data-reel-item="true"
                data-reel-index={index}
                style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
              >
                <ReelCard
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
                  autoAdvance={autoAdvance}
                  onEnded={handleReelEnded}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;