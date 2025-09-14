import React, { useState } from 'react';
import { Screen, Reel } from '@/types';
import VideoCard from './ui/VideoCard';
import StoryBubble from './ui/StoryBubble';
import StoryUploadModal from './StoryUploadModal';
import StoryViewerModal from './StoryViewerModal';

interface Story {
  id: number;
  username: string;
  avatarUrl: string;
  videoUrl: string;
}

const mockStories: Story[] = [
    { id: 1, username: 'amapiano_king', avatarUrl: 'https://picsum.photos/id/1011/200', videoUrl: 'https://videos.pexels.com/video-files/5493215/5493215-hd_1080_1920_25fps.mp4' },
    { id: 2, username: 'dancing_queen', avatarUrl: 'https://picsum.photos/id/1025/200', videoUrl: 'https://videos.pexels.com/video-files/7699943/7699943-hd_1080_1920_25fps.mp4' },
    { id: 3, username: 'vibes_master', avatarUrl: 'https://picsum.photos/id/1012/200', videoUrl: 'https://videos.pexels.com/video-files/8134375/8134375-hd_1080_1920_30fps.mp4' },
    { id: 4, username: 'groove_goddess', avatarUrl: 'https://picsum.photos/id/1013/200', videoUrl: 'https://videos.pexels.com/video-files/3254011/3254011-hd_1080_1920_25fps.mp4' },
    { id: 5, username: 'dance_pro', avatarUrl: 'https://picsum.photos/id/1014/200', videoUrl: 'https://videos.pexels.com/video-files/4494433/4494433-hd_1080_1920_25fps.mp4' },
    { id: 6, username: 'rhythm_rebel', avatarUrl: 'https://picsum.photos/id/1015/200', videoUrl: 'https://videos.pexels.com/video-files/8053782/8053782-hd_1080_1920_25fps.mp4' },
    { id: 7, username: 'piano_feet', avatarUrl: 'https://picsum.photos/id/1016/200', videoUrl: 'https://videos.pexels.com/video-files/4269192/4269192-hd_720_1366_24fps.mp4' },
    { id: 8, username: 'sound_wave', avatarUrl: 'https://picsum.photos/id/1018/200', videoUrl: 'https://videos.pexels.com/video-files/7573215/7573215-hd_1080_1920_25fps.mp4' },
];

interface HomeScreenProps {
  setScreen: (screen: Screen, payload?: any) => void;
  currentScreen: Screen;
  reels: Reel[];
  followingIds: Set<string>;
  toggleFollow: (userId: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ setScreen, currentScreen, reels, followingIds, toggleFollow }) => {
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in">
      {/* Stories Bar */}
      <div className="flex-shrink-0 bg-tiktok-gray border-b border-border">
        <div className="flex space-x-4 p-3 overflow-x-auto">
          <StoryBubble 
            avatarUrl="https://picsum.photos/id/1005/200"
            username="Story'It" 
            isCurrentUser={true}
            onClick={() => setIsStoryModalOpen(true)}
          />
          {mockStories.map(story => (
            <StoryBubble 
              key={story.id}
              avatarUrl={story.avatarUrl}
              username={story.username}
              onClick={() => setViewingStory(story)}
            />
          ))}
        </div>
      </div>
      
      {/* Reels Feed */}
      <div className="flex-1 snap-y snap-mandatory overflow-y-scroll">
        {reels.map(reel => (
          <VideoCard 
            key={reel.id} 
            reel={reel} 
            setScreen={setScreen} 
            currentScreen={currentScreen} 
            followingIds={followingIds} 
            toggleFollow={toggleFollow} 
          />
        ))}
      </div>

      {isStoryModalOpen && (
        <StoryUploadModal 
          isOpen={isStoryModalOpen} 
          onClose={() => setIsStoryModalOpen(false)} 
        />
      )}

      {viewingStory && (
        <StoryViewerModal 
          story={viewingStory}
          onClose={() => setViewingStory(null)}
        />
      )}
    </div>
  );
};

export default HomeScreen;