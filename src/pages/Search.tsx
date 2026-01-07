import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search as SearchIcon, Play, Hash } from 'lucide-react';
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

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authUser } = useUser();
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [reels, setReels] = useState<ReelData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReelIndex, setSelectedReelIndex] = useState<number | null>(null);

  const hashtag = searchParams.get('hashtag');

  useEffect(() => {
    if (hashtag) {
      setSearchQuery(`#${hashtag}`);
      searchByHashtag(hashtag);
    }
  }, [hashtag]);

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
        ) : reels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {hashtag ? (
              <>
                <p className="text-lg font-medium mb-2">No videos found</p>
                <p className="text-sm">No videos with #{hashtag} yet</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">Search for hashtags</p>
                <p className="text-sm">Try searching for #dance, #funny, etc.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 px-0.5">
            {reels.map((reel, index) => (
              <div
                key={reel.id}
                className="aspect-[9/16] bg-muted relative overflow-hidden cursor-pointer group"
                onClick={() => handleReelClick(index)}
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
        )}
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