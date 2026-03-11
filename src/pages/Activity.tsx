import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import DesktopSidebar from '@/components/DesktopSidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, MessageCircle, Heart, UserPlus, Play, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CreateReelModal from '@/components/CreateReelModal';
import SettingsModal from '@/components/SettingsModal';
import NotificationReelModal from '@/components/NotificationReelModal';
import InboxSearch from '@/components/InboxSearch';
import MobileViewWrapper from '@/components/MobileViewWrapper';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefresh';
import { deduplicateNotifications } from '@/lib/notificationDeduplication';
import { getPreviousRoute, popRouteFromHistory } from '@/hooks/useRouteMemory';

interface Notification {
  id: string;
  type: string;
  from_user_id: string;
  reel_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  from_user?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  followStatus?: 'follows_you' | 'mutual' | null;
}

type ViewState = 
  | { type: 'list' }
  | { type: 'reel'; reelId: string; notificationType?: string };

const Activity = () => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<ViewState>({ type: 'list' });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authUser } = useUser();

  const fetchData = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    
    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
    } else if (notifs) {
      const userIds = [...new Set(notifs.map(n => n.from_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      // Check follow relationships for follow-type notifications
      const followNotifUserIds = [...new Set(notifs.filter(n => n.type === 'follow').map(n => n.from_user_id))];
      let followBackMap = new Map<string, boolean>();
      
      if (followNotifUserIds.length > 0) {
        // Check which of these users we follow back
        const { data: followBacks } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', authUser.id)
          .in('following_id', followNotifUserIds);
        
        followBacks?.forEach(f => followBackMap.set(f.following_id, true));
      }

      const enrichedNotifs = notifs.map(n => ({
        ...n,
        from_user: profiles?.find(p => p.user_id === n.from_user_id),
        followStatus: n.type === 'follow' 
          ? (followBackMap.has(n.from_user_id) ? 'mutual' as const : 'follows_you' as const) 
          : null,
      }));
      setNotifications(enrichedNotifs);
    }
    setLoading(false);
  }, [authUser]);

  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const { containerRef, pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  useEffect(() => {
    if (!authUser) return;

    fetchData();

    const notifChannel = supabase
      .channel('activity-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${authUser.id}`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .eq('user_id', payload.new.from_user_id)
            .single();

          const newNotif = {
            ...payload.new as Notification,
            from_user: profile || undefined
          };

          setNotifications(prev => [newNotif, ...prev]);
          
          toast({
            title: getNotificationTitle(payload.new.type),
            description: `${profile?.display_name || 'Someone'} ${getNotificationAction(payload.new.type)}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [authUser, fetchData, toast]);

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'follow': return 'New Follower';
      case 'like': return 'New Like';
      case 'comment': return 'New Comment';
      case 'comment_reply': return 'Reply to Comment';
      default: return 'Notification';
    }
  };

  const getNotificationAction = (type: string) => {
    switch (type) {
      case 'follow': return 'started following you';
      case 'like': return 'liked your Muv';
      case 'comment': return 'commented on your Muv';
      case 'comment_reply': return 'replied to your comment';
      default: return 'interacted with you';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow': return <UserPlus className="w-4 h-4 text-primary" />;
      case 'like': return <Heart className="w-4 h-4 text-destructive fill-destructive" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-primary" />;
      case 'comment_reply': return <MessageCircle className="w-4 h-4 text-primary" />;
      default: return <Heart className="w-4 h-4" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'home': navigate('/'); break;
      case 'tutorials': navigate('/tutorials'); break;
      case 'create': setIsCreateReelOpen(true); break;
      case 'notifications': break;
      case 'inbox': navigate('/inbox'); break;
      case 'profile': navigate('/profile'); break;
      case 'settings': setIsSettingsOpen(true); break;
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notif.id);

    setNotifications(prev => 
      prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
    );

    // Navigate based on type - for comments and replies, pass the notification type to open comments
    if (notif.reel_id) {
      setViewState({ 
        type: 'reel', 
        reelId: notif.reel_id, 
        notificationType: notif.type 
      });
    } else if (notif.type === 'follow' && notif.from_user?.username) {
      // Navigate to full user profile page
      navigate(`/user/${notif.from_user.username}`);
    }
  };

  const handleSearchClick = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  const handleSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Deduplicate and filter notifications based on search
  const processedNotifications = useMemo(() => {
    // First deduplicate
    const deduplicated = deduplicateNotifications(notifications);
    
    // Then filter by search
    if (!searchQuery.trim()) return deduplicated;
    const q = searchQuery.toLowerCase();
    return deduplicated.filter(n => 
      n.from_user?.display_name?.toLowerCase().includes(q) ||
      n.from_user?.username?.toLowerCase().includes(q) ||
      n.type.toLowerCase().includes(q)
    );
  }, [notifications, searchQuery]);

  const handleBackToList = useCallback(() => {
    setViewState({ type: 'list' });
  }, []);
  
  const handleGoBack = useCallback(() => {
    const prevRoute = getPreviousRoute();
    if (prevRoute && prevRoute !== '/activity') {
      popRouteFromHistory();
      navigate(prevRoute);
    } else {
      navigate('/');
    }
  }, [navigate]);

  // Handle username click - navigate to full profile
  const handleUsernameClick = (username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/user/${username}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <DesktopSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Main Content */}
      <div className="lg:pl-[72px] xl:pl-[244px]">
        <MobileViewWrapper>
          <div className="relative h-full overflow-hidden bg-background flex flex-col">
            <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
            <div 
              ref={containerRef}
              className="pt-8 pb-20 lg:pb-4 flex-1 overflow-y-auto"
              {...handlers}
            >
              {isSearchOpen ? (
                <InboxSearch
                  isOpen={isSearchOpen}
                  onClose={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  searchType="notifications"
                  onSearch={handleSearchQuery}
                />
              ) : (
                <div className="flex items-center justify-between px-4 mb-6">
                  <h1 className="text-xl font-bold text-foreground">Activity</h1>
                  <Button variant="ghost" size="sm" onClick={handleSearchClick}>
                    <Search className="w-5 h-5 text-foreground" />
                  </Button>
                </div>
              )}

              <div className="px-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
                      <Heart className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">No activity yet</h2>
                    <p className="text-muted-foreground text-center text-sm">
                      When someone interacts with your content, you'll see it here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {processedNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                          notif.is_read ? 'bg-secondary/30' : 'bg-secondary/70'
                        } hover:bg-secondary`}
                      >
                        <div className="relative">
                          <Avatar 
                            className="w-12 h-12 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              if (notif.from_user?.username) {
                                handleUsernameClick(notif.from_user.username, e);
                              }
                            }}
                          >
                            <AvatarImage src={notif.from_user?.avatar_url || ''} />
                            <AvatarFallback>{notif.from_user?.display_name?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-background rounded-full flex items-center justify-center">
                            {getNotificationIcon(notif.type)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span 
                              className="font-semibold hover:underline cursor-pointer"
                              onClick={(e) => {
                                if (notif.from_user?.username) {
                                  handleUsernameClick(notif.from_user.username, e);
                                }
                              }}
                            >
                              {notif.from_user?.display_name || 'Someone'}
                            </span>
                            {' '}{getNotificationAction(notif.type)}
                            {notif.followStatus === 'mutual' && (
                              <span className="ml-1 text-xs text-primary font-medium">• Mutual</span>
                            )}
                            {notif.followStatus === 'follows_you' && (
                              <span className="ml-1 text-xs text-muted-foreground">• Follows you</span>
                            )}
                          </p>
                          <span className="text-xs text-muted-foreground">{formatTime(notif.created_at)}</span>
                        </div>
                        {notif.reel_id && (
                          <div className="w-10 h-14 bg-secondary rounded flex items-center justify-center">
                            <Play className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        </MobileViewWrapper>
      </div>
      
      {/* Modals */}
      <CreateReelModal isOpen={isCreateReelOpen} onClose={() => setIsCreateReelOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      {/* Notification Reel Modal - open comments for comment_reply as well */}
      {viewState.type === 'reel' && (
        <NotificationReelModal
          isOpen={true}
          onClose={handleBackToList}
          reelId={viewState.reelId}
          notificationType={viewState.notificationType}
          openCommentsOnLoad={viewState.notificationType === 'comment' || viewState.notificationType === 'comment_reply'}
        />
      )}
    </div>
  );
};

export default Activity;
