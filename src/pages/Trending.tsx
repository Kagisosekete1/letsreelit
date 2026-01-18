import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Flame, Eye, Heart, Share2, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { BottomNavigation } from '@/components/BottomNavigation';
import VideoThumbnail from '@/components/ui/VideoThumbnail';
import ReelCard from '@/components/ui/ReelCard';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefresh';

interface TrendingMuv {
  id: string;
  title: string;
  description?: string | null;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  user_id: string;
  engagement_score: number;
  profile?: {
    id?: string;
    username: string;
    display_name?: string;
    avatar_url: string | null;
    verified?: boolean;
  };
}

const Trending = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useUser();
  const [trendingMuvs, setTrendingMuvs] = useState<TrendingMuv[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('tutorials');
  const [selectedMuvIndex, setSelectedMuvIndex] = useState<number | null>(null);
  const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToInitial = useRef(false);

  const handleRefresh = useCallback(async () => {
    await fetchTrendingMuvs();
    if (authUser) await fetchFollowing();
  }, [authUser]);

  const { containerRef, pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  useEffect(() => {
    fetchTrendingMuvs();
    if (authUser) fetchFollowing();
  }, [authUser]);

  const fetchFollowing = async () => {
    if (!authUser) return;
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', authUser.id);

    if (data) {
      setFollowingIds(new Set(data.map(f => f.following_id)));
    }
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!authUser) return;

    const isCurrentlyFollowing = followingIds.has(targetUserId);

    if (isCurrentlyFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', authUser.id)
        .eq('following_id', targetUserId);
      setFollowingIds(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    } else {
      await supabase.from('follows').insert({
        follower_id: authUser.id,
        following_id: targetUserId,
      });
      setFollowingIds(prev => new Set([...prev, targetUserId]));
    }
  };

  const fetchTrendingMuvs = async () => {
    setLoading(true);
    try {
      const { data: muvsData } = await supabase
        .from('reels')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (muvsData && muvsData.length > 0) {
        // Deduplicate muvs by id
        const uniqueMuvs = Array.from(
          new Map(muvsData.map(m => [m.id, m])).values()
        );

        const userIds = [...new Set(uniqueMuvs.map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, username, display_name, avatar_url, verified')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        // Calculate engagement score for each muv
        const muvsWithScore = uniqueMuvs.map(muv => {
          const views = muv.views_count || 0;
          const likes = muv.likes_count || 0;
          const comments = muv.comments_count || 0;
          const shares = muv.shares_count || 0;

          const engagementScore = views > 0
            ? ((likes + comments * 2 + shares * 3) / views) * 100 + (views / 100)
            : likes + comments * 2 + shares * 3;

          return {
            ...muv,
            engagement_score: engagementScore,
            profile: profileMap.get(muv.user_id),
          };
        });

        // Sort by engagement score
        muvsWithScore.sort((a, b) => b.engagement_score - a.engagement_score);

        setTrendingMuvs(muvsWithScore);
      }
    } catch (error) {
      console.error('Error fetching trending muvs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'home': navigate('/', { state: { from: location.pathname } }); break;
      case 'tutorials': navigate('/tutorials', { state: { from: location.pathname } }); break;
      case 'inbox': navigate('/inbox', { state: { from: location.pathname } }); break;
      case 'profile': navigate('/profile', { state: { from: location.pathname } }); break;
    }
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleMuvClick = (index: number) => {
    hasScrolledToInitial.current = false;
    setSelectedMuvIndex(index);
    setCurrentViewerIndex(index);
  };

  const closeMuvViewer = () => {
    setSelectedMuvIndex(null);
    hasScrolledToInitial.current = false;
  };

  // Handle scroll in muv viewer
  const handleViewerScroll = useCallback(() => {
    const container = viewerContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);

    if (newIndex !== currentViewerIndex && newIndex >= 0 && newIndex < trendingMuvs.length) {
      setCurrentViewerIndex(newIndex);
    }
  }, [currentViewerIndex, trendingMuvs.length]);

  // Scroll to initial muv when opening viewer
  useEffect(() => {
    if (selectedMuvIndex !== null && viewerContainerRef.current && !hasScrolledToInitial.current) {
      hasScrolledToInitial.current = true;
      const container = viewerContainerRef.current;
      const itemHeight = container.clientHeight;
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        container.scrollTo({ top: selectedMuvIndex * itemHeight, behavior: 'auto' });
      });
    }
  }, [selectedMuvIndex]);
  if (selectedMuvIndex !== null) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 right-4 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full"
          onClick={closeMuvViewer}
        >
          <X className="w-5 h-5" />
        </Button>

        <div
          ref={viewerContainerRef}
          className="h-[100dvh] overflow-y-auto snap-y snap-mandatory scrollbar-hide"
          onScroll={handleViewerScroll}
        >
          {trendingMuvs.map((muv, index) => {
            const formattedMuv = {
              id: muv.id,
              videoUrl: muv.video_url,
              thumbnailUrl: muv.thumbnail_url || '',
              title: muv.title,
              description: muv.description || '',
              user: {
                id: muv.user_id,
                profileId: muv.profile?.id || muv.user_id,
                username: muv.profile?.username || 'user',
                displayName: muv.profile?.display_name || muv.profile?.username || 'User',
                avatarUrl: muv.profile?.avatar_url || '',
                verified: muv.profile?.verified || false,
              },
              stats: {
                likes: muv.likes_count || 0,
                comments: muv.comments_count || 0,
                shares: muv.shares_count || 0,
                views: muv.views_count || 0,
              },
            };

            return (
              <div
                key={muv.id}
                className="h-[100dvh] w-full snap-start snap-always"
              >
                <ReelCard
                  reel={formattedMuv}
                  followingIds={followingIds}
                  toggleFollow={toggleFollow}
                  isActive={index === currentViewerIndex}
                  isOwner={authUser?.id === muv.user_id}
                  autoAdvance={false}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <div
        ref={containerRef}
        className="pt-4 pb-20 h-full overflow-y-auto"
        {...handlers}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h1 className="text-xl font-bold">Trending Muv'z</h1>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 mb-6">
          <p className="text-muted-foreground text-sm">
            Muv'z ranked by engagement rate, views, and shares. Create viral content to appear here!
          </p>
        </div>

        {/* Stats Legend */}
        <div className="flex items-center gap-4 px-4 mb-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            <span>Views</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            <span>Likes</span>
          </div>
          <div className="flex items-center gap-1">
            <Share2 className="w-3.5 h-3.5" />
            <span>Shares</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span>Engagement</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : trendingMuvs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Flame className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No trending Muv'z yet</p>
            <p className="text-muted-foreground text-sm">Be the first to go viral!</p>
          </div>
        ) : (
          <div className="px-4 space-y-4">
            {trendingMuvs.map((muv, index) => (
              <div
                key={muv.id}
                className="flex gap-3 p-3 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => handleMuvClick(index)}
              >
                {/* Rank Badge */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">#{index + 1}</span>
                </div>

                {/* Thumbnail */}
                <div className="flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden">
                  <VideoThumbnail
                    videoUrl={muv.video_url}
                    thumbnailUrl={muv.thumbnail_url}
                    className="rounded-xl"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 py-1">
                  <p className="font-medium line-clamp-2 mb-1">{muv.title}</p>

                  {muv.profile && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <img
                        src={muv.profile.avatar_url || ''}
                        alt={muv.profile.username}
                        className="w-4 h-4 rounded-full"
                      />
                      <span className="text-xs text-muted-foreground">@{muv.profile.username}</span>
                      {muv.profile.verified && (
                        <div className="w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-[6px] text-white font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{formatCount(muv.views_count)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      <span>{formatCount(muv.likes_count)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      <span>{formatCount(muv.shares_count)}</span>
                    </div>
                  </div>

                  {/* Engagement Score */}
                  <div className="flex items-center gap-1 mt-1.5">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {muv.engagement_score.toFixed(1)}% engagement
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Trending;
