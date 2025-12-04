import React, { useState } from 'react';
import { Search, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const TikTokHeader: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast({
        title: "Search",
        description: `Searching for "${searchQuery}"...`,
      });
      // Navigate to user profile if searching for username
      if (searchQuery.startsWith('@')) {
        navigate(`/user/${searchQuery.slice(1)}`);
      }
    }
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleNotifications = () => {
    toast({
      title: "Notifications",
      description: "No new notifications",
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50 shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5">
        {showSearch ? (
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
            <Input
              placeholder="Search users (@username)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-xl"
              autoFocus
            />
            <Button variant="ghost" size="icon" onClick={() => setShowSearch(false)}>
              <X className="w-5 h-5" />
            </Button>
          </form>
        ) : (
          <>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-md" style={{fontFamily: "'Inter', sans-serif"}}>
                R
              </div>
              <span className="text-2xl font-bold text-foreground" style={{fontFamily: "'Inter', sans-serif", fontWeight: 800}}>Reel'It</span>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-secondary/80 rounded-xl transition-all active:scale-95"
                onClick={() => setShowSearch(true)}
              >
                <Search className="w-5 h-5" strokeWidth={2.5} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-secondary/80 rounded-xl transition-all active:scale-95 relative"
                onClick={handleNotifications}
              >
                <Bell className="w-5 h-5" strokeWidth={2.5} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};