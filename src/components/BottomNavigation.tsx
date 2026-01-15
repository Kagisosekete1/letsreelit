import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home, Search, Plus, MessageSquare, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const { authUser } = useUser();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (authUser) {
      checkUnread();
      subscribeToUpdates();
    }
  }, [authUser]);

  const checkUnread = async () => {
    if (!authUser) return;

    // Check for unread notifications
    const { count: notifCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authUser.id)
      .eq('is_read', false);

    // Check for unread messages
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant_one.eq.${authUser.id},participant_two.eq.${authUser.id}`);

    let unreadMsgs = 0;
    if (convs && convs.length > 0) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convs.map(c => c.id))
        .neq('sender_id', authUser.id)
        .eq('is_read', false);
      unreadMsgs = count || 0;
    }

    setHasUnread((notifCount || 0) > 0 || unreadMsgs > 0);
  };

  const subscribeToUpdates = () => {
    if (!authUser) return;

    const notifChannel = supabase
      .channel('bottom-nav-notifs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${authUser.id}` },
        () => setHasUnread(true)
      )
      .subscribe();

    const msgChannel = supabase
      .channel('bottom-nav-msgs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => checkUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(msgChannel);
    };
  };

  const handleTabClick = (tabId: string) => {
    if (tabId === 'inbox') {
      // Clear unread indicator when visiting inbox
      setHasUnread(false);
    }
    onTabChange(tabId);
  };

  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'tutorials', icon: Search, label: 'Search' },
    { id: 'create', icon: Plus, label: 'Create', special: true },
    { id: 'inbox', icon: MessageSquare, label: 'Inbox' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors relative ${
              tab.special
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 scale-105 shadow-button'
                : activeTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleTabClick(tab.id)}
          >
            <tab.icon className={`${tab.special ? 'w-7 h-7' : 'w-6 h-6'}`} strokeWidth={2} />
            {!tab.special && (
              <span className="text-xs font-medium">
                {tab.label}
              </span>
            )}
            {/* Notification dot */}
            {tab.id === 'inbox' && hasUnread && (
              <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};
