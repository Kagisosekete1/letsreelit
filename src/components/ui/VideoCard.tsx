import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share, MoreHorizontal, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Reel } from '@/types';

interface VideoCardProps {
  reel: Reel;
  followingIds: Set<string>;
  toggleFollow: (userId: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ 
  reel, 
  followingIds, 
  toggleFollow 
}) => {
  const navigate = useNavigate();
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
    navigate(`/user/${reel.user.username}`);
  };

  const isFollowing = followingIds.has(reel.user.id);

  return (
    <div className="relative h-screen w-full bg-black snap-start flex items-center justify-center">
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Button
            variant="ghost"
            size="lg"
            className="backdrop-blur-sm rounded-full p-8 hover:scale-110 transition-transform"
            onClick={togglePlay}
          >
            <Play className="w-10 h-10 text-white drop-shadow-lg" fill="currentColor" strokeWidth={0} />
          </Button>
        </div>
      )}

      {/* Video Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 pointer-events-none" />

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          className="backdrop-blur-sm rounded-full p-2 hover:scale-110 transition-transform bg-black/20"
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white drop-shadow-lg" />
          ) : (
            <Volume2 className="w-5 h-5 text-white drop-shadow-lg" />
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
                className="w-10 h-10 rounded-full border-2 border-white/30"
              />
            </Button>
            <Button
              variant="ghost"
              className="p-0 h-auto hover:bg-transparent"
              onClick={handleUserClick}
            >
              <span className="text-white font-semibold drop-shadow-lg">@{reel.user.username}</span>
            </Button>
            {reel.user.verified && (
              <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs text-white">✓</span>
              </div>
            )}
            {!isFollowing && (
              <Button
                size="sm"
                className="ml-2 bg-primary text-white hover:bg-primary/90 rounded-lg font-semibold shadow-button"
                onClick={() => toggleFollow(reel.user.id)}
              >
                Follow
              </Button>
            )}
          </div>
          <p className="text-white text-sm leading-relaxed drop-shadow-lg">{reel.title}</p>
          {reel.description && (
            <p className="text-white/80 text-sm drop-shadow-lg">{reel.description}</p>
          )}
          {reel.soundTrack && (
            <div className="flex items-center space-x-2 text-white/70 text-sm drop-shadow-lg">
              <span>♪</span>
              <span>{reel.soundTrack.title} - {reel.soundTrack.artist}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-24 right-4 z-10 flex flex-col items-center space-y-5">
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 p-0 h-auto hover:bg-transparent active:scale-95 transition-transform"
          onClick={handleLike}
        >
          <Heart 
            className={`w-7 h-7 transition-all ${isLiked ? 'text-red-500 fill-red-500 scale-110' : 'text-white'}`}
          />
          <span className="text-xs text-white font-semibold drop-shadow-lg">
            {isLiked ? reel.stats.likes + 1 : reel.stats.likes}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 p-0 h-auto hover:bg-transparent active:scale-95 transition-transform"
        >
          <MessageCircle className="w-7 h-7 text-white" />
          <span className="text-xs text-white font-semibold drop-shadow-lg">{reel.stats.comments}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 p-0 h-auto hover:bg-transparent active:scale-95 transition-transform"
        >
          <Share className="w-7 h-7 text-white" />
          <span className="text-xs text-white font-semibold drop-shadow-lg">{reel.stats.shares}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="p-0 h-auto hover:bg-transparent active:scale-95 transition-transform"
        >
          <MoreHorizontal className="w-7 h-7 text-white" />
        </Button>
      </div>
    </div>
  );
};

export default VideoCard;