import React, { useState, useEffect } from 'react';
import { VideoPlayer } from './VideoPlayer';

interface Video {
  id: string;
  url: string;
  title: string;
  user: {
    username: string;
    avatar: string;
    verified?: boolean;
  };
  likes: number;
  comments: number;
  shares: number;
}

// Mock data for demonstration
const mockVideos: Video[] = [
  {
    id: '1',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    title: 'Amazing dance moves! 🔥 Who wants to learn this? #dance #trending',
    user: {
      username: 'dancequeen',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      verified: true,
    },
    likes: 125400,
    comments: 2341,
    shares: 1205,
  },
  {
    id: '2',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    title: 'Cooking hack that will blow your mind 🤯 #cooking #lifehack #foodie',
    user: {
      username: 'chefmaster',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    },
    likes: 89200,
    comments: 1876,
    shares: 892,
  },
  {
    id: '3',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'Travel vlog: Hidden gems in Tokyo 🇯🇵 #travel #tokyo #adventure',
    user: {
      username: 'wanderlust',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      verified: true,
    },
    likes: 203800,
    comments: 4521,
    shares: 3240,
  },
];

export const VideoFeed: React.FC = () => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;

    // Minimum swipe distance
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentVideoIndex < mockVideos.length - 1) {
        // Swipe up - next video
        setCurrentVideoIndex(currentVideoIndex + 1);
      } else if (diff < 0 && currentVideoIndex > 0) {
        // Swipe down - previous video
        setCurrentVideoIndex(currentVideoIndex - 1);
      }
    }
  };

  // Keyboard navigation for desktop
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && currentVideoIndex > 0) {
        setCurrentVideoIndex(currentVideoIndex - 1);
      } else if (e.key === 'ArrowDown' && currentVideoIndex < mockVideos.length - 1) {
        setCurrentVideoIndex(currentVideoIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentVideoIndex]);

  return (
    <div 
      className="relative h-screen overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: `translateY(-${currentVideoIndex * 100}vh)` }}
      >
        {mockVideos.map((video, index) => (
          <div key={video.id} className="h-screen flex-shrink-0">
            <VideoPlayer 
              video={video} 
              isActive={index === currentVideoIndex}
            />
          </div>
        ))}
      </div>

      {/* Video Counter */}
      <div className="fixed top-12 right-4 z-50 bg-background/20 backdrop-blur-glass rounded-full px-3 py-1">
        <span className="text-foreground text-sm font-medium">
          {currentVideoIndex + 1} / {mockVideos.length}
        </span>
      </div>
    </div>
  );
};