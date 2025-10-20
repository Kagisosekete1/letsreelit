import React from 'react';
import { Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TikTokHeader: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-heavy border-b border-border/50 shadow-md">
      <div className="flex items-center justify-between px-5 py-3.5">
        {/* Left - App Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg glow-primary" style={{fontFamily: "'Lobster', cursive"}}>
            R
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" style={{fontFamily: "'Lobster', cursive"}}>Reel'It</span>
        </div>

        {/* Right - Icons */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-secondary/80 rounded-xl transition-all hover:scale-110"
          >
            <Search className="w-5 h-5" strokeWidth={2.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-secondary/80 rounded-xl transition-all hover:scale-110 relative"
          >
            <Bell className="w-5 h-5" strokeWidth={2.5} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse-glow" />
          </Button>
        </div>
      </div>
    </header>
  );
};