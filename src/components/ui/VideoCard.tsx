import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share, MoreHorizontal, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Reel, Screen } from '@/types';

interface VideoCardProps {
  reel: Reel;
  setScreen: (screen: Screen, payload?: any) => void;
  currentScreen: Screen;
  followingIds: Set<string>;
  toggleFollow: (userId: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ 
  reel, 
  setScreen, 
  currentScreen, 
  followingIds, 
  toggleFollow 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);

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

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleUserClick = () => {
    setScreen('user-profile', { userId: reel.user.id });
  };

  const isFollowing = followingIds.has(reel.user.id);

  return (
    <div className="relative h-screen w-full bg-tiktok-dark snap-start flex items-center justify-center">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src={reel.videoUrl}
        loop
        muted={isMuted}
        playsInline
        poster={reel.thumbnailUrl}
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

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          className="bg-background/10 backdrop-blur-glass rounded-full p-2 mb-2"
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-foreground" />
          ) : (
            <Volume2 className="w-5 h-5 text-foreground" />
          )}
        </Button>
      </div>

      {/* Video Info */}
      <div className="absolute bottom-20 left-4 right-20 z-10">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              className="p-0 h-auto hover:bg-transparent"
              onClick={handleUserClick}
            >
              <img
                src={reel.user.avatarUrl}
                alt={reel.user.username}
                className="w-10 h-10 rounded-full border-2 border-foreground/20"
              />
            </Button>
            <Button
              variant="ghost"
              className="p-0 h-auto hover:bg-transparent"
              onClick={handleUserClick}
            >
              <span className="text-foreground font-semibold">@{reel.user.username}</span>
            </Button>
            {reel.user.verified && (
              <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs text-primary-foreground">✓</span>
              </div>
            )}
            {!isFollowing && (
              <Button
                variant="outline"
                size="sm"
                className="ml-2 border-foreground text-foreground hover:bg-foreground hover:text-background"
                onClick={() => toggleFollow(reel.user.id)}
              >
                Follow
              </Button>
            )}
          </div>
          <p className="text-foreground text-sm leading-relaxed">{reel.title}</p>
          {reel.description && (
            <p className="text-foreground/80 text-sm">{reel.description}</p>
          )}
          {reel.soundTrack && (
            <div className="flex items-center space-x-2 text-foreground/70 text-sm">
              <span>♪</span>
              <span>{reel.soundTrack.title} - {reel.soundTrack.artist}</span>
            </div>
          )}
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
            className={`w-7 h-7 ${isLiked ? 'text-primary fill-primary' : 'text-foreground'}`}
          />
          <span className="text-xs text-foreground font-semibold">
            {isLiked ? reel.stats.likes + 1 : reel.stats.likes}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center space-y-1 bg-background/10 backdrop-blur-glass rounded-full p-3 hover:bg-background/20"
          onClick={() => setScreen('video', { reelId: reel.id })}
        >
          <MessageCircle className="w-7 h-7 text-foreground" />
          <span className="text-xs text-foreground font-semibold">{reel.stats.comments}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center space-y-1 bg-background/10 backdrop-blur-glass rounded-full p-3 hover:bg-background/20"
        >
          <Share className="w-7 h-7 text-foreground" />
          <span className="text-xs text-foreground font-semibold">{reel.stats.shares}</span>
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

export default VideoCard;