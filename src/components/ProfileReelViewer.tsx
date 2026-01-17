import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import ReelCard from '@/components/ui/ReelCard';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useAudio } from '@/contexts/AudioContext';

interface ReelData {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  user_id: string;
}

interface ProfileReelViewerProps {
  reels: ReelData[];
  initialIndex: number;
  onClose: () => void;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  verified?: boolean;
}

const ProfileReelViewer: React.FC<ProfileReelViewerProps> = ({
  reels,
  initialIndex,
  onClose,
  userId,
  username,
  displayName,
  avatarUrl,
  verified = false,
}) => {
  const { authUser } = useUser();
  const { silenceAll } = useAudio();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToInitial = useRef(false);

  const currentReel = reels[currentIndex];

  useEffect(() => {
    if (authUser) {
      fetchFollowing();
    }
  }, [authUser]);

  // Silence all other videos when this viewer opens
  useEffect(() => {
    silenceAll();
  }, [silenceAll]);

  // Scroll to the initial reel on mount (fixes clicking wrong reel issue)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || hasScrolledToInitial.current) return;

    // Wait for container to render
    requestAnimationFrame(() => {
      const itemHeight = container.clientHeight;
      if (itemHeight > 0 && initialIndex > 0) {
        container.scrollTo({
          top: initialIndex * itemHeight,
          behavior: 'instant'
        });
      }
      hasScrolledToInitial.current = true;
    });
  }, [initialIndex]);

  const fetchFollowing = async () => {
    if (!authUser) return;
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', authUser.id);
    
    if (data) {
      setFollowingIds(new Set(data.map(f => f.following_id)));
    }
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!authUser) return;
    
    const isCurrentlyFollowing = followingIds.has(targetUserId);
    
    if (isCurrentlyFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', authUser.id)
        .eq('following_id', targetUserId);
      setFollowingIds(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    } else {
      await supabase.from('follows').insert({
        follower_id: authUser.id,
        following_id: targetUserId,
      });
      setFollowingIds(prev => new Set([...prev, targetUserId]));
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown' && currentIndex < reels.length - 1) {
      e.preventDefault();
      setCurrentIndex(prev => prev + 1);
    } else if (e.key === 'ArrowUp' && currentIndex > 0) {
      e.preventDefault();
      setCurrentIndex(prev => prev - 1);
    }
  }, [onClose, currentIndex, reels.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle scroll/swipe navigation
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, reels.length]);

  // Scroll to current index when it changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const itemHeight = container.clientHeight;
    container.scrollTo({
      top: currentIndex * itemHeight,
      behavior: 'smooth'
    });
  }, [currentIndex]);

  const formattedReel = (reel: ReelData) => ({
    id: reel.id,
    videoUrl: reel.video_url,
    thumbnailUrl: reel.thumbnail_url || '',
    title: reel.title,
    description: reel.description || '',
    user: {
      id: reel.user_id,
      profileId: reel.user_id,
      username,
      displayName,
      avatarUrl,
      verified,
    },
    stats: {
      likes: reel.likes_count || 0,
      comments: reel.comments_count || 0,
      shares: reel.shares_count || 0,
      views: reel.views_count || 0,
    },
  });

  const isOwner = authUser?.id === userId;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Close Button - matches Home header position */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-3 right-4 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Scrollable Reel Container */}
      <div 
        ref={containerRef}
        className="flex-1 h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapStop: 'always' }}
        onScroll={handleScroll}
      >
        {reels.map((reel, index) => (
          <div
            key={reel.id}
            className="relative h-full w-full snap-start snap-always"
            style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
          >
            <ReelCard
              reel={formattedReel(reel)}
              followingIds={followingIds}
              toggleFollow={toggleFollow}
              isActive={index === currentIndex}
              isOwner={isOwner}
              autoAdvance={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileReelViewer;
