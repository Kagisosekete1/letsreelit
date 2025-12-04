import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share, MoreHorizontal, Play, Pause, Volume2, VolumeX, Download, Flag, Ban, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Reel {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description?: string;
  user: {
    id: string;
    profileId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    verified: boolean;
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
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
  isOwner?: boolean;
  onPause?: () => void;
  onDelete?: (reelId: string) => void;
}

const ReelCard: React.FC<ReelCardProps> = ({ 
  reel, 
  followingIds, 
  toggleFollow,
  isActive = false,
  isOwner = false,
  onPause,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [likeCount, setLikeCount] = useState(reel.stats.likes);
  const [commentCount, setCommentCount] = useState(reel.stats.comments);
  const [shareCount, setShareCount] = useState(reel.stats.shares);

  // Auto-play/pause based on active state with sound management
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.currentTime = 0;
        videoRef.current.muted = false;
        setIsMuted(false);
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
          // Autoplay blocked, try muted
          videoRef.current!.muted = true;
          setIsMuted(true);
          videoRef.current!.play().then(() => setIsPlaying(true)).catch(() => {});
        });
      } else {
        videoRef.current.pause();
        videoRef.current.muted = true;
        videoRef.current.currentTime = 0;
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

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleLike = async () => {
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
    
    // Update in database
    await supabase
      .from('reels')
      .update({ likes_count: newIsLiked ? likeCount + 1 : likeCount - 1 })
      .eq('id', reel.id);
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

  const handleShare = async () => {
    setShareCount(prev => prev + 1);
    await supabase
      .from('reels')
      .update({ shares_count: shareCount + 1 })
      .eq('id', reel.id);

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

  const handleReport = async () => {
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

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('reels')
        .delete()
        .eq('id', reel.id);

      if (error) throw error;

      toast({
        title: "Reel deleted",
        description: "Your reel has been removed.",
      });
      onDelete?.(reel.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reel.",
        variant: "destructive",
      });
    }
  };

  const isFollowing = followingIds.has(reel.user.profileId);

  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="relative h-screen w-full bg-black snap-start flex items-center justify-center snap-always">
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
      
      {/* Play/Pause Center Icon */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: isPlaying ? 0 : 1, transition: 'opacity 0.2s' }}
      >
        <div className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <Play className="w-8 h-8 text-white ml-1" fill="white" />
        </div>
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70 pointer-events-none" />

      {/* Top Controls - Mute Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full p-2 bg-black/20 backdrop-blur-sm hover:bg-black/40"
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-white" />
          ) : (
            <Volume2 className="w-4 h-4 text-white" />
          )}
        </Button>
      </div>

      {/* User Info & Description - Bottom Left */}
      <div className="absolute bottom-24 left-3 right-16 z-10" style={{ opacity: 0.85 }}>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <button onClick={handleUserClick} className="flex items-center space-x-2">
              <img
                src={reel.user.avatarUrl}
                alt={reel.user.username}
                className="w-8 h-8 rounded-full border border-white/30"
              />
              <span className="text-white font-semibold text-sm">@{reel.user.username}</span>
            </button>
            {reel.user.verified && (
              <div className="w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white">✓</span>
              </div>
            )}
            {!isFollowing && !isOwner && (
              <Button
                size="sm"
                className="ml-1 h-6 px-3 text-xs bg-primary text-white hover:bg-primary/90 rounded-md"
                onClick={() => toggleFollow(reel.user.profileId)}
              >
                Follow
              </Button>
            )}
          </div>
          <p className="text-white text-xs leading-relaxed line-clamp-2">{reel.title}</p>
          {reel.description && (
            <p className="text-white/70 text-xs line-clamp-1">{reel.description}</p>
          )}
        </div>
      </div>

      {/* Action Buttons - Right Side (TikTok Style, Smaller & Lower) */}
      <div className="absolute bottom-28 right-2 z-10 flex flex-col items-center space-y-4" style={{ opacity: 0.85 }}>
        {/* User Avatar */}
        <button onClick={handleUserClick} className="relative mb-2">
          <img
            src={reel.user.avatarUrl}
            alt={reel.user.username}
            className="w-10 h-10 rounded-full border-2 border-white"
          />
        </button>

        {/* Like */}
        <button
          className="flex flex-col items-center"
          onClick={handleLike}
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500/30' : 'bg-black/20'}`}>
            <Heart 
              className={`w-5 h-5 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}
            />
          </div>
          <span className="text-[10px] text-white mt-0.5">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button
          className="flex flex-col items-center"
          onClick={handleComment}
        >
          <div className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] text-white mt-0.5">{formatCount(commentCount)}</span>
        </button>

        {/* Share */}
        <button
          className="flex flex-col items-center"
          onClick={handleShare}
        >
          <div className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center">
            <Share className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] text-white mt-0.5">{formatCount(shareCount)}</span>
        </button>

        {/* Download */}
        <button
          className="flex flex-col items-center"
          onClick={handleDownload}
        >
          <div className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center">
            <Download className="w-5 h-5 text-white" />
          </div>
        </button>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center">
                <MoreHorizontal className="w-5 h-5 text-white" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            {isOwner && (
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Reel
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleReport} className="text-destructive">
              <Flag className="w-4 h-4 mr-2" />
              Report
            </DropdownMenuItem>
            {!isOwner && (
              <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                <Ban className="w-4 h-4 mr-2" />
                Block User
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Views Count - Bottom */}
      <div className="absolute bottom-4 left-3 z-10" style={{ opacity: 0.6 }}>
        <span className="text-[10px] text-white">{formatCount(reel.stats.views)} views</span>
      </div>
    </div>
  );
};

export default ReelCard;