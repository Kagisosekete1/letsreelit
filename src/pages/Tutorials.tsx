import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, Bookmark, Play, Eye, Heart, X, Home, Search, Plus, MessageSquare, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import ReelCard from '@/components/ui/ReelCard';
import { NotificationBadge, useNotificationCounts } from '@/components/ui/NotificationBadge';

interface TutorialProfile {
  id: string;
  user_id: string | null;
  username: string;
  display_name: string;
  avatar_url: string | null;
  verified: boolean | null;
  followers_count: number | null;
}

interface TutorialReel {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  title: string;
  description: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  difficulty_level: string | null;
  category: string | null;
  created_at: string;
  user_id: string;
  profiles: TutorialProfile | null;
}

type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';
type CategoryFilter = 'all' | 'amapiano' | 'hip-hop' | 'afrobeats' | 'other';
type ViewTab = 'all' | 'saved';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const categoryEmojis: Record<string, string> = {
  amapiano: '🎹',
  'hip-hop': '🎤',
  afrobeats: '🥁',
  other: '🎵',
};

export default function Tutorials() {
  const navigate = useNavigate();
  const [tutorials, setTutorials] = useState<TutorialReel[]>([]);
  const [savedTutorialIds, setSavedTutorialIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  // Filters
  const [viewTab, setViewTab] = useState<ViewTab>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Muv viewer state
  const [selectedMuvIndex, setSelectedMuvIndex] = useState<number | null>(null);
  const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToInitial = useRef(false);

  // Bottom navigation
  const counts = useNotificationCounts();
  const hasUnread = counts.notifications + counts.messages > 0;

  const fetchTutorials = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch tutorials - use user_id directly, no foreign key join
      let query = supabase
        .from('reels')
        .select(`
          id,
          video_url,
          thumbnail_url,
          title,
          description,
          views_count,
          likes_count,
          comments_count,
          shares_count,
          difficulty_level,
          category,
          created_at,
          user_id
        `)
        .eq('is_tutorial', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (difficultyFilter !== 'all') {
        query = query.eq('difficulty_level', difficultyFilter);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data: tutorialsData, error } = await query;

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set((tutorialsData || []).map(t => t.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, verified, followers_count')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      // Fetch saved tutorials if user is logged in
      if (user) {
        const { data: savedData } = await supabase
          .from('saved_reels')
          .select('reel_id')
          .eq('user_id', user.id);

        if (savedData) {
          setSavedTutorialIds(new Set(savedData.map(s => s.reel_id)));
        }

        // Fetch following
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followingData) {
          setFollowingIds(new Set(followingData.map(f => f.following_id)));
        }
      }

      // Deduplicate by ID and attach profiles
      const uniqueMap = new Map<string, TutorialReel>();
      (tutorialsData || []).forEach((t) => {
        if (!uniqueMap.has(t.id)) {
          uniqueMap.set(t.id, {
            ...t,
            profiles: profileMap.get(t.user_id) || null,
          } as TutorialReel);
        }
      });

      setTutorials(Array.from(uniqueMap.values()));
    } catch (error) {
      console.error('Error fetching tutorials:', error);
    } finally {
      setLoading(false);
    }
  }, [difficultyFilter, categoryFilter]);

  useEffect(() => {
    fetchTutorials();
  }, [fetchTutorials]);

  // Filter tutorials based on view tab
  const displayedTutorials = viewTab === 'saved'
    ? tutorials.filter(t => savedTutorialIds.has(t.id))
    : tutorials;

  const toggleFollow = async (userId: string) => {
    if (!currentUserId) return;

    const isFollowing = followingIds.has(userId);

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', userId);

      setFollowingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: userId });

      setFollowingIds(prev => new Set(prev).add(userId));
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const openMuvViewer = (index: number) => {
    hasScrolledToInitial.current = false;
    setSelectedMuvIndex(index);
    setCurrentViewerIndex(index);
  };

  const closeMuvViewer = () => {
    setSelectedMuvIndex(null);
    hasScrolledToInitial.current = false;
  };

  const handleViewerScroll = () => {
    if (!viewerContainerRef.current) return;
    const container = viewerContainerRef.current;
    const itemHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    const newIndex = Math.round(scrollTop / itemHeight);
    if (newIndex !== currentViewerIndex && newIndex >= 0 && newIndex < displayedTutorials.length) {
      setCurrentViewerIndex(newIndex);
    }
  };

  useEffect(() => {
    if (selectedMuvIndex !== null && viewerContainerRef.current && !hasScrolledToInitial.current) {
      hasScrolledToInitial.current = true;
      const container = viewerContainerRef.current;
      const itemHeight = container.clientHeight;
      requestAnimationFrame(() => {
        container.scrollTo({ top: selectedMuvIndex * itemHeight, behavior: 'auto' });
      });
    }
  }, [selectedMuvIndex]);

  const handleTabChange = (tab: string) => {
    if (tab === 'home') {
      navigate('/');
    } else if (tab === 'tutorials') {
      // Already on tutorials
    } else if (tab === 'create') {
      // Handled by parent
    } else if (tab === 'inbox') {
      navigate('/inbox');
    } else if (tab === 'profile') {
      navigate('/profile');
    }
  };

  // Muv Viewer Modal
  if (selectedMuvIndex !== null) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 z-50 text-white bg-black/40 hover:bg-black/60 rounded-full"
          onClick={closeMuvViewer}
        >
          <X className="w-6 h-6" />
        </Button>

        <div
          ref={viewerContainerRef}
          className="h-[100dvh] overflow-y-auto snap-y snap-mandatory scrollbar-hide"
          onScroll={handleViewerScroll}
        >
          {displayedTutorials.map((tutorial, index) => {
            const muvData = {
              id: tutorial.id,
              videoUrl: tutorial.video_url,
              thumbnailUrl: tutorial.thumbnail_url || undefined,
              title: tutorial.title,
              description: tutorial.description || undefined,
              user: {
                id: tutorial.user_id,
                profileId: tutorial.profiles?.id || tutorial.user_id,
                username: tutorial.profiles?.username || 'unknown',
                displayName: tutorial.profiles?.display_name || 'Unknown',
                avatarUrl: tutorial.profiles?.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face',
                verified: tutorial.profiles?.verified || false,
              },
              stats: {
                likes: tutorial.likes_count || 0,
                comments: tutorial.comments_count || 0,
                shares: tutorial.shares_count || 0,
                views: tutorial.views_count || 0,
              },
            };

            return (
              <div
                key={tutorial.id}
                className="h-[100dvh] w-full snap-start snap-always overflow-hidden"
              >
                <ReelCard
                  reel={muvData}
                  isActive={index === currentViewerIndex}
                  followingIds={followingIds}
                  toggleFollow={toggleFollow}
                  variant="home"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Tutorial Muv'z</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'text-primary' : 'text-foreground'}
          >
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* View Tabs */}
        <div className="px-4 pb-3">
          <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as ViewTab)}>
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                All Tutorials
              </TabsTrigger>
              <TabsTrigger value="saved" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bookmark className="w-4 h-4 mr-1" />
                Saved
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            {/* Difficulty Filter */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Difficulty Level</p>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'beginner', 'intermediate', 'advanced'] as DifficultyFilter[]).map((level) => (
                  <Badge
                    key={level}
                    variant={difficultyFilter === level ? 'default' : 'outline'}
                    className={`cursor-pointer capitalize ${
                      difficultyFilter === level ? 'bg-primary text-primary-foreground' : ''
                    }`}
                    onClick={() => setDifficultyFilter(level)}
                  >
                    {level === 'all' ? 'All Levels' : level}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Dance Category</p>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'amapiano', 'hip-hop', 'afrobeats', 'other'] as CategoryFilter[]).map((cat) => (
                  <Badge
                    key={cat}
                    variant={categoryFilter === cat ? 'default' : 'outline'}
                    className={`cursor-pointer capitalize ${
                      categoryFilter === cat ? 'bg-primary text-primary-foreground' : ''
                    }`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat === 'all' ? '🎵 All' : `${categoryEmojis[cat]} ${cat}`}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : displayedTutorials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              {viewTab === 'saved' ? (
                <Bookmark className="w-8 h-8 text-muted-foreground" />
              ) : (
                <Play className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <p className="text-muted-foreground">
              {viewTab === 'saved' 
                ? "You haven't saved any tutorials yet"
                : 'No tutorials found with these filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayedTutorials.map((tutorial, index) => (
              <div
                key={tutorial.id}
                className="relative rounded-xl overflow-hidden bg-muted aspect-[9/16] cursor-pointer group"
                onClick={() => openMuvViewer(index)}
              >
                {/* Thumbnail */}
                {tutorial.thumbnail_url ? (
                  <img
                    src={tutorial.thumbnail_url}
                    alt={tutorial.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Play className="w-10 h-10 text-white/50" />
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Play button on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>

                {/* Difficulty Badge */}
                {tutorial.difficulty_level && (
                  <div className="absolute top-2 left-2">
                    <Badge className={`text-[10px] px-2 py-0.5 ${difficultyColors[tutorial.difficulty_level] || ''}`}>
                      {tutorial.difficulty_level}
                    </Badge>
                  </div>
                )}

                {/* Category Badge */}
                {tutorial.category && tutorial.category !== 'other' && (
                  <div className="absolute top-2 right-2">
                    <span className="text-lg">{categoryEmojis[tutorial.category]}</span>
                  </div>
                )}

                {/* Saved indicator */}
                {savedTutorialIds.has(tutorial.id) && (
                  <div className="absolute top-8 left-2">
                    <Bookmark className="w-4 h-4 text-primary fill-primary" />
                  </div>
                )}

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  {/* User info */}
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={tutorial.profiles?.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face'}
                      alt={tutorial.profiles?.username}
                      className="w-6 h-6 rounded-full object-cover border border-white/20"
                    />
                    <span className="text-white text-xs font-medium truncate">
                      @{tutorial.profiles?.username || 'unknown'}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-white text-sm font-medium line-clamp-2 mb-2">
                    {tutorial.title}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-white/70 text-xs">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatNumber(tutorial.views_count || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatNumber(tutorial.likes_count || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'tutorials', icon: Search, label: 'Search' },
            { id: 'create', icon: Plus, label: 'Create', special: true },
            { id: 'inbox', icon: MessageSquare, label: 'Inbox' },
            { id: 'profile', icon: User, label: 'Profile' },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors relative ${
                tab.special
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 scale-105 shadow-button'
                  : tab.id === 'tutorials'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => handleTabChange(tab.id)}
            >
              <tab.icon className={`${tab.special ? 'w-7 h-7' : 'w-6 h-6'}`} strokeWidth={2} />
              {!tab.special && (
                <span className="text-xs font-medium">
                  {tab.label}
                </span>
              )}
              {tab.id === 'inbox' && hasUnread && (
                <NotificationBadge 
                  className="absolute -top-0.5 -right-0.5" 
                  showDotOnly={false}
                />
              )}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
