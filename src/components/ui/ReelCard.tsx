import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share, MoreHorizontal, Play, Volume2, VolumeX, Download, Flag, Ban } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface Reel {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description?: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    verified: boolean;
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  soundTrack?: {
    title: string;
    artist: string;
  };
  isLiked?: boolean;
}

interface ReelCardProps {
  reel: Reel;
  followingIds: Set<string>;
  toggleFollow: (userId: string) => void;
  isActive?: boolean;
  onPause?: () => void;
}

const ReelCard: React.FC<ReelCardProps> = ({ 
  reel, 
  followingIds, 
  toggleFollow,
  isActive = false,
  onPause,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [likeCount, setLikeCount] = useState(reel.stats.likes);

  // Auto-play/pause based on active state
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        videoRef.current.muted = false;
        setIsMuted(false);
      } else {
        videoRef.current.pause();
        videoRef.current.muted = true;
        setIsPlaying(false);
        setIsMuted(true);
      }
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        onPause?.();
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
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleUserClick = () => {
    navigate(`/user/${reel.user.username}`);
  };

  const handleComment = () => {
    toast({
      title: "Comments",
      description: "Comments feature coming soon!",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: reel.title,
        text: `Check out this dance by @${reel.user.username}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard!",
      });
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(reel.videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reel.user.username}_${reel.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Download started",
        description: "Your video is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download video.",
        variant: "destructive",
      });
    }
  };

  const handleReport = () => {
    toast({
      title: "Report submitted",
      description: "Thank you for reporting this content. We'll review it shortly.",
    });
  };

  const handleBlock = () => {
    toast({
      title: "User blocked",
      description: `@${reel.user.username} has been blocked.`,
    });
  };

  const isFollowing = followingIds.has(reel.user.id);

  return (
    <div className="relative h-screen w-full bg-black snap-start flex items-center justify-center snap-always">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ objectFit: 'cover' }}
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

      {/* Gradient Overlay */}
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

      {/* Reel Info */}
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

      {/* Action Buttons - TikTok Style */}
      <div className="absolute bottom-24 right-4 z-10 flex flex-col items-center space-y-5">
        {/* Like */}
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 p-0 h-auto hover:bg-transparent transition-transform"
          onClick={handleLike}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500/20' : 'bg-black/30'}`}>
            <Heart 
              className={`w-7 h-7 transition-all duration-200 ${isLiked ? 'text-red-500 fill-red-500 scale-110' : 'text-white'}`}
            />
          </div>
          <span className="text-xs text-white font-semibold drop-shadow-lg">{likeCount}</span>
        </Button>

        {/* Comment */}
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 p-0 h-auto hover:bg-transparent transition-transform"
          onClick={handleComment}
        >
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-white transition-transform duration-200 active:scale-110" />
          </div>
          <span className="text-xs text-white font-semibold drop-shadow-lg">{reel.stats.comments}</span>
        </Button>

        {/* Share */}
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 p-0 h-auto hover:bg-transparent transition-transform"
          onClick={handleShare}
        >
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <Share className="w-7 h-7 text-white transition-transform duration-200 active:scale-110" />
          </div>
          <span className="text-xs text-white font-semibold drop-shadow-lg">{reel.stats.shares}</span>
        </Button>

        {/* Download */}
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 p-0 h-auto hover:bg-transparent transition-transform"
          onClick={handleDownload}
        >
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <Download className="w-7 h-7 text-white transition-transform duration-200 active:scale-110" />
          </div>
        </Button>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto hover:bg-transparent active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
                <MoreHorizontal className="w-7 h-7 text-white" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={handleReport} className="text-destructive">
              <Flag className="w-4 h-4 mr-2" />
              Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleBlock} className="text-destructive">
              <Ban className="w-4 h-4 mr-2" />
              Block User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ReelCard;
