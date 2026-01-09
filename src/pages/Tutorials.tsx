import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Video, TrendingUp, Play, Heart, Eye, Radio, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CreateReelModal from '@/components/CreateReelModal';
import { supabase } from '@/integrations/supabase/client';
import ReelCard from '@/components/ui/ReelCard';
import { useUser } from '@/contexts/UserContext';

interface TutorialReel {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url: string | null;
  video_url: string;
  likes_count: number;
  views_count: number;
  comments_count?: number;
  shares_count?: number;
  user_id: string;
  is_tutorial: boolean;
  profile?: {
    id?: string;
    username: string;
    display_name?: string;
    avatar_url: string | null;
    verified?: boolean;
  };
}

const Tutorials = () => {
  const [activeTab, setActiveTab] = useState('tutorials');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [trendingReels, setTrendingReels] = useState<TutorialReel[]>([]);
  const [tutorialReels, setTutorialReels] = useState<TutorialReel[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingTutorials, setLoadingTutorials] = useState(true);
  const [selectedReel, setSelectedReel] = useState<TutorialReel | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { authUser } = useUser();

  useEffect(() => {
    fetchTrendingReels();
    fetchTutorialReels();
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

  const fetchTrendingReels = async () => {
    try {
      // Fetch top reels sorted by engagement (likes + views)
      const { data: reelsData } = await supabase
        .from('reels')
        .select('*')
        .order('likes_count', { ascending: false })
        .limit(10);

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

        // Sort by combined engagement score (likes * 2 + views)
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
      // Fetch all reels marked as tutorials
      const { data: reelsData } = await supabase
        .from('reels')
        .select('*')
        .eq('is_tutorial', true)
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

        setTutorialReels(reelsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching tutorials:', error);
    } finally {
      setLoadingTutorials(false);
    }
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    switch (tab) {
      case 'home':
        navigate('/', { state: { from: location.pathname } });
        break;
      case 'tutorials':
        break;
      case 'create':
        setIsCreateReelOpen(true);
        break;
      case 'inbox':
        navigate('/inbox', { state: { from: location.pathname } });
        break;
      case 'profile':
        navigate('/profile', { state: { from: location.pathname } });
        break;
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      toast({
        title: "Search",
        description: `Searching for "${searchQuery}"...`,
      });
    }
  };

  const handleLiveDiscovery = () => {
    navigate('/live', { state: { from: location.pathname } });
  };

  const handleReelClick = (reel: TutorialReel) => {
    setSelectedReel(reel);
  };

  const closeReelViewer = () => {
    setSelectedReel(null);
  };

  // Reel Viewer Modal
  if (selectedReel) {
    const formattedReel = {
      id: selectedReel.id,
      videoUrl: selectedReel.video_url,
      thumbnailUrl: selectedReel.thumbnail_url || '',
      title: selectedReel.title,
      description: selectedReel.description || '',
      user: {
        id: selectedReel.user_id,
        profileId: selectedReel.profile?.id || selectedReel.user_id,
        username: selectedReel.profile?.username || 'user',
        displayName: selectedReel.profile?.display_name || selectedReel.profile?.username || 'User',
        avatarUrl: selectedReel.profile?.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face',
        verified: selectedReel.profile?.verified || false,
      },
      stats: {
        likes: selectedReel.likes_count || 0,
        comments: selectedReel.comments_count || 0,
        shares: selectedReel.shares_count || 0,
        views: selectedReel.views_count || 0,
      },
    };

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
        <ReelCard
          reel={formattedReel}
          followingIds={followingIds}
          toggleFollow={toggleFollow}
          isActive={true}
          isOwner={authUser?.id === selectedReel.user_id}
          autoAdvance={false}
        />
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-8 pb-20 px-4 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Tutorials</h1>
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
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search dance tutorials..."
            className="pl-10 bg-secondary border-border rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* Trending Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Trending Now</h2>
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
                  onClick={() => handleReelClick(reel)}
                >
                  {/* Ranking Badge */}
                  <div className="absolute -top-1 -left-1 z-10 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">#{index + 1}</span>
                  </div>
                  
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
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    {/* Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-medium line-clamp-1 mb-1">{reel.title}</p>
                      <div className="flex items-center space-x-2 text-white/80">
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3" />
                          <span className="text-[10px]">{formatCount(reel.likes_count || 0)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span className="text-[10px]">{formatCount(reel.views_count || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Creator Info */}
                  {reel.profile && (
                    <div className="flex items-center space-x-1 mt-2">
                      <img 
                        src={reel.profile.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face'} 
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

        {/* Tutorials Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Tutorials</h2>
          
          {loadingTutorials ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[9/16] bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : tutorialReels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-secondary/30 rounded-2xl">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-2">No tutorials yet</h3>
              <p className="text-muted-foreground text-center text-sm mb-4 px-4">
                Be the first to share your dance moves!
              </p>
              <Button className="rounded-xl" onClick={() => setIsCreateReelOpen(true)}>
                <Video className="w-4 h-4 mr-2" />
                Create Tutorial
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {tutorialReels.map((reel) => (
                <div 
                  key={reel.id} 
                  className="relative cursor-pointer group"
                  onClick={() => handleReelClick(reel)}
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
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    {/* Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-sm font-medium line-clamp-2 mb-1">{reel.title}</p>
                      <div className="flex items-center space-x-2 text-white/80">
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3" />
                          <span className="text-xs">{formatCount(reel.likes_count || 0)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span className="text-xs">{formatCount(reel.views_count || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Creator Info */}
                  {reel.profile && (
                    <div className="flex items-center space-x-1 mt-2">
                      <img 
                        src={reel.profile.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face'} 
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
    </div>
  );
};

export default Tutorials;
