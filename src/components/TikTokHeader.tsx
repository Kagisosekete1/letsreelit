import React from 'react';
import { Button } from '@/components/ui/button';
import { Search, Bell } from 'lucide-react';

export const TikTokHeader: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-glass border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="gradient-primary rounded-lg p-2">
            <span className="text-primary-foreground font-bold text-lg">R</span>
          </div>
          <span className="text-foreground font-bold text-xl">Reel'It</span>
        </div>

        {/* Center - simplified */}
        <div className="flex items-center">
          <span className="text-foreground font-semibold text-lg">For You</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full hover:bg-background/20"
          >
            <Search className="w-5 h-5 text-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full hover:bg-background/20"
          >
            <Bell className="w-5 h-5 text-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
};