import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share, MoreHorizontal, Volume2, VolumeX, Flag, Ban, Trash2, Bookmark, BookmarkCheck, UserPlus, UserCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useAudio } from '@/contexts/AudioContext';
import CommentsModal from '@/components/CommentsModal';
import ShareReelModal from '@/components/ShareReelModal';

// Helper to parse and render hashtags as clickable links
const renderTextWithHashtags = (text: string, navigate: (path: string) => void) => {
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      const tag = part.slice(1);
      return (
        <button
          key={index}
          className="text-primary font-medium hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/search?hashtag=${encodeURIComponent(tag)}`);
          }}
        >
          {part}
        </button>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

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
  toggleFollow: (userId: string) => Promise<void>;
  isActive?: boolean;
  isOwner?: boolean;
  onPause?: () => void;
  onDelete?: (reelId: string) => void;
  onEnded?: () => void;
  autoAdvance?: boolean;
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
  onEnded,
  autoAdvance = false,
  variant = 'home',
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authUser } = useUser();
  const { requestAudioFocus, releaseAudioFocus, isMuted, setIsMuted, silenceAll } = useAudio();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.stats.likes);
  const [commentCount, setCommentCount] = useState(reel.stats.comments);
  const [shareCount, setShareCount] = useState(reel.stats.shares);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Realtime subscription for likes
  useEffect(() => {
    const channel = supabase
      .channel(`likes-${reel.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes', filter: `reel_id=eq.${reel.id}` },
        async () => {
          const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('reel_id', reel.id);
          setLikeCount(count || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reel.id]);

  // Realtime subscription for comments
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${reel.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `reel_id=eq.${reel.id}` },
        async () => {
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('reel_id', reel.id);
          setCommentCount(count || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reel.id]);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isClearScreen, setIsClearScreen] = useState(false);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const lastTapRef = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);
  const [videoSrc, setVideoSrc] = useState<string | undefined>(isActive ? reel.videoUrl : undefined);
  const [isBuffering, setIsBuffering] = useState(false);

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

  // Auto-play/pause using global audio manager
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset ready state whenever we switch reels / src
    setIsVideoReady(false);
    setIsBuffering(true);

    if (isActive) {
      // Request audio focus from global manager - this silences all other videos
      requestAudioFocus(video, reel.id);
      
      setVideoSrc(reel.videoUrl);
      video.currentTime = 0;

      // Apply mute state from global context
      video.muted = isMuted;

      // Wait for video to be ready before playing to prevent black screen
      const handleCanPlay = () => {
        setIsVideoReady(true);
        setIsBuffering(false);
      };

      const handleLoadedData = () => {
        setIsVideoReady(true);
        setIsBuffering(false);
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('loadeddata', handleLoadedData);

      // Ensure the element has the latest src loaded
      try {
        video.load();
      } catch {
        // ignore
      }

      const playAttempt = async () => {
        // Wait for video to have enough data
        if (video.readyState >= 3) {
          setIsVideoReady(true);
          setIsBuffering(false);
        }

        try {
          await video.play();
          setIsPlaying(true);
        } catch {
          // Browser autoplay policy - if unmuted play fails, try muted
          if (!video.muted) {
            video.muted = true;
            try {
              await video.play();
              setIsPlaying(true);
            } catch {
              // ignore
            }
          }
        }
      };

      void playAttempt();

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('loadeddata', handleLoadedData);
      };
    } else {
      // Release audio focus and stop this video
      releaseAudioFocus(reel.id);
      
      try {
        video.pause();
        video.muted = true;
        video.currentTime = 0;
        video.removeAttribute('src');
        video.load();
      } catch {
        // ignore
      }

      setVideoSrc(undefined);
      setIsPlaying(false);
    }

    return () => {
      // On unmount: release focus and silence
      releaseAudioFocus(reel.id);
      try {
        video.pause();
        video.muted = true;
        video.removeAttribute('src');
        video.load();
      } catch {
        // ignore
      }
    };
  }, [isActive, reel.id, reel.videoUrl, requestAudioFocus, releaseAudioFocus]);

  // Sync mute state from global context to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video && isActive) {
      video.muted = isMuted;
    }
  }, [isMuted, isActive]);

  // Safety net: whenever THIS video plays or is unmuted, ensure it has audio focus
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      // If an inactive reel ever starts playing, force it to stop immediately.
      if (!isActive) {
        try {
          video.pause();
          video.muted = true;
          video.currentTime = 0;
        } catch {
          // ignore
        }
        return;
      }

      // Request audio focus when playing
      requestAudioFocus(video, reel.id);
    };

    const onVolumeChange = () => {
      if (!isActive) {
        try {
          video.muted = true;
        } catch {
          // ignore
        }
        return;
      }

      // If unmuting, request audio focus
      if (!video.muted) {
        requestAudioFocus(video, reel.id);
      }
    };

    const onTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);

    const onVideoEnded = () => {
      if (autoAdvance && onEnded) {
        onEnded();
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onVideoEnded);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onVideoEnded);
    };
  }, [reel.id, autoAdvance, onEnded, isActive]);

  const triggerHaptic = () => {
    // PWA/mobile friendly haptic (best-effort)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate?.(20);
    }
  };

  // Hold-to-clear screen: hold 0.5s to hide UI; when hidden, hold 3s to show UI again
  const handleTouchStart = () => {
    if (!isActive) return;

    isHoldingRef.current = true;

    const delayMs = isClearScreen ? 3000 : 500;

    holdTimerRef.current = setTimeout(() => {
      if (!isHoldingRef.current) return;
      setIsClearScreen(prev => {
        const next = !prev;
        triggerHaptic();
        return next;
      });
    }, delayMs);
  };

  const handleTouchEnd = () => {
    isHoldingRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

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
      const nextCount = likeCount + 1;
      setIsLiked(true);
      setLikeCount(nextCount);

      if (authUser) {
        await supabase.from('likes').insert({ user_id: authUser.id, reel_id: reel.id });
        await supabase.from('reels').update({ likes_count: nextCount }).eq('id', reel.id);
        
        // Create notification for reel owner (if not self)
        if (reel.user.id !== authUser.id) {
          await supabase.from('notifications').insert({
            user_id: reel.user.id,
            from_user_id: authUser.id,
            type: 'like',
            reel_id: reel.id
          });
        }
      }
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      onPause?.();
      setIsPlaying(false);
      // When the user pauses the active reel, silence EVERYTHING to prevent any background audio.
      silenceAll();
      return;
    }

    // Request audio focus when playing
    requestAudioFocus(video, reel.id);

    video.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      // ignore
    });
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Never allow muting/unmuting on an inactive reel
    if (!isActive) return;

    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);

    if (!nextMuted) {
      // Request audio focus when unmuting
      requestAudioFocus(video, reel.id);
    }
  };

  const handleLike = async () => {
    if (!authUser) {
      toast({ title: 'Sign in required', description: 'Please sign in to like reels' });
      return;
    }

    const newIsLiked = !isLiked;
    const nextCount = newIsLiked ? likeCount + 1 : Math.max(0, likeCount - 1);

    setIsLiked(newIsLiked);
    setLikeCount(nextCount);

    if (newIsLiked) {
      await supabase.from('likes').insert({ user_id: authUser.id, reel_id: reel.id });
      await supabase.from('reels').update({ likes_count: nextCount }).eq('id', reel.id);
      
      // Create notification for reel owner (if not self)
      if (reel.user.id !== authUser.id) {
        await supabase.from('notifications').insert({
          user_id: reel.user.id,
          from_user_id: authUser.id,
          type: 'like',
          reel_id: reel.id
        });
      }
    } else {
      await supabase.from('likes').delete().eq('user_id', authUser.id).eq('reel_id', reel.id);
      await supabase.from('reels').update({ likes_count: nextCount }).eq('id', reel.id);
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
    const nextCount = shareCount + 1;
    setShareCount(nextCount);
    await supabase.from('reels').update({ shares_count: nextCount }).eq('id', reel.id);
    setShowShareModal(true);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(reel.videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Watermark filename like TikTok/Instagram: "Reel'it_username_id.mp4"
      a.download = `Reel'it_@${reel.user.username}_${reel.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Download started', description: "Your Reel'it video is being downloaded." });
    } catch {
      toast({ title: 'Download failed', description: 'Could not download video.', variant: 'destructive' });
    }
  };

  const handleReport = async () => {
    if (!authUser) {
      toast({ title: 'Sign in required', description: 'Please sign in to report content' });
      return;
    }

    const { error } = await supabase.from('reports').insert({
      reporter_id: authUser.id,
      reported_reel_id: reel.id,
      reason: 'Reported from reel',
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to submit report.', variant: 'destructive' });
      return;
    }

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

  const isFollowing = followingIds.has(reel.user.id);
  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Button size based on variant
  const buttonSize = variant === 'profile' ? 'w-9 h-9' : 'w-9 h-9';
  const iconSize = variant === 'profile' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div 
      className="absolute inset-0 flex items-center justify-center bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Video container - ensures portrait video fills correctly on all devices */}
      <div className="relative w-full h-full max-w-[56.25vh] mx-auto flex items-center justify-center">
        {/* Cover the video with the thumbnail until the video can actually render a frame */}
        {reel.thumbnailUrl ? (
          <img
            src={reel.thumbnailUrl}
            alt={reel.title}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: isActive && isVideoReady ? 0 : 1 }}
            draggable={false}
          />
        ) : (
          <div
            className="absolute inset-0 bg-black transition-opacity duration-300"
            style={{ opacity: isActive && isVideoReady ? 0 : 1 }}
          />
        )}

        <video
          ref={videoRef}
          data-reel-video="true"
          className="w-full h-full object-contain sm:object-cover transition-opacity duration-300"
          style={{ opacity: isActive && isVideoReady ? 1 : 0 }}
          src={videoSrc}
          preload={isActive ? 'auto' : 'none'}
          loop={!autoAdvance}
          muted={isMuted}
          playsInline
          poster={reel.thumbnailUrl}
          onLoadedData={() => setIsVideoReady(true)}
          onCanPlay={() => setIsVideoReady(true)}
          onClick={handleVideoTap}
        />
      </div>
      
      {/* Double-tap Heart Animation */}
      {showDoubleTapHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart 
            className="w-24 h-24 text-red-500 fill-red-500 animate-ping" 
            style={{ animationDuration: '0.6s' }}
          />
        </div>
      )}
      
      {/* Buffering Indicator Only - No play/pause icon */}
      {isBuffering && isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* UI Elements - Hidden in clear screen mode */}
      <div 
        className="transition-opacity duration-300"
        style={{ opacity: isClearScreen ? 0 : 1, pointerEvents: isClearScreen ? 'none' : 'auto' }}
      >

        {/* Top Controls - Volume Button - top right - clickable on all devices */}
        <div className="absolute top-14 right-4 z-20">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2 bg-black/40 backdrop-blur-sm hover:bg-black/60 active:bg-black/70"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute(e);
            }}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </Button>
        </div>

        {/* User Info & Description - Bottom Left - Fixed layout for all screen sizes */}
        <div className="absolute bottom-16 left-3 right-16 sm:right-20 md:right-24 z-10 max-w-[calc(100%-5rem)] sm:max-w-md">
          <div className="space-y-1.5 sm:space-y-2">
            {/* Username row */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleUserClick} className="flex items-center gap-2 min-w-0">
                <img
                  src={reel.user.avatarUrl}
                  alt={reel.user.username}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white/50 flex-shrink-0"
                />
                <span className="text-white font-bold text-sm sm:text-base drop-shadow-lg truncate">
                  @{reel.user.username}
                </span>
              </button>
              {reel.user.verified && (
                <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-white font-bold">✓</span>
                </div>
              )}
            </div>
            {/* Title/Caption */}
            <p className="text-white text-sm sm:text-base font-medium leading-snug line-clamp-2 drop-shadow-lg break-words">
              {renderTextWithHashtags(reel.title, navigate)}
            </p>
            {/* Description */}
            {reel.description && (
              <p className="text-white/90 text-xs sm:text-sm line-clamp-2 drop-shadow-md break-words">
                {renderTextWithHashtags(reel.description, navigate)}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons - Right Side */}
        <div className="absolute bottom-20 right-2 z-10 flex flex-col items-center space-y-3" style={{ opacity: 0.85 }}>
          {/* User Avatar with Follow Button */}
          <div className="relative mb-1">
            <button onClick={handleUserClick}>
              <img
                src={reel.user.avatarUrl}
                alt={reel.user.username}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
            </button>
            {/* Follow button - only show if not owner and not already following */}
            {authUser && !isOwner && !followingIds.has(reel.user.id) && (
              <button
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full flex items-center justify-center border border-white"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFollow(reel.user.id);
                }}
              >
                <UserPlus className="w-3 h-3 text-primary-foreground" />
              </button>
            )}
            {/* Following indicator */}
            {authUser && !isOwner && followingIds.has(reel.user.id) && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border border-white">
                <UserCheck className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Like */}
          <button
            className="flex flex-col items-center"
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
          >
            <div className={`${buttonSize} rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500/30' : 'bg-black/20'}`}>
              <Heart className={`${iconSize} ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
            </div>
            <span className="text-[10px] text-white mt-0.5">{formatCount(likeCount)}</span>
          </button>

          {/* Comment */}
          <button
            className="flex flex-col items-center"
            onClick={(e) => {
              e.stopPropagation();
              handleComment();
            }}
          >
            <div className={`${buttonSize} rounded-full bg-black/20 flex items-center justify-center`}>
              <MessageCircle className={`${iconSize} text-white`} />
            </div>
            <span className="text-[10px] text-white mt-0.5">{formatCount(commentCount)}</span>
          </button>

          {/* Save */}
          <button
            className="flex flex-col items-center"
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
          >
            <div className={`${buttonSize} rounded-full flex items-center justify-center ${isSaved ? 'bg-yellow-500/30' : 'bg-black/20'}`}>
              {isSaved ? (
                <BookmarkCheck className={`${iconSize} text-yellow-500`} />
              ) : (
                <Bookmark className={`${iconSize} text-white`} />
              )}
            </div>
          </button>

          {/* Share */}
          <button
            className="flex flex-col items-center"
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
          >
            <div className={`${buttonSize} rounded-full bg-black/20 flex items-center justify-center`}>
              <Share className={`${iconSize} text-white`} />
            </div>
            <span className="text-[10px] text-white mt-0.5">{formatCount(shareCount)}</span>
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
              {!isOwner && (
                <>
                  <DropdownMenuItem onClick={handleReport} className="text-destructive">
                    <Flag className="w-4 h-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                    <Ban className="w-4 h-4 mr-2" />
                    Block User
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Views Count - Bottom */}
        <div className="absolute bottom-4 left-3 z-10" style={{ opacity: 0.6 }}>
          <span className="text-[10px] text-white">{formatCount(reel.stats.views)} views</span>
        </div>
      </div>


      {/* Comments Modal */}
      <CommentsModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        reelId={reel.id}
        onCommentCountChange={(count) => setCommentCount(count)}
      />

      {/* Share Modal */}
      <ShareReelModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        reelId={reel.id}
        reelTitle={reel.title}
        username={reel.user.username}
        videoUrl={reel.videoUrl}
      />
    </div>
  );
};

export default ReelCard;
