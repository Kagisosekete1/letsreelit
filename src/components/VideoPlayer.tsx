import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share, MoreHorizontal, Play, Pause } from 'lucide-react';

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

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
  };

  return (
    <div className="relative h-screen w-full bg-tiktok-dark flex items-center justify-center">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src={video.url}
        loop
        muted
        playsInline
        poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDQwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjMWUxZTFlIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjMwMCIgcj0iNDAiIGZpbGw9IiNmZjAwNjYiLz4KPHN2Zz4K"
        onClick={togglePlay}
      />
      
      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="ghost"
            size="lg"
            className="bg-background/20 backdrop-blur-glass rounded-full p-6 animate-pulse-glow"
            onClick={togglePlay}
          >
            <Play className="w-8 h-8 text-primary" fill="currentColor" />
          </Button>
        </div>
      )}

      {/* Video Gradient Overlay */}
      <div className="absolute inset-0 gradient-video pointer-events-none" />

      {/* Video Info */}
      <div className="absolute bottom-20 left-4 right-20 z-10">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <img
              src={video.user.avatar}
              alt={video.user.username}
              className="w-10 h-10 rounded-full border-2 border-foreground/20"
            />
            <span className="text-foreground font-semibold">@{video.user.username}</span>
            {video.user.verified && (
              <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs text-primary-foreground">✓</span>
              </div>
            )}
          </div>
          <p className="text-foreground text-sm leading-relaxed">{video.title}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-20 right-4 z-10 flex flex-col items-center space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center space-y-1 bg-background/10 backdrop-blur-glass rounded-full p-3 hover:bg-background/20"
          onClick={handleLike}
        >
          <Heart 
            className={`w-7 h-7 ${liked ? 'text-primary fill-primary' : 'text-foreground'}`}
          />
          <span className="text-xs text-foreground font-semibold">
            {liked ? video.likes + 1 : video.likes}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center space-y-1 bg-background/10 backdrop-blur-glass rounded-full p-3 hover:bg-background/20"
        >
          <MessageCircle className="w-7 h-7 text-foreground" />
          <span className="text-xs text-foreground font-semibold">{video.comments}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center space-y-1 bg-background/10 backdrop-blur-glass rounded-full p-3 hover:bg-background/20"
        >
          <Share className="w-7 h-7 text-foreground" />
          <span className="text-xs text-foreground font-semibold">{video.shares}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="bg-background/10 backdrop-blur-glass rounded-full p-3 hover:bg-background/20"
        >
          <MoreHorizontal className="w-7 h-7 text-foreground" />
        </Button>
      </div>
    </div>
  );
};