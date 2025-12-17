import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share, MoreHorizontal, Play, Pause, Volume2, VolumeX, Download, Flag, Ban, Trash2, Bookmark, BookmarkCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import CommentsModal from '@/components/CommentsModal';

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
  variant?: 'home' | 'profile';
}

const ReelCard: React.FC<ReelCardProps> = ({ 
  reel, 
  followingIds, 
  toggleFollow,
  isActive = false,
  isOwner = false,
  onPause,
  onDelete,
  variant = 'home',
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authUser } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.stats.likes);
  const [commentCount, setCommentCount] = useState(reel.stats.comments);
  const [shareCount, setShareCount] = useState(reel.stats.shares);
  const [showComments, setShowComments] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const lastTapRef = useRef<number>(0);

  // Check if user has liked/saved this reel
  useEffect(() => {
    if (authUser) {
      checkUserInteractions();
    }
  }, [authUser, reel.id]);

  const checkUserInteractions = async () => {
    if (!authUser) return;

    const [{ data: likeData }, { data: saveData }] = await Promise.all([
      supabase.from('likes').select('id').eq('user_id', authUser.id).eq('reel_id', reel.id).maybeSingle(),
      supabase.from('saved_reels').select('id').eq('user_id', authUser.id).eq('reel_id', reel.id).maybeSingle(),
    ]);

    setIsLiked(!!likeData);
    setIsSaved(!!saveData);
  };

  // Auto-play/pause based on active state with sound management
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      // This is the active reel - play with sound
      video.currentTime = 0;
      video.muted = false;
      setIsMuted(false);
      video.play().then(() => setIsPlaying(true)).catch(() => {
        // Browser autoplay policy - try muted
        video.muted = true;
        setIsMuted(true);
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });
    } else {
      // Not active - immediately stop and mute
      video.pause();
      video.muted = true;
      video.currentTime = 0;
      setIsPlaying(false);
      setIsMuted(true);
    }

    // Cleanup: ensure video is stopped when component updates or unmounts
    return () => {
      if (!isActive && video) {
        video.pause();
        video.muted = true;
      }
    };
  }, [isActive, reel.id]);

  const handleVideoTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap - like
      handleDoubleTapLike();
      lastTapRef.current = 0;
    } else {
      // Single tap - play/pause
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current !== 0 && Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY) {
          togglePlay();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleDoubleTapLike = async () => {
    // Show heart animation
    setShowDoubleTapHeart(true);
    setTimeout(() => setShowDoubleTapHeart(false), 800);

    // Like if not already liked
    if (!isLiked) {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      
      if (authUser) {
        await supabase.from('likes').insert({ user_id: authUser.id, reel_id: reel.id });
        await supabase.from('reels').update({ likes_count: likeCount + 1 }).eq('id', reel.id);
      }
    }
  };

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
    if (!authUser) {
      toast({ title: 'Sign in required', description: 'Please sign in to like reels' });
      return;
    }

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));

    if (newIsLiked) {
      await supabase.from('likes').insert({ user_id: authUser.id, reel_id: reel.id });
      await supabase.from('reels').update({ likes_count: likeCount + 1 }).eq('id', reel.id);
    } else {
      await supabase.from('likes').delete().eq('user_id', authUser.id).eq('reel_id', reel.id);
      await supabase.from('reels').update({ likes_count: Math.max(0, likeCount - 1) }).eq('id', reel.id);
    }
  };

  const handleSave = async () => {
    if (!authUser) {
      toast({ title: 'Sign in required', description: 'Please sign in to save reels' });
      return;
    }

    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);

    if (newIsSaved) {
      await supabase.from('saved_reels').insert({ user_id: authUser.id, reel_id: reel.id });
      toast({ title: 'Saved', description: 'Reel saved to your collection' });
    } else {
      await supabase.from('saved_reels').delete().eq('user_id', authUser.id).eq('reel_id', reel.id);
      toast({ title: 'Removed', description: 'Reel removed from saved' });
    }
  };

  const handleUserClick = () => {
    navigate(`/user/${reel.user.username}`);
  };

  const handleComment = () => {
    setShowComments(true);
  };

  const handleShare = async () => {
    setShareCount(prev => prev + 1);
    await supabase.from('reels').update({ shares_count: shareCount + 1 }).eq('id', reel.id);

    if (navigator.share) {
      navigator.share({
        title: reel.title,
        text: `Check out this dance by @${reel.user.username}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied', description: 'Share link copied to clipboard!' });
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
      toast({ title: 'Download started', description: 'Your video is being downloaded.' });
    } catch {
      toast({ title: 'Download failed', description: 'Could not download video.', variant: 'destructive' });
    }
  };

  const handleReport = () => {
    toast({ title: 'Report submitted', description: 'Thank you for reporting this content.' });
  };

  const handleBlock = () => {
    toast({ title: 'User blocked', description: `@${reel.user.username} has been blocked.` });
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('reels').delete().eq('id', reel.id);
    if (!error) {
      toast({ title: 'Reel deleted', description: 'Your reel has been removed.' });
      onDelete?.(reel.id);
    } else {
      toast({ title: 'Error', description: 'Failed to delete reel.', variant: 'destructive' });
    }
  };

  const isFollowing = followingIds.has(reel.user.profileId);
  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Button size based on variant
  const buttonSize = variant === 'profile' ? 'w-9 h-9' : 'w-9 h-9';
  const iconSize = variant === 'profile' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src={reel.videoUrl}
        loop
        muted={isMuted}
        playsInline
        poster={reel.thumbnailUrl}
        onClick={handleVideoTap}
      />
      
      {/* Double-tap Heart Animation */}
      {showDoubleTapHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart 
            className="w-24 h-24 text-red-500 fill-red-500 animate-ping" 
            style={{ animationDuration: '0.6s' }}
          />
        </div>
      )}
      
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
          {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
        </Button>
      </div>

      {/* User Info & Description - Bottom Left */}
      <div className="absolute bottom-16 left-3 right-16 z-10" style={{ opacity: 0.85 }}>
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

      {/* Action Buttons - Right Side */}
      <div className="absolute bottom-20 right-2 z-10 flex flex-col items-center space-y-3" style={{ opacity: 0.85 }}>
        {/* User Avatar */}
        <button onClick={handleUserClick} className="relative mb-1">
          <img
            src={reel.user.avatarUrl}
            alt={reel.user.username}
            className="w-10 h-10 rounded-full border-2 border-white"
          />
        </button>

        {/* Like */}
        <button className="flex flex-col items-center" onClick={handleLike}>
          <div className={`${buttonSize} rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500/30' : 'bg-black/20'}`}>
            <Heart className={`${iconSize} ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
          </div>
          <span className="text-[10px] text-white mt-0.5">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button className="flex flex-col items-center" onClick={handleComment}>
          <div className={`${buttonSize} rounded-full bg-black/20 flex items-center justify-center`}>
            <MessageCircle className={`${iconSize} text-white`} />
          </div>
          <span className="text-[10px] text-white mt-0.5">{formatCount(commentCount)}</span>
        </button>

        {/* Save */}
        <button className="flex flex-col items-center" onClick={handleSave}>
          <div className={`${buttonSize} rounded-full flex items-center justify-center ${isSaved ? 'bg-yellow-500/30' : 'bg-black/20'}`}>
            {isSaved ? (
              <BookmarkCheck className={`${iconSize} text-yellow-500`} />
            ) : (
              <Bookmark className={`${iconSize} text-white`} />
            )}
          </div>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center" onClick={handleShare}>
          <div className={`${buttonSize} rounded-full bg-black/20 flex items-center justify-center`}>
            <Share className={`${iconSize} text-white`} />
          </div>
          <span className="text-[10px] text-white mt-0.5">{formatCount(shareCount)}</span>
        </button>

        {/* Download */}
        <button className="flex flex-col items-center" onClick={handleDownload}>
          <div className={`${buttonSize} rounded-full bg-black/20 flex items-center justify-center`}>
            <Download className={`${iconSize} text-white`} />
          </div>
        </button>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center">
              <div className={`${buttonSize} rounded-full bg-black/20 flex items-center justify-center`}>
                <MoreHorizontal className={`${iconSize} text-white`} />
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

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        reelId={reel.id}
        onCommentCountChange={(count) => setCommentCount(count)}
      />
    </div>
  );
};

export default ReelCard;
