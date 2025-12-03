import React, { useState } from 'react';
import { Screen } from '@/types';
import StoryBubble from './ui/StoryBubble';
import StoryUploadModal from './StoryUploadModal';
import { useUser } from '@/contexts/UserContext';

interface HomeScreenProps {
  setScreen: (screen: Screen, payload?: any) => void;
  currentScreen: Screen;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ setScreen, currentScreen }) => {
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const { currentUser } = useUser();

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in">
      {/* Stories Bar with glass effect */}
      <div className="flex-shrink-0 backdrop-blur-glass border-b border-border/50">
        <div className="flex space-x-4 p-4 overflow-x-auto scrollbar-hide">
          <StoryBubble 
            avatarUrl={currentUser?.avatarUrl || "https://picsum.photos/id/1005/200"}
            username="Story'It" 
            isCurrentUser={true}
            onClick={() => setIsStoryModalOpen(true)}
          />
        </div>
      </div>
      
      {/* Empty Reels Feed */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2 text-foreground">No reels yet</h2>
        <p className="text-muted-foreground text-center text-sm">
          Be the first to share your dance moves!
        </p>
      </div>

      {isStoryModalOpen && (
        <StoryUploadModal 
          isOpen={isStoryModalOpen} 
          onClose={() => setIsStoryModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default HomeScreen;