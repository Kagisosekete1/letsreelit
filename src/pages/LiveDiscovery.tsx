import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Radio, Users, RefreshCw } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CreateReelModal from '@/components/CreateReelModal';
import LiveWatcherModal from '@/components/LiveWatcherModal';

interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  session_id: string;
  started_at: string;
  viewer_count: number;
  likes_count: number;
  broadcaster?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

const LiveDiscovery = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { authUser } = useUser();
  const [activeTab, setActiveTab] = useState('home');
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [followingLives, setFollowingLives] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [selectedLive, setSelectedLive] = useState<LiveStream | null>(null);

  useEffect(() => {
    fetchLiveStreams();

    // Subscribe to realtime updates for live_streams
    const channel = supabase
      .channel('live-discovery')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_streams' },
        () => {
          fetchLiveStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser]);

  const fetchLiveStreams = async () => {
    setLoading(true);
    try {
      // Fetch all active live streams
      const { data: streams, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('is_active', true)
        .order('started_at', { ascending: false });

      if (error) throw error;

      if (streams && streams.length > 0) {
        // Fetch broadcaster profiles
        const userIds = [...new Set(streams.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const streamsWithProfiles = streams.map(s => ({
          ...s,
          broadcaster: profileMap.get(s.user_id),
        }));

        setLiveStreams(streamsWithProfiles);

        // Filter for following lives if user is logged in
        if (authUser) {
          const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', authUser.id);

          const followingIds = new Set(followingData?.map(f => f.following_id) || []);
          const following = streamsWithProfiles.filter(s => followingIds.has(s.user_id));
          setFollowingLives(following);
        }
      } else {
        setLiveStreams([]);
        setFollowingLives([]);
      }
    } catch (error) {
      console.error('Error fetching live streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'home':
        navigate('/', { state: { from: location.pathname } });
        break;
      case 'tutorials':
        navigate('/tutorials', { state: { from: location.pathname } });
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

  const handleWatchLive = (stream: LiveStream) => {
    if (!authUser) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to watch live streams',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    setSelectedLive(stream);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just started';
    if (diffMins < 60) return `${diffMins}m`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
  };

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-4 pb-20 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(location.state?.from || '/')}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Radio className="w-5 h-5 text-pink-500" />
            Live Now
          </h1>
          <Button variant="ghost" size="sm" onClick={fetchLiveStreams}>
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Following Lives Section */}
        {followingLives.length > 0 && (
          <div className="mb-6 px-4">
            <h2 className="text-lg font-semibold mb-3">Following</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {followingLives.map(stream => (
                <div
                  key={stream.id}
                  className="flex-shrink-0 w-40 cursor-pointer"
                  onClick={() => handleWatchLive(stream)}
                >
                  <div className="relative aspect-[9/16] bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl overflow-hidden">
                    {stream.broadcaster?.avatar_url && (
                      <img
                        src={stream.broadcaster.avatar_url}
                        alt={stream.broadcaster.username}
                        className="w-full h-full object-cover opacity-50"
                      />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                      <div className="bg-pink-500 px-2 py-0.5 rounded-full flex items-center gap-1 mb-2">
                        <Radio className="w-2 h-2 text-white animate-pulse" />
                        <span className="text-white text-xs font-semibold">LIVE</span>
                      </div>
                      <img
                        src={stream.broadcaster?.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face'}
                        alt={stream.broadcaster?.username}
                        className="w-12 h-12 rounded-full border-2 border-white mb-2"
                      />
                      <p className="text-white text-xs font-medium text-center line-clamp-1">
                        @{stream.broadcaster?.username}
                      </p>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full">
                        <Users className="w-3 h-3 text-white" />
                        <span className="text-white text-xs">{stream.viewer_count}</span>
                      </div>
                      <span className="text-white/80 text-xs">{formatTime(stream.started_at)}</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium mt-2 line-clamp-1">{stream.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Lives Section */}
        <div className="px-4">
          <h2 className="text-lg font-semibold mb-3">All Live Streams</h2>
          
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-[9/16] bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : liveStreams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-secondary/30 rounded-2xl">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                <Radio className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-2">No one is live</h3>
              <p className="text-muted-foreground text-center text-sm mb-4 px-4">
                Be the first to go live!
              </p>
              <Button className="rounded-xl" onClick={() => setIsCreateReelOpen(true)}>
                <Radio className="w-4 h-4 mr-2" />
                Go Live
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {liveStreams.map(stream => (
                <div
                  key={stream.id}
                  className="cursor-pointer group"
                  onClick={() => handleWatchLive(stream)}
                >
                  <div className="relative aspect-[9/16] bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl overflow-hidden">
                    {stream.broadcaster?.avatar_url && (
                      <img
                        src={stream.broadcaster.avatar_url}
                        alt={stream.broadcaster.username}
                        className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform"
                      />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                      <div className="bg-pink-500 px-2 py-0.5 rounded-full flex items-center gap-1 mb-2">
                        <Radio className="w-2 h-2 text-white animate-pulse" />
                        <span className="text-white text-xs font-semibold">LIVE</span>
                      </div>
                      <img
                        src={stream.broadcaster?.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face'}
                        alt={stream.broadcaster?.username}
                        className="w-12 h-12 rounded-full border-2 border-white mb-2"
                      />
                      <p className="text-white text-xs font-medium text-center line-clamp-1">
                        @{stream.broadcaster?.username}
                      </p>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full">
                        <Users className="w-3 h-3 text-white" />
                        <span className="text-white text-xs">{stream.viewer_count}</span>
                      </div>
                      <span className="text-white/80 text-xs">{formatTime(stream.started_at)}</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium mt-2 line-clamp-1">{stream.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      
      <CreateReelModal isOpen={isCreateReelOpen} onClose={() => setIsCreateReelOpen(false)} />
      
      {selectedLive && (
        <LiveWatcherModal
          isOpen={!!selectedLive}
          onClose={() => setSelectedLive(null)}
          liveStream={selectedLive}
        />
      )}
    </div>
  );
};

export default LiveDiscovery;
