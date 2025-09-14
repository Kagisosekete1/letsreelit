import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface StoryBubbleProps {
  avatarUrl: string;
  username: string;
  isCurrentUser?: boolean;
  onClick: () => void;
}

const StoryBubble: React.FC<StoryBubbleProps> = ({ 
  avatarUrl, 
  username, 
  isCurrentUser = false, 
  onClick 
}) => {
  return (
    <Button
      variant="ghost"
      className="flex flex-col items-center space-y-1 p-2 min-w-[70px] hover:bg-transparent"
      onClick={onClick}
    >
      <div className="relative">
        <div className={`w-16 h-16 rounded-full p-0.5 ${
          isCurrentUser 
            ? 'bg-gradient-to-r from-secondary to-muted' 
            : 'bg-gradient-to-r from-primary to-accent'
        }`}>
          <img
            src={avatarUrl}
            alt={username}
            className="w-full h-full rounded-full object-cover bg-secondary"
          />
        </div>
        {isCurrentUser && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
            <Plus className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
      </div>
      <span className="text-xs text-foreground font-medium truncate max-w-[70px]">
        {isCurrentUser ? 'Your Story' : username}
      </span>
    </Button>
  );
};

export default StoryBubble;