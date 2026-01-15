import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

interface ProfileView {
  id: string;
  viewer_user_id: string;
  viewed_at: string;
  viewer?: {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface ProfileViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileViewsModal: React.FC<ProfileViewsModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [views, setViews] = useState<ProfileView[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });

  useEffect(() => {
    if (isOpen && authUser) {
      fetchViews();
      fetchStats();
    }
  }, [isOpen, authUser]);

  const fetchViews = async () => {
    if (!authUser) return;
    setLoading(true);

    const { data: viewsData } = await supabase
      .from('profile_views')
      .select('*')
      .eq('profile_user_id', authUser.id)
      .order('viewed_at', { ascending: false })
      .limit(50);

    if (viewsData) {
      // Get unique viewers
      const viewerIds = [...new Set(viewsData.map(v => v.viewer_user_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', viewerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const enrichedViews = viewsData.map(v => ({
        ...v,
        viewer: profileMap.get(v.viewer_user_id),
      }));

      setViews(enrichedViews);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!authUser) return;

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: todayCount }, { count: weekCount }, { count: monthCount }] = await Promise.all([
      supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('profile_user_id', authUser.id)
        .gte('viewed_at', todayStart),
      supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('profile_user_id', authUser.id)
        .gte('viewed_at', weekStart),
      supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('profile_user_id', authUser.id)
        .gte('viewed_at', monthStart),
    ]);

    setStats({
      today: todayCount || 0,
      week: weekCount || 0,
      month: monthCount || 0,
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleViewerClick = (username: string) => {
    onClose();
    navigate(`/user/${username}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Profile Views
          </DialogTitle>
        </DialogHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 py-3 border-b border-border">
          <div className="text-center p-2 bg-secondary/50 rounded-lg">
            <p className="text-lg font-bold text-primary">{stats.today}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </div>
          <div className="text-center p-2 bg-secondary/50 rounded-lg">
            <p className="text-lg font-bold text-primary">{stats.week}</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>
          <div className="text-center p-2 bg-secondary/50 rounded-lg">
            <p className="text-lg font-bold text-primary">{stats.month}</p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </div>
        </div>

        {/* Recent Viewers */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Recent Viewers
          </h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : views.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No profile views yet</p>
              <p className="text-muted-foreground text-xs mt-1">Share your profile to get more views!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {views.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => view.viewer && handleViewerClick(view.viewer.username)}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={view.viewer?.avatar_url || ''} />
                    <AvatarFallback>{view.viewer?.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{view.viewer?.display_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">@{view.viewer?.username || 'user'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatTime(view.viewed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analytics Tip */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Post more reels to increase profile views!</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileViewsModal;
