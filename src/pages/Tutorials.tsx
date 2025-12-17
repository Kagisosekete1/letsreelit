import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Video, TrendingUp, Play, Heart, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CreateReelModal from '@/components/CreateReelModal';
import { supabase } from '@/integrations/supabase/client';

interface TrendingReel {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string;
  likes_count: number;
  views_count: number;
  user_id: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

const Tutorials = () => {
  const [activeTab, setActiveTab] = useState('tutorials');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [trendingReels, setTrendingReels] = useState<TrendingReel[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTrendingReels();
  }, []);

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
          .select('user_id, username, avatar_url')
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

  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
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

  const handleSearch = () => {
    if (searchQuery.trim()) {
      toast({
        title: "Search",
        description: `Searching for "${searchQuery}"...`,
      });
    }
  };


  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-8 pb-20 px-4 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Tutorials</h1>
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
                  onClick={() => navigate('/')}
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

        {/* Tutorials Section - Empty State */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Tutorials</h2>
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
        </div>
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      
      <CreateReelModal isOpen={isCreateReelOpen} onClose={() => setIsCreateReelOpen(false)} />
    </div>
  );
};

export default Tutorials;