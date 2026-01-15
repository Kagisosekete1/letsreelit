import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, MessageCircle, Heart, UserPlus, Play, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CreateReelModal from '@/components/CreateReelModal';
import ChatModal from '@/components/ChatModal';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

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
}

interface Conversation {
  id: string;
  participant_one: string;
  participant_two: string;
  last_message_at: string;
  other_user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  last_message?: string;
  unread_count?: number;
}

const Inbox = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [inboxTab, setInboxTab] = useState('messages');
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authUser } = useUser();

  useEffect(() => {
    if (!authUser) return;

    const fetchData = async () => {
      setLoading(true);
      
      if (inboxTab === 'notifications') {
        // Fetch notifications with user data
        const { data: notifs, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching notifications:', error);
        } else if (notifs) {
          // Fetch user data for each notification
          const userIds = [...new Set(notifs.map(n => n.from_user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', userIds);

          const enrichedNotifs = notifs.map(n => ({
            ...n,
            from_user: profiles?.find(p => p.user_id === n.from_user_id)
          }));
          setNotifications(enrichedNotifs);
        }
      } else {
        // Fetch conversations
        const { data: convs, error } = await supabase
          .from('conversations')
          .select('*')
          .or(`participant_one.eq.${authUser.id},participant_two.eq.${authUser.id}`)
          .order('last_message_at', { ascending: false });

        if (error) {
          console.error('Error fetching conversations:', error);
        } else if (convs) {
          // Get other user's profile for each conversation
          const otherUserIds = convs.map(c => 
            c.participant_one === authUser.id ? c.participant_two : c.participant_one
          );
          
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', otherUserIds);

          // Get last message and unread count for each conversation
          const enrichedConvs = await Promise.all(convs.map(async (c) => {
            const otherUserId = c.participant_one === authUser.id ? c.participant_two : c.participant_one;
            const profile = profiles?.find(p => p.user_id === otherUserId);
            
            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content')
              .eq('conversation_id', c.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', c.id)
              .eq('is_read', false)
              .neq('sender_id', authUser.id);

            return {
              ...c,
              other_user: profile ? { id: otherUserId, ...profile } : undefined,
              last_message: lastMsg?.content,
              unread_count: count || 0
            };
          }));

          setConversations(enrichedConvs);
        }
      }
      setLoading(false);
    };

    fetchData();

    // Subscribe to real-time notifications
    const notifChannel = supabase
      .channel('notifications-realtime')
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

    // Subscribe to new messages
    const msgChannel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          // Refresh conversations when new message arrives
          if (inboxTab === 'messages') {
            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [authUser, inboxTab]);

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'follow': return 'New Follower';
      case 'like': return 'New Like';
      case 'comment': return 'New Comment';
      case 'profile_view': return 'Profile View';
      default: return 'Notification';
    }
  };

  const getNotificationAction = (type: string) => {
    switch (type) {
      case 'follow': return 'started following you';
      case 'like': return 'liked your reel';
      case 'comment': return 'commented on your reel';
      case 'profile_view': return 'viewed your profile';
      default: return 'interacted with you';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow': return <UserPlus className="w-4 h-4 text-primary" />;
      case 'like': return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'profile_view': return <Eye className="w-4 h-4 text-purple-500" />;
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
      case 'inbox': navigate('/inbox'); break;
      case 'profile': navigate('/profile'); break;
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

    // Navigate based on type
    if (notif.type === 'follow' && notif.from_user) {
      navigate(`/user/${notif.from_user.username}`);
    } else if (notif.reel_id) {
      // Could open reel modal here
    }
  };

  const handleConversationClick = (conv: Conversation) => {
    if (conv.other_user) {
      setSelectedConversation(conv);
      setIsChatOpen(true);
    }
  };

  const handleSearch = () => {
    toast({
      title: "Search",
      description: "Search functionality coming soon!",
    });
  };

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-8 pb-20 h-full overflow-y-auto">
        <div className="flex items-center justify-between px-4 mb-6">
          <h1 className="text-xl font-bold text-foreground">Inbox</h1>
          <Button variant="ghost" size="sm" onClick={handleSearch}>
            <Search className="w-5 h-5 text-foreground" />
          </Button>
        </div>

        <div className="flex px-4 mb-6">
          <div className="flex space-x-1 bg-secondary rounded-xl p-1 w-full">
            <Button
              variant="ghost"
              size="sm"
              className={`flex-1 rounded-lg ${
                inboxTab === 'messages'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setInboxTab('messages')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Messages
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`flex-1 rounded-lg ${
                inboxTab === 'notifications'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setInboxTab('notifications')}
            >
              <Heart className="w-4 h-4 mr-2" />
              Activity
            </Button>
          </div>
        </div>

        <div className="px-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : inboxTab === 'messages' ? (
            conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold mb-2">No messages yet</h2>
                <p className="text-muted-foreground text-center text-sm">
                  When you receive messages, they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleConversationClick(conv)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conv.other_user?.avatar_url || ''} />
                      <AvatarFallback>{conv.other_user?.display_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold truncate">{conv.other_user?.display_name}</p>
                        <span className="text-xs text-muted-foreground">{formatTime(conv.last_message_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{conv.last_message || 'No messages'}</p>
                    </div>
                    {(conv.unread_count ?? 0) > 0 && (
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-xs text-primary-foreground font-bold">{conv.unread_count}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            notifications.length === 0 ? (
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
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                      notif.is_read ? 'bg-secondary/30' : 'bg-secondary/70'
                    } hover:bg-secondary`}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={notif.from_user?.avatar_url || ''} />
                        <AvatarFallback>{notif.from_user?.display_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-background rounded-full flex items-center justify-center">
                        {getNotificationIcon(notif.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{notif.from_user?.display_name || 'Someone'}</span>
                        {' '}{getNotificationAction(notif.type)}
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
            )
          )}
        </div>
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      
      <CreateReelModal isOpen={isCreateReelOpen} onClose={() => setIsCreateReelOpen(false)} />
      
      {selectedConversation?.other_user && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setSelectedConversation(null);
          }}
          conversationId={selectedConversation.id}
          otherUser={selectedConversation.other_user}
        />
      )}
    </div>
  );
};

export default Inbox;