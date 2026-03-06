import React from 'react';
import { Button } from '@/components/ui/button';
import { Search, Plus, User, Heart, Play } from 'lucide-react';
import { NotificationBadge, useNotificationCounts } from '@/components/ui/NotificationBadge';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const counts = useNotificationCounts();
  const hasUnreadInbox = counts.messages > 0;
  const hasUnreadActivity = counts.notifications > 0;

  const tabs = [
    { id: 'home', icon: Play, label: "Muv'z" },
    { id: 'tutorials', icon: Search, label: 'Search' },
    { id: 'create', icon: Plus, label: 'Upload', special: true },
    { id: 'notifications', icon: Heart, label: 'Activity', badge: hasUnreadActivity },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const handleTabClick = (tab: typeof tabs[0]) => {
    onTabChange(tab.id);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md lg:hidden">
      <div className="bg-card border border-border rounded-full shadow-xl flex items-center justify-around px-1 py-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors relative ${
              tab.special
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 scale-105 shadow-button'
                : activeTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleTabClick(tab)}
          >
            <tab.icon className={`${tab.special ? 'w-6 h-6' : 'w-4 h-4'}`} strokeWidth={2} />
            {!tab.special && (
              <span className="text-[9px] font-medium">
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
