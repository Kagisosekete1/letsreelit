import React from 'react';
import { Button } from '@/components/ui/button';
import { Home, Compass, Plus, MessageSquare, User } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'discover', icon: Compass, label: 'Discover' },
    { id: 'create', icon: Plus, label: 'Create', special: true },
    { id: 'inbox', icon: MessageSquare, label: 'Inbox' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-heavy border-t border-border/50 shadow-lg">
      <div className="flex items-center justify-around px-3 py-3">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center space-y-1.5 p-3 rounded-xl transition-all duration-300 ${
              tab.special
                ? 'gradient-primary text-primary-foreground scale-110 glow-primary hover:scale-115'
                : activeTab === tab.id
                ? 'text-primary bg-primary/10 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon className={`${tab.special ? 'w-7 h-7' : 'w-6 h-6'}`} strokeWidth={2.5} />
            <span className={`text-xs font-semibold ${tab.special ? 'hidden' : ''}`}>
              {tab.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};