import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Screen } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import ReelCard from './ui/ReelCard';
import { Radio, Loader2 } from 'lucide-react';
import { useReelPreloader } from '@/hooks/useReelPreloader';

const PAGE_SIZE = 10;

interface HomeScreenProps {
  setScreen: (screen: Screen | 'following' | 'live', payload?: any) => void;
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

const HomeScreen: React.FC<HomeScreenProps> = ({ setScreen, currentScreen }) => {
  const { currentUser, authUser } = useUser();
  const [reels, setReels] = useState<ReelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [activeLiveCount, setActiveLiveCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedReels = useRef<Set<string>>(new Set());
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // For "start paused until user taps play" - track if user has ever played
  const [userTriggeredPlay, setUserTriggeredPlay] = useState(false);

  const displayedReels = reels;

  // Prefetch next reels for instant scrolling
  useReelPreloader(reels, activeReelIndex, 2);

  // Fetch live count
  useEffect(() => {
    const fetchLiveCount = async () => {
      const { count } = await supabase
        .from('live_streams')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      setActiveLiveCount(count || 0);
    };
    fetchLiveCount();
  }, []);

  // Sync reels when screen becomes active or on mount
  useEffect(() => {
    if (currentScreen === 'home') {
      fetchReels(true);
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

  // Infinite scroll: load more when approaching the end
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchReels(false);
        }
      },
      { root: containerRef.current, rootMargin: '200px', threshold: 0 }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, reels.length]);

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

  const fetchReels = async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = reset ? 0 : reels.length;
      const { data: reelsData } = await supabase
        .from('reels')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      
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
        })) as ReelData[];
        
        if (reset) {
          // Always shuffle on initial load/refresh for fresh experience
          const shuffled = [...reelsWithProfiles].sort(() => Math.random() - 0.5);
          setReels(shuffled);
        } else {
          // Shuffle new batch and append for infinite scroll
          const shuffledNew = [...reelsWithProfiles].sort(() => Math.random() - 0.5);
          setReels(prev => [...prev, ...shuffledNew]);
        }

        if (reelsData.length < PAGE_SIZE) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchFollowing = async () => {
    if (!authUser) return;

    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', authUser.id);

    if (follows) {
      setFollowingIds(new Set(follows.map(f => f.following_id)));
    }
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!authUser) return;
    if (!targetUserId) return;

    // Optimistic UI first (feels instant)
    const wasFollowing = followingIds.has(targetUserId);
    setFollowingIds(prev => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(targetUserId);
      else next.add(targetUserId);
      return next;
    });

    if (wasFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', authUser.id)
        .eq('following_id', targetUserId);
      return;
    }

    // Follow (idempotent)
    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', authUser.id)
      .eq('following_id', targetUserId)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('follows')
        .insert({
          follower_id: authUser.id,
          following_id: targetUserId,
        });
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    setReels(prev => prev.filter(r => r.id !== reelId));
  };

  const handleScroll = useCallback(() => {
    // IntersectionObserver drives the active index (more stable than scroll math).
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

  // Desktop keyboard navigation (↑/↓)
  useEffect(() => {
    if (currentScreen !== 'home') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();

      const nextIndex = e.key === 'ArrowDown' ? activeReelIndex + 1 : activeReelIndex - 1;
      goToReel(nextIndex);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate?.(15);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentScreen, activeReelIndex, goToReel]);

  if (loading) {
    return null;
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
          <h2 className="text-lg font-semibold mb-2 text-white">No reels yet</h2>
          <p className="text-white/60 text-center text-sm">Be the first to share your dance moves!</p>
        </div>
      ) : (
        <div className="relative flex-1 h-full">
          {/* Top Header */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
            {/* Logo on left */}
            <span className="text-white font-bold text-lg opacity-80 drop-shadow-md">Reel'it</span>
            
            {/* Following + Live Now in center-right */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScreen('following' as any)}
                className="px-3 py-1.5 text-xs text-white bg-white/20 rounded-full backdrop-blur-sm font-medium"
              >
                Following
              </button>
              <button
                onClick={() => setScreen('live' as any)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-pink-500/80 rounded-full backdrop-blur-sm font-medium"
              >
                <Radio className="w-3 h-3" />
                Live{activeLiveCount > 0 && ` (${activeLiveCount})`}
              </button>
            </div>
          </div>

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
                  autoAdvance={false}
                  startPaused={!userTriggeredPlay}
                  onUserTriggeredPlay={() => setUserTriggeredPlay(true)}
                />
              </div>
            ))}
            
            {/* Infinite scroll trigger */}
            <div ref={loadMoreTriggerRef} className="h-1 w-full" />
            
            {/* Loading more indicator */}
            {loadingMore && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span className="text-white text-xs">Loading more...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;