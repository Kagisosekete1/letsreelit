import React from 'react';
import { Button } from '@/components/ui/button';
import { Film, Search, Plus, MessageSquare, User, Heart } from 'lucide-react';
import { NotificationBadge, useNotificationCounts } from '@/components/ui/NotificationBadge';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const counts = useNotificationCounts();
  const hasUnreadInbox = counts.messages > 0;
  const hasUnreadActivity = counts.notifications > 0;

  const tabs = [
    { id: 'home', icon: Film, label: 'Reels' },
    { id: 'tutorials', icon: Search, label: 'Search' },
    { id: 'create', icon: Plus, label: 'Create', special: true },
    { id: 'notifications', icon: Heart, label: 'Activity', badge: hasUnreadActivity },
    { id: 'inbox', icon: MessageSquare, label: 'Inbox', badge: hasUnreadInbox },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md lg:hidden">
      <div className="bg-card border border-border rounded-full shadow-xl flex items-center justify-around px-2 py-2">
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
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon className={`${tab.special ? 'w-7 h-7' : 'w-5 h-5'}`} strokeWidth={2} />
            {!tab.special && (
              <span className="text-[10px] font-medium">
                {tab.label}
              </span>
            )}
            {/* Notification badge */}
            {tab.badge && (
              <NotificationBadge 
                className="absolute -top-0.5 -right-0.5" 
                showDotOnly={true}
              />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};
