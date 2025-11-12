import React from 'react';
import { Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TikTokHeader: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50 shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5">
        {/* Left - App Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-md" style={{fontFamily: "'Inter', sans-serif"}}>
            R
          </div>
          <span className="text-2xl font-bold text-foreground" style={{fontFamily: "'Inter', sans-serif", fontWeight: 800}}>Reel'It</span>
        </div>

        {/* Right - Icons */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-secondary/80 rounded-xl transition-all active:scale-95"
          >
            <Search className="w-5 h-5" strokeWidth={2.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-secondary/80 rounded-xl transition-all active:scale-95 relative"
          >
            <Bell className="w-5 h-5" strokeWidth={2.5} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </Button>
        </div>
      </div>
    </header>
  );
};