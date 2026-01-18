import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, Hash, TrendingUp, Play, Heart, Eye, Video, Radio, X, Users, Flame, ChevronRight, Clock } from 'lucide-react';
import VideoThumbnail from '@/components/ui/VideoThumbnail';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import ReelCard from '@/components/ui/ReelCard';
import CreateReelModal from '@/components/CreateReelModal';
import TrendingHashtags from '@/components/TrendingHashtags';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefresh';
import SuggestedAccounts from '@/components/SuggestedAccounts';
import AddFriendsFromContacts from '@/components/AddFriendsFromContacts';
import { useContinueWatching } from '@/hooks/useContinueWatching';

interface ReelData {
  id: string;
  title: string;
  description?: string | null;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  user_id: string;
  is_tutorial?: boolean;
  profile?: {
    id?: string;
    username: string;
    display_name?: string;
    avatar_url: string | null;
    verified?: boolean;
  };
}

interface TrendingHashtag {
  tag: string;
  count: number;
}

const Search = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { authUser } = useUser();
  const [activeTab, setActiveTab] = useState('tutorials');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReelData[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingReels, setTrendingReels] = useState<ReelData[]>([]);
  const [tutorialReels, setTutorialReels] = useState<ReelData[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingTutorials, setLoadingTutorials] = useState(true);
  const [selectedReelIndex, setSelectedReelIndex] = useState<number | null>(null);
  const [selectedReelList, setSelectedReelList] = useState<ReelData[]>([]);
  const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [hoveredReelId, setHoveredReelId] = useState<string | null>(null);
  const hoverVideoRef = useRef<HTMLVideoElement | null>(null);
  const [showAddFriends, setShowAddFriends] = useState(false);
  const { continueWatching, updateProgress } = useContinueWatching();

  const hashtag = searchParams.get('hashtag');

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchTrendingReels(),
      fetchTutorialReels(),
      fetchTrendingHashtags(),
      authUser ? fetchFollowing() : Promise.resolve(),
    ]);
  }, [authUser]);

  const { containerRef, pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  useEffect(() => {
    fetchTrendingReels();
    fetchTutorialReels();
    fetchTrendingHashtags();
    if (authUser) fetchFollowing();
  }, [authUser]);

  useEffect(() => {
    if (hashtag) {
      setSearchQuery(`#${hashtag}`);
      searchByHashtag(hashtag);
    }
  }, [hashtag]);

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

  const fetchTrendingHashtags = async () => {
    try {
      const { data: reelsData } = await supabase
        .from('reels')
        .select('id, title, description')
        .order('created_at', { ascending: false })
        .limit(500);

      if (reelsData) {
        const hashtagCounts: Record<string, number> = {};
        
        reelsData.forEach(reel => {
          const text = `${reel.title || ''} ${reel.description || ''}`;
          const matches = text.match(/#\w+/g) || [];
          
          // Use Set to count unique hashtags per reel (no duplicates from same reel)
          const uniqueTagsInReel = new Set(matches.map(tag => tag.slice(1).toLowerCase()));
          
          uniqueTagsInReel.forEach(cleanTag => {
            hashtagCounts[cleanTag] = (hashtagCounts[cleanTag] || 0) + 1;
          });
        });

        const sorted = Object.entries(hashtagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]) => ({ tag, count }));

        setTrendingHashtags(sorted);
      }
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
    }
  };

  const fetchTrendingReels = async () => {
    try {
      const { data: reelsData } = await supabase
        .from('reels')
        .select('*')
        .order('likes_count', { ascending: false })
        .limit(10);

      if (reelsData && reelsData.length > 0) {
        // Deduplicate reels by id
        const uniqueReels = Array.from(
          new Map(reelsData.map(r => [r.id, r])).values()
        );

        const userIds = [...new Set(uniqueReels.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, username, display_name, avatar_url, verified')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const reelsWithProfiles = uniqueReels.map(r => ({
          ...r,
          profile: profileMap.get(r.user_id)
        }));

        reelsWithProfiles.sort((a, b) => {
          const scoreA = (a.likes_count || 0) * 2 + (a.views_count || 0);
          const scoreB = (b.likes_count || 0) * 2 + (b.views_count || 0);
          return scoreB - scoreA;
        });

        setTrendingReels(reelsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching trending:', error);
    } finally {
      setLoadingTrending(false);
    }
  };

  const fetchTutorialReels = async () => {
    try {
      const { data: reelsData } = await supabase
        .from('reels')
        .select('*')
        .eq('is_tutorial', true)
        .order('created_at', { ascending: false });

      if (reelsData && reelsData.length > 0) {
        // Deduplicate reels by id
        const uniqueReels = Array.from(
          new Map(reelsData.map(r => [r.id, r])).values()
        );

        const userIds = [...new Set(uniqueReels.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, username, display_name, avatar_url, verified')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const reelsWithProfiles = uniqueReels.map(r => ({
          ...r,
          profile: profileMap.get(r.user_id)
        }));

        setTutorialReels(reelsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching tutorials:', error);
    } finally {
      setLoadingTutorials(false);
    }
  };

  const searchByHashtag = async (tag: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('reels')
        .select('id, title, description, video_url, thumbnail_url, views_count, likes_count, comments_count, shares_count, user_id')
        .or(`title.ilike.%#${tag}%,description.ilike.%#${tag}%`)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url, verified')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const reelsWithProfiles = data.map(r => ({
          ...r,
          profile: profileMap.get(r.user_id),
        }));

        setSearchResults(reelsWithProfiles);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.startsWith('#')) {
      const tag = searchQuery.slice(1);
      navigate(`/search?hashtag=${encodeURIComponent(tag)}`);
      searchByHashtag(tag);
    } else if (searchQuery.trim()) {
      searchByHashtag(searchQuery.trim());
    }
  };

  const handleHashtagClick = (tag: string) => {
    setSearchQuery(`#${tag}`);
    navigate(`/search?hashtag=${encodeURIComponent(tag)}`);
    searchByHashtag(tag);
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'home': navigate('/', { state: { from: location.pathname } }); break;
      case 'tutorials': break;
      case 'create': setIsCreateReelOpen(true); break;
      case 'inbox': navigate('/inbox', { state: { from: location.pathname } }); break;
      case 'profile': navigate('/profile', { state: { from: location.pathname } }); break;
    }
  };

  const handleLiveDiscovery = () => {
    navigate('/live', { state: { from: location.pathname } });
  };

  const handleReelClick = (reelList: ReelData[], index: number) => {
    setSelectedReelList(reelList);
    setSelectedReelIndex(index);
    setCurrentViewerIndex(index);
  };

  const closeReelViewer = () => {
    setSelectedReelIndex(null);
    setSelectedReelList([]);
  };

  // Hover preview handlers
  const handleMouseEnter = (reelId: string, videoUrl: string) => {
    setHoveredReelId(reelId);
    // Will be used in future for video preview
  };

  const handleMouseLeave = () => {
    setHoveredReelId(null);
    if (hoverVideoRef.current) {
      hoverVideoRef.current.pause();
      hoverVideoRef.current.currentTime = 0;
    }
  };

  // Handle scroll in reel viewer
  const handleViewerScroll = useCallback(() => {
    const container = viewerContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);

    if (newIndex !== currentViewerIndex && newIndex >= 0 && newIndex < selectedReelList.length) {
      setCurrentViewerIndex(newIndex);
    }
  }, [currentViewerIndex, selectedReelList.length]);

  // Scroll to initial reel when opening viewer
  useEffect(() => {
    if (selectedReelIndex === null || !viewerContainerRef.current) return;

    const container = viewerContainerRef.current;

    // Ensure index and scroll position agree (prevents "audio plays but video is hidden")
    setCurrentViewerIndex(selectedReelIndex);

    requestAnimationFrame(() => {
      const itemHeight = container.clientHeight;
      container.scrollTo({ top: selectedReelIndex * itemHeight, behavior: 'auto' });
    });
  }, [selectedReelIndex]);

  // Reel Viewer Modal with vertical scrolling
  if (selectedReelIndex !== null && selectedReelList.length > 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 right-4 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full"
          onClick={closeReelViewer}
        >
          <X className="w-5 h-5" />
        </Button>

        <div
          ref={viewerContainerRef}
          className="h-[100dvh] overflow-y-auto snap-y snap-mandatory scrollbar-hide"
          onScroll={handleViewerScroll}
        >
          {selectedReelList.map((reel, index) => {
            const formattedReel = {
              id: reel.id,
              videoUrl: reel.video_url,
              thumbnailUrl: reel.thumbnail_url || '',
              title: reel.title,
              description: reel.description || '',
              user: {
                id: reel.user_id,
                profileId: reel.profile?.id || reel.user_id,
                username: reel.profile?.username || 'user',
                displayName: reel.profile?.display_name || reel.profile?.username || 'User',
                avatarUrl: reel.profile?.avatar_url || '',
                verified: reel.profile?.verified || false,
              },
              stats: {
                likes: reel.likes_count || 0,
                comments: reel.comments_count || 0,
                shares: reel.shares_count || 0,
                views: reel.views_count || 0,
              },
            };

            return (
              <div
                key={reel.id}
                className="h-[100dvh] w-full snap-start snap-always overflow-hidden"
                style={{ scrollSnapAlign: 'start' }}
              >
                <ReelCard
                  reel={formattedReel}
                  followingIds={followingIds}
                  toggleFollow={toggleFollow}
                  isActive={index === currentViewerIndex}
                  isOwner={authUser?.id === reel.user_id}
                  autoAdvance={false}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Search results view
  if (hashtag && searchResults.length >= 0 && !loading) {
    return (
      <div className="relative h-screen overflow-hidden bg-background">
        <div className="pt-4 pb-20 h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 mb-4">
            <Button variant="ghost" size="sm" onClick={() => {
              setSearchQuery('');
              navigate('/tutorials');
            }}>
              <X className="w-5 h-5" />
            </Button>
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search hashtags..."
                  className="pl-9 rounded-full"
                />
              </div>
              <Button type="submit" className="rounded-full">
                Search
              </Button>
            </form>
          </div>

          {/* Hashtag Header */}
          <div className="px-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Hash className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">#{hashtag}</h1>
                <p className="text-sm text-muted-foreground">{searchResults.length} videos</p>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg font-medium mb-2">No videos found</p>
              <p className="text-sm">No videos with #{hashtag} yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-4">
              {searchResults.map((reel, index) => (
                <div
                  key={reel.id}
                  className="relative cursor-pointer group"
                  onClick={() => handleReelClick(searchResults, index)}
                  onMouseEnter={() => handleMouseEnter(reel.id, reel.video_url)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="relative aspect-[9/16] bg-secondary rounded-xl overflow-hidden">
                    {reel.thumbnail_url ? (
                      <img
                        src={reel.thumbnail_url}
                        alt={reel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <video
                        src={reel.video_url}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        muted
                        playsInline
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-sm font-medium line-clamp-2 mb-1">{reel.title}</p>
                      <div className="flex items-center space-x-2 text-white/80">
                        <div className="flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span className="text-xs">{formatCount(reel.views_count || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {reel.profile && (
                    <div className="flex items-center space-x-1 mt-2">
                      <img
                        src={reel.profile.avatar_url || ''}
                        alt={reel.profile.username}
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="text-xs text-muted-foreground truncate">@{reel.profile.username}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        <CreateReelModal isOpen={isCreateReelOpen} onClose={() => setIsCreateReelOpen(false)} />
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <div 
        ref={containerRef}
        className="pt-8 pb-20 px-4 h-full overflow-y-auto"
        {...handlers}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Search</h1>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl gap-2"
            onClick={handleLiveDiscovery}
          >
            <Radio className="w-4 h-4 text-pink-500" />
            Live
          </Button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative mb-6">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search hashtags..."
            className="pl-10 bg-secondary border-border rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Suggested Accounts */}
        <div className="mb-6">
          <SuggestedAccounts limit={5} compact />
        </div>

        {/* Add Friends Button */}
        <Button 
          variant="outline" 
          className="w-full mb-6 rounded-xl gap-2"
          onClick={() => setShowAddFriends(true)}
        >
          <Users className="w-4 h-4" />
          Add Friends from Contacts
        </Button>

        {/* Trending Hashtags */}
        {trendingHashtags.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Trending Hashtags</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingHashtags.slice(0, 8).map((item) => (
                <button
                  key={item.tag}
                  onClick={() => handleHashtagClick(item.tag)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <Hash className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{item.tag}</span>
                  <span className="text-xs text-muted-foreground">{formatCount(item.count)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Continue Watching Section */}
        {continueWatching.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Continue Watching</h2>
            </div>
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
              {continueWatching.map((item) => (
                <div 
                  key={item.reelId} 
                  className="flex-shrink-0 w-32 relative cursor-pointer group"
                  onClick={() => {
                    // Find the reel in trending or tutorial lists
                    const allReels = [...trendingReels, ...tutorialReels];
                    const index = allReels.findIndex(r => r.id === item.reelId);
                    if (index >= 0) {
                      handleReelClick(allReels, index);
                    } else {
                      // Navigate to watch directly
                      navigate(`/tutorials?reel=${item.reelId}`);
                    }
                  }}
                >
                  <div className="relative aspect-[9/16] bg-secondary rounded-xl overflow-hidden">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center">
                        <Video className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                      <div 
                        className="h-full bg-primary"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                  </div>
                  {item.profile && (
                    <div className="flex items-center space-x-1 mt-2">
                      <img 
                        src={item.profile.avatar_url || ''} 
                        alt={item.profile.username}
                        className="w-4 h-4 rounded-full"
                      />
                      <span className="text-xs text-muted-foreground truncate">@{item.profile.username}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Trending Muv'z</h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary text-sm gap-1"
              onClick={() => navigate('/trending')}
            >
              <Flame className="w-4 h-4" />
              See All
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {loadingTrending ? (
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-32 h-48 bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : trendingReels.length > 0 ? (
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
              {trendingReels.map((reel, index) => (
                <div 
                  key={reel.id} 
                  className="flex-shrink-0 w-32 relative cursor-pointer group"
                  onClick={() => handleReelClick(trendingReels, index)}
                >
                  {/* Ranking Badge */}
                  <div className="absolute -top-1 -left-1 z-10 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">#{index + 1}</span>
                  </div>
                  
                  <VideoThumbnail
                    videoUrl={reel.video_url}
                    thumbnailUrl={reel.thumbnail_url}
                    viewsCount={reel.views_count || 0}
                    className="rounded-xl"
                  />
                  
                  {/* Creator Info */}
                  {reel.profile && (
                    <div className="flex items-center space-x-1 mt-2">
                      <img 
                        src={reel.profile.avatar_url || ''} 
                        alt={reel.profile.username}
                        className="w-4 h-4 rounded-full"
                      />
                      <span className="text-xs text-muted-foreground truncate">@{reel.profile.username}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No trending content yet</p>
          )}
        </div>

        {/* Tutorial Muv'z Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Tutorial Muv'z</h2>
          
          {loadingTutorials ? (
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-32 h-48 bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : tutorialReels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-secondary/30 rounded-2xl">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-2">No Tutorial Muv'z yet</h3>
              <p className="text-muted-foreground text-center text-sm mb-4 px-4">
                Be the first to share your dance moves!
              </p>
              <Button className="rounded-xl" onClick={() => setIsCreateReelOpen(true)}>
                <Video className="w-4 h-4 mr-2" />
                Create Tutorial Muv
              </Button>
            </div>
          ) : (
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
              {tutorialReels.map((reel, index) => (
                <div 
                  key={reel.id} 
                  className="flex-shrink-0 w-32 relative cursor-pointer group"
                  onClick={() => handleReelClick(tutorialReels, index)}
                >
                  <VideoThumbnail
                    videoUrl={reel.video_url}
                    thumbnailUrl={reel.thumbnail_url}
                    viewsCount={reel.views_count || 0}
                    className="rounded-xl"
                  />
                  
                  {/* Creator Info */}
                  {reel.profile && (
                    <div className="flex items-center space-x-1 mt-2">
                      <img 
                        src={reel.profile.avatar_url || ''} 
                        alt={reel.profile.username}
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="text-xs text-muted-foreground truncate">@{reel.profile.username}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      <CreateReelModal isOpen={isCreateReelOpen} onClose={() => setIsCreateReelOpen(false)} />
      <AddFriendsFromContacts isOpen={showAddFriends} onClose={() => setShowAddFriends(false)} />
    </div>
  );
};

export default Search;