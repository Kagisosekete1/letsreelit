import React from 'react';
import { Button } from '@/components/ui/button';
import { Home, Search, Plus, MessageSquare, User } from 'lucide-react';
import { NotificationBadge, useNotificationCounts } from '@/components/ui/NotificationBadge';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const counts = useNotificationCounts();
  const hasUnread = counts.notifications + counts.messages > 0;

  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'tutorials', icon: Search, label: 'Search' },
    { id: 'create', icon: Plus, label: 'Create', special: true },
    { id: 'inbox', icon: MessageSquare, label: 'Inbox' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full lg:w-[740px] lg:bottom-4">
      <div className="bg-card border-t border-border lg:border lg:rounded-full lg:mx-4 lg:shadow-xl flex items-center justify-around px-2 py-2">
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
            <tab.icon className={`${tab.special ? 'w-7 h-7' : 'w-6 h-6'}`} strokeWidth={2} />
            {!tab.special && (
              <span className="text-xs font-medium">
                {tab.label}
              </span>
            )}
            {/* Notification badge with count */}
            {tab.id === 'inbox' && hasUnread && (
              <NotificationBadge 
                className="absolute -top-0.5 -right-0.5" 
                showDotOnly={false}
              />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};
