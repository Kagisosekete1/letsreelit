import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search as SearchIcon, Hash, TrendingUp } from 'lucide-react';
import VideoThumbnail from '@/components/ui/VideoThumbnail';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import ProfileReelViewer from '@/components/ProfileReelViewer';

interface ReelData {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  user_id: string;
  profile?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    verified: boolean;
  };
}

interface TrendingHashtag {
  tag: string;
  count: number;
}

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authUser } = useUser();
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [reels, setReels] = useState<ReelData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReelIndex, setSelectedReelIndex] = useState<number | null>(null);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  const hashtag = searchParams.get('hashtag');

  useEffect(() => {
    fetchTrendingHashtags();
  }, []);

  useEffect(() => {
    if (hashtag) {
      setSearchQuery(`#${hashtag}`);
      searchByHashtag(hashtag);
    }
  }, [hashtag]);

  const fetchTrendingHashtags = async () => {
    setLoadingTrending(true);
    try {
      // Fetch all reels to extract hashtags
      const { data: reelsData } = await supabase
        .from('reels')
        .select('title, description, views_count')
        .order('created_at', { ascending: false })
        .limit(500);

      if (reelsData) {
        const hashtagCounts: Record<string, number> = {};
        
        reelsData.forEach(reel => {
          const text = `${reel.title || ''} ${reel.description || ''}`;
          const matches = text.match(/#\w+/g) || [];
          matches.forEach(tag => {
            const cleanTag = tag.slice(1).toLowerCase();
            hashtagCounts[cleanTag] = (hashtagCounts[cleanTag] || 0) + (reel.views_count || 1);
          });
        });

        const sorted = Object.entries(hashtagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]) => ({ tag, count }));

        setTrendingHashtags(sorted);
      }
    } catch (error) {
      console.error('Error fetching trending:', error);
    } finally {
      setLoadingTrending(false);
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
        // Fetch profiles for the reels
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

        setReels(reelsWithProfiles);
      } else {
        setReels([]);
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

  const handleReelClick = (index: number) => {
    setSelectedReelIndex(index);
  };

  const selectedReel = selectedReelIndex !== null ? reels[selectedReelIndex] : null;

  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-4 pb-20 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-6 h-6" />
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

        {/* Trending Hashtags Section - Show when no search */}
        {!hashtag && reels.length === 0 && (
          <div className="px-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Trending Hashtags</h2>
            </div>
            {loadingTrending ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : trendingHashtags.length === 0 ? (
              <p className="text-muted-foreground text-sm">No trending hashtags yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.map((item) => (
                  <button
                    key={item.tag}
                    onClick={() => handleHashtagClick(item.tag)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <Hash className="w-4 h-4 text-primary" />
                    <span className="font-medium">{item.tag}</span>
                    <span className="text-xs text-muted-foreground">{formatCount(item.count)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hashtag Header */}
        {hashtag && (
          <div className="px-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Hash className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">#{hashtag}</h1>
                <p className="text-sm text-muted-foreground">{reels.length} videos</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : hashtag && reels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg font-medium mb-2">No videos found</p>
            <p className="text-sm">No videos with #{hashtag} yet</p>
          </div>
        ) : reels.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5 px-0.5">
            {reels.map((reel, index) => (
              <VideoThumbnail
                key={reel.id}
                videoUrl={reel.video_url}
                thumbnailUrl={reel.thumbnail_url}
                viewsCount={reel.views_count || 0}
                onClick={() => handleReelClick(index)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Profile Reel Viewer */}
      {selectedReelIndex !== null && selectedReel?.profile && (
        <ProfileReelViewer
          reels={reels}
          initialIndex={selectedReelIndex}
          onClose={() => setSelectedReelIndex(null)}
          userId={selectedReel.user_id}
          username={selectedReel.profile.username}
          displayName={selectedReel.profile.display_name}
          avatarUrl={selectedReel.profile.avatar_url || ''}
          verified={selectedReel.profile.verified}
        />
      )}

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Search;