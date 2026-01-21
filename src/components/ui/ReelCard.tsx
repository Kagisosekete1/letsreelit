import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share, MoreHorizontal, Volume2, VolumeX, Flag, Ban, Trash2, Bookmark, BookmarkCheck, UserPlus, UserCheck, Users, Play, Edit2, Maximize } from 'lucide-react';
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
import DuetModal from '@/components/DuetModal';
import EditReelModal from '@/components/EditReelModal';
import ProfileLink from '@/components/ui/ProfileLink';
import DoubleTapLikeAnimation from '@/components/ui/DoubleTapLikeAnimation';
import { sendLikeNotification } from '@/services/notificationService';

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
  /** If true, show a big play button and wait for user tap before playing (first reel in app) */
  startPaused?: boolean;
  /** Callback when user manually triggers play for the first time */
  onUserTriggeredPlay?: () => void;
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
  startPaused = false,
  onUserTriggeredPlay,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authUser } = useUser();
  const { requestAudioFocus, releaseAudioFocus, isMuted, setIsMuted } = useAudio();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.stats.likes);
  const [commentCount, setCommentCount] = useState(reel.stats.comments);
  const [shareCount, setShareCount] = useState(reel.stats.shares);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Tracks whether user has interacted to play (for startPaused mode)
  const [userHasPlayed, setUserHasPlayed] = useState(!startPaused);

  // Realtime subscription for likes - show animation when someone likes this reel
  useEffect(() => {
    const channel = supabase
      .channel(`likes-${reel.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'likes', filter: `reel_id=eq.${reel.id}` },
        async (payload) => {
          const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('reel_id', reel.id);
          setLikeCount(count || 0);

          // Show realtime like animation if it's not from the current user
          const likerId = (payload.new as any).user_id;
          if (likerId && likerId !== authUser?.id && isActive) {
            // Fetch liker's profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('user_id', likerId)
              .single();

            if (profile) {
              setRealtimeLiker({
                avatarUrl: profile.avatar_url || '',
                username: profile.username,
              });
              setTimeout(() => setRealtimeLiker(null), 2000);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'likes', filter: `reel_id=eq.${reel.id}` },
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
  }, [reel.id, authUser?.id, isActive]);

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
  const [showDuetModal, setShowDuetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [realtimeLiker, setRealtimeLiker] = useState<{ avatarUrl: string; username: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [isClearScreen, setIsClearScreen] = useState(false);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const lastTapRef = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);
  const [videoSrc, setVideoSrc] = useState<string | undefined>(reel.videoUrl);
  const [isBuffering, setIsBuffering] = useState(false);
  const [reelTitle, setReelTitle] = useState(reel.title);
  const [reelDescription, setReelDescription] = useState(reel.description || '');

  // If the same ReelCard instance is ever reused for a different reel, force-sync media + text.
  // This prevents "I clicked one Muv but another plays" and avoids stale overlays.
  useEffect(() => {
    setVideoSrc(reel.videoUrl);
    setReelTitle(reel.title);
    setReelDescription(reel.description || '');
    setIsVideoReady(false);
    setIsPlaying(false);
    setIsBuffering(false);
  }, [reel.id, reel.videoUrl, reel.title, reel.description]);

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

    if (isActive) {
      // Request audio focus from global manager - this silences all other videos
      requestAudioFocus(video, reel.id);
      
      // Set video source FIRST before anything else
      if (!videoSrc) {
        setVideoSrc(reel.videoUrl);
      }
      
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

      const handleLoadedMetadata = () => {
        // Video has metadata, can start showing
        if (video.readyState >= 1) {
          setIsBuffering(false);
        }
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      // If startPaused mode and user has not played yet, do NOT auto-play
      if (!userHasPlayed) {
        // Load video but stay paused - show first frame
        video.currentTime = 0;
        video.load();
        return () => {
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('loadeddata', handleLoadedData);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
      }

      const playAttempt = async () => {
        // Wait for video to have enough data
        if (video.readyState >= 3) {
          setIsVideoReady(true);
          setIsBuffering(false);
        }

        try {
          // Don't reset currentTime if video has already played (scrolling back)
          if (video.currentTime === 0 || video.ended) {
            video.currentTime = 0;
          }
          await video.play();
          setIsPlaying(true);
        } catch {
          // Browser autoplay policy - if unmuted play fails, try muted
          if (!video.muted) {
            video.muted = true;
            setIsMuted(true);
            try {
              await video.play();
              setIsPlaying(true);
            } catch {
              // ignore
            }
          }
        }
      };

      // Small delay to ensure video element is ready
      const playTimer = setTimeout(() => {
        void playAttempt();
      }, 50);

      return () => {
        clearTimeout(playTimer);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    } else {
      // Release audio focus but keep video state for smooth scroll back
      releaseAudioFocus(reel.id);
      
      try {
        video.pause();
        video.muted = true;
      } catch {
        // ignore
      }

      setIsPlaying(false);
      // Don't reset isVideoReady - keep it true so video plays immediately when scrolling back
    }

    return () => {
      // On unmount: release focus and silence
      releaseAudioFocus(reel.id);
      try {
        video.pause();
        video.muted = true;
      } catch {
        // ignore
      }
    };
  }, [isActive, reel.id, reel.videoUrl, requestAudioFocus, releaseAudioFocus, userHasPlayed, isMuted, setIsMuted]);

  // Sync mute state from global context to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video && isActive) {
      video.muted = isMuted;
    }
  }, [isMuted, isActive]);

  // Handle app visibility change - resume playback when coming back to foreground
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;

      if (document.visibilityState === 'visible') {
        // App came back to foreground - resume playback from current position
        if (userHasPlayed && !video.ended) {
          video.play().catch(() => {});
          setIsPlaying(true);
        }
      } else {
        // App went to background - pause but keep position
        video.pause();
        setIsPlaying(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, userHasPlayed]);

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

  // Desktop keyboard shortcuts (only when this reel is active)
  useEffect(() => {
    if (!isActive) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't hijack typing
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (target as any)?.isContentEditable) return;

      if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePlay();
      }

      if (e.key.toLowerCase() === 'm') {
        // mimic click behavior
        const video = videoRef.current;
        if (!video) return;
        if (!isActive) return;

        const nextMuted = !isMuted;
        video.muted = nextMuted;
        setIsMuted(nextMuted);
        if (!nextMuted) requestAudioFocus(video, reel.id);
      }

      if (e.key.toLowerCase() === 'l') {
        void handleLike();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActive, isMuted, reel.id, requestAudioFocus]);

  const triggerHaptic = () => {
    // PWA/mobile friendly haptic (best-effort)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate?.(20);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          
          // Send push notification
          sendLikeNotification(reel.user.id, authUser.id, reel.id);
        }
      }
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    // If in startPaused mode and user hasn't played yet, mark user as having played
    if (!userHasPlayed) {
      setUserHasPlayed(true);
      onUserTriggeredPlay?.();

      // Wait briefly for effect to register, then play
      requestAudioFocus(video, reel.id);
      video.play().then(() => setIsPlaying(true)).catch(() => {});
      return;
    }

    if (isPlaying) {
      video.pause();
      onPause?.();
      setIsPlaying(false);
      return;
    }

    // Request audio focus when playing - this silences other videos
    requestAudioFocus(video, reel.id);

    // Resume from current position (don't reset currentTime)
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

    // Store current time and playing state to prevent restart
    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;

    const nextMuted = !isMuted;
    
    // Update mute state without affecting playback
    video.muted = nextMuted;
    setIsMuted(nextMuted);

    // Restore time in case browser resets it
    requestAnimationFrame(() => {
      if (video.currentTime !== currentTime) {
        video.currentTime = currentTime;
      }
      // Ensure video continues playing if it was playing
      if (wasPlaying && video.paused) {
        video.play().catch(() => {});
      }
    });

    if (!nextMuted) {
      // Request audio focus when unmuting
      requestAudioFocus(video, reel.id);
    }
  };

  const handleLike = async () => {
    if (!authUser) {
      toast({ title: 'Sign in required', description: "Please sign in to like Muv'z" });
      return;
    }

    const newIsLiked = !isLiked;
    const nextCount = newIsLiked ? likeCount + 1 : Math.max(0, likeCount - 1);

    setIsLiked(newIsLiked);
    setLikeCount(nextCount);

    if (newIsLiked) {
      await supabase.from('likes').insert({ user_id: authUser.id, reel_id: reel.id });
      await supabase.from('reels').update({ likes_count: nextCount }).eq('id', reel.id);
      
        // Send push + create in-app notification via backend (prevents duplicates)
        void sendLikeNotification(reel.user.id, authUser.id, reel.id);
    } else {
      await supabase.from('likes').delete().eq('user_id', authUser.id).eq('reel_id', reel.id);
      await supabase.from('reels').update({ likes_count: nextCount }).eq('id', reel.id);
    }
  };

  const handleSave = async () => {
    if (!authUser) {
      toast({ title: 'Sign in required', description: "Please sign in to save Muv'z" });
      return;
    }

    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);

    if (newIsSaved) {
      await supabase.from('saved_reels').insert({ user_id: authUser.id, reel_id: reel.id });
      toast({ title: 'Saved', description: "Muv saved to your collection" });
    } else {
      await supabase.from('saved_reels').delete().eq('user_id', authUser.id).eq('reel_id', reel.id);
      toast({ title: 'Removed', description: "Muv removed from saved" });
    }
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
      // Watermark filename like TikTok/Instagram: "Muv'it_username_id.mp4"
      a.download = `Muvit_@${reel.user.username}_${reel.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Download started', description: "Your Muv'it video is being downloaded." });
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
      toast({ title: 'Muv deleted', description: 'Your Muv has been removed.' });
      onDelete?.(reel.id);
    } else {
      toast({ title: 'Error', description: 'Failed to delete Muv.', variant: 'destructive' });
    }
  };

  const isFollowing = followingIds.has(reel.user.id);
  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // De-dupe noisy captions that sometimes repeat username/title across devices
  const displayTitle = useMemo(() => {
    const username = (reel.user.username || '').trim().toLowerCase();
    const handle = username ? `@${username}` : '';
    const displayName = (reel.user.displayName || '').trim().toLowerCase();

    let raw = (reelTitle || '').trim();
    if (!raw) return '';

    // Remove leading @username or display name
    const lowerRaw = raw.toLowerCase();
    if (handle && lowerRaw.startsWith(handle)) {
      raw = raw.slice(handle.length).trimStart().replace(/^[-–—:|]+\s*/, '');
    } else if (displayName && lowerRaw.startsWith(displayName)) {
      raw = raw.slice(displayName.length).trimStart().replace(/^[-–—:|]+\s*/, '');
    }

    return raw;
  }, [reelTitle, reel.user.username, reel.user.displayName]);

  const displayDescription = useMemo(() => {
    const username = (reel.user.username || '').trim().toLowerCase();
    const handle = username ? `@${username}` : '';
    const displayName = (reel.user.displayName || '').trim().toLowerCase();

    let raw = (reelDescription || '').trim();
    if (!raw) return '';

    // Remove leading @username or display name
    const lowerRaw = raw.toLowerCase();
    if (handle && lowerRaw.startsWith(handle)) {
      raw = raw.slice(handle.length).trimStart().replace(/^[-–—:|]+\s*/, '');
    } else if (displayName && lowerRaw.startsWith(displayName)) {
      raw = raw.slice(displayName.length).trimStart().replace(/^[-–—:|]+\s*/, '');
    }

    // If description is effectively the same as the title, hide it
    const norm = (s: string) => s.toLowerCase().replace(/[#\s]+/g, ' ').trim();
    if (displayTitle && norm(raw) === norm(displayTitle)) return '';

    // If description only contains hashtags already in title, hide it
    const titleHashtags = new Set((displayTitle.match(/#\w+/g) || []).map(t => t.toLowerCase()));
    const descHashtags = raw.match(/#\w+/g) || [];
    const descWithoutHashtags = raw.replace(/#\w+/g, '').trim();
    
    if (!descWithoutHashtags && descHashtags.every(h => titleHashtags.has(h.toLowerCase()))) {
      return '';
    }

    return raw;
  }, [reelDescription, reel.user.username, reel.user.displayName, displayTitle]);

  // Button size based on variant
  const buttonSize = variant === 'profile' ? 'w-9 h-9' : 'w-9 h-9';
  const iconSize = variant === 'profile' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Video container - ensures portrait video fills correctly on all devices */}
      <div className="relative w-full h-full max-w-[56.25vh] mx-auto flex items-center justify-center bg-video">
        {/* Solid video surface fallback */}
        <div className="absolute inset-0 bg-video" />

        {/*
          Tap-catcher layer:
          Some mobile WebViews show a big native play overlay when a <video> is paused.
          We keep taps working even when the video element is visually hidden.
        */}
        <div className="absolute inset-0 z-[1]" onClick={handleVideoTap} />

        {/* Thumbnail/placeholder crossfade layer */}
        {reel.thumbnailUrl ? (
          <img
            src={reel.thumbnailUrl}
            alt={reel.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: isActive && isVideoReady && isPlaying ? 0 : 1,
              transition: 'opacity 0.25s ease-in-out',
            }}
            draggable={false}
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0 bg-video"
            style={{
              opacity: isActive && isVideoReady && isPlaying ? 0 : 1,
              transition: 'opacity 0.25s ease-in-out',
            }}
          />
        )}

        {/* Minimal buffering indicator - no overlay, just small spinner */}
        {isActive && isBuffering && isVideoReady && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1]">
            <div className="w-6 h-6 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
          </div>
        )}

        <video
          ref={videoRef}
          data-reel-video="true"
          className="absolute inset-0 w-full h-full object-contain sm:object-cover"
          style={{
            // Hide the <video> element until it's actually playing/buffering.
            // This prevents the large grey native play overlay from appearing on mobile.
            opacity: isActive && (isPlaying || isBuffering) ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out',
            visibility: isActive && (isPlaying || isBuffering) ? 'visible' : 'hidden',
          }}
          src={videoSrc}
          preload={isActive ? 'auto' : 'metadata'}
          loop={!autoAdvance}
          muted={isMuted}
          playsInline
          poster={reel.thumbnailUrl}
          onLoadedData={() => {
            setIsVideoReady(true);
            setIsBuffering(false);
          }}
          onCanPlay={() => {
            setIsVideoReady(true);
            setIsBuffering(false);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current && videoRef.current.readyState >= 1) {
              setIsBuffering(false);
            }
          }}
          onError={(e) => {
            console.error('Video load error:', e);
            setIsBuffering(false);
            if (videoRef.current && reel.videoUrl) {
              videoRef.current.load();
            }
          }}
          onStalled={() => setIsBuffering(true)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsPlaying(true);
            setIsVideoReady(true);
            setIsBuffering(false);
          }}
        />
      </div>
      
      {/* Double-tap Heart Animation (own action) */}
      <DoubleTapLikeAnimation show={showDoubleTapHeart} />
      
      {/* Realtime Like Animation (from other users) */}
      <DoubleTapLikeAnimation 
        show={!!realtimeLiker} 
        likerAvatarUrl={realtimeLiker?.avatarUrl}
        likerUsername={realtimeLiker?.username}
      />
      
      {/* Removed: Big play button overlay - videos now auto-play seamlessly */}

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

        {/* User Info & Caption - Bottom Left (single block, no duplicates) */}
        <div className="absolute bottom-16 left-3 right-16 sm:right-20 md:right-24 z-10 max-w-[calc(100%-5rem)] sm:max-w-md pointer-events-auto">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2">
              <ProfileLink username={reel.user.username} className="flex items-center gap-2 min-w-0 shrink">
                <span className="text-white font-bold text-sm sm:text-base drop-shadow-lg truncate">
                  @{reel.user.username}
                </span>
              </ProfileLink>
              {reel.user.verified && (
                <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-white font-bold">✓</span>
                </div>
              )}
            </div>

            {/* ONE caption only: prefer description+hashtags, otherwise title */}
            {(displayDescription || displayTitle) && (
              <p className="text-white text-sm sm:text-base font-medium leading-snug line-clamp-3 drop-shadow-lg break-words">
                {renderTextWithHashtags(displayDescription || displayTitle, navigate)}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons - Right Side */}
        <div className="absolute bottom-20 right-2 z-10 flex flex-col items-center space-y-3" style={{ opacity: 0.85 }}>
          {/* User Avatar with Follow Button */}
          <div className="relative mb-1">
            <ProfileLink username={reel.user.username}>
              <img
                src={reel.user.avatarUrl}
                alt={reel.user.username}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
            </ProfileLink>
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

          {/* Duet */}
          {!isOwner && (
            <button
              className="flex flex-col items-center"
              onClick={(e) => {
                e.stopPropagation();
                if (!authUser) {
                  toast({ title: 'Sign in required', description: 'Please sign in to create duets' });
                  return;
                }
                setShowDuetModal(true);
              }}
            >
              <div className={`${buttonSize} rounded-full bg-black/20 flex items-center justify-center`}>
                <Users className={`${iconSize} text-white`} />
              </div>
              <span className="text-[10px] text-white mt-0.5">Duet</span>
            </button>
          )}

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
                <>
                  <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Muv
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Muv
                  </DropdownMenuItem>
                </>
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

        {/* Progress bar + Fullscreen - For home variant (with time display) */}
        {variant === 'home' && (
          <div className="absolute bottom-4 left-3 right-3 z-10 flex items-center gap-2">
            {/* Time Display */}
            <span className="text-[10px] text-white/80 font-medium min-w-[32px]">
              {videoRef.current ? formatTime(videoRef.current.currentTime) : '0:00'}
            </span>
            
            {/* Progress Bar */}
            <div 
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const video = videoRef.current;
                if (!video) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percent = clickX / rect.width;
                video.currentTime = percent * video.duration;
              }}
            >
              <div 
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Fullscreen Button - opens in container with black bars */}
            <button
              className="p-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Find the parent container to fullscreen (shows video centered with black bars)
                const container = (e.currentTarget as HTMLElement).closest('[data-reel-item="true"]') || 
                                   (e.currentTarget as HTMLElement).closest('.relative.w-full.h-full');
                if (container) {
                  if (container.requestFullscreen) {
                    container.requestFullscreen();
                  } else if ((container as any).webkitRequestFullscreen) {
                    (container as any).webkitRequestFullscreen();
                  }
                } else {
                  // Fallback to video element
                  const video = videoRef.current;
                  if (!video) return;
                  if (video.requestFullscreen) {
                    video.requestFullscreen();
                  } else if ((video as any).webkitRequestFullscreen) {
                    (video as any).webkitRequestFullscreen();
                  } else if ((video as any).webkitEnterFullscreen) {
                    (video as any).webkitEnterFullscreen();
                  }
                }
              }}
            >
              <Maximize className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Progress bar only - For non-home variants (trending, tutorials) */}
        {variant !== 'home' && (
          <div className="absolute bottom-4 left-3 right-3 z-10">
            {/* Progress Bar Only - no time display */}
            <div 
              className="h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const video = videoRef.current;
                if (!video) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percent = clickX / rect.width;
                video.currentTime = percent * video.duration;
              }}
            >
              <div 
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
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

      {/* Duet Modal */}
      <DuetModal
        isOpen={showDuetModal}
        onClose={() => setShowDuetModal(false)}
        originalReel={{
          id: reel.id,
          videoUrl: reel.videoUrl,
          title: reel.title,
          user: {
            username: reel.user.username,
            avatarUrl: reel.user.avatarUrl,
          },
        }}
      />

      {/* Edit Reel Modal */}
      <EditReelModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        reel={{
          id: reel.id,
          title: reelTitle,
          description: reelDescription,
        }}
        onUpdate={() => {
          // Refresh the title/description from DB
          supabase
            .from('reels')
            .select('title, description')
            .eq('id', reel.id)
            .single()
            .then(({ data }) => {
              if (data) {
                setReelTitle(data.title);
                setReelDescription(data.description || '');
              }
            });
        }}
      />
    </div>
  );
};

export default ReelCard;
