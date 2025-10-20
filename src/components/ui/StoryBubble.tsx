import React from 'react';
import { Plus } from 'lucide-react';

interface StoryBubbleProps {
  avatarUrl: string;
  username: string;
  isCurrentUser?: boolean;
  onClick: () => void;
}

const StoryBubble: React.FC<StoryBubbleProps> = ({ avatarUrl, username, isCurrentUser, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center space-y-2 flex-shrink-0 group"
    >
      <div className="relative transition-transform group-hover:scale-110 duration-300">
        <div className="w-18 h-18 rounded-full gradient-primary p-[3px] animate-pulse-glow">
          <div className="w-full h-full rounded-full bg-background p-[3px]">
            <img
              src={avatarUrl}
              alt={username}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>
        {isCurrentUser && (
          <div className="absolute -bottom-1 -right-1 gradient-primary rounded-full p-1.5 shadow-lg glow-primary">
            <Plus className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-foreground max-w-[72px] truncate">
        {username}
      </span>
    </button>
  );
};

export default StoryBubble;