import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import ReelCard from '@/components/ui/ReelCard';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

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
  const [currentIndex] = useState(initialIndex);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const currentReel = reels[currentIndex];

  useEffect(() => {
    if (authUser) {
      fetchFollowing();
    }
  }, [authUser]);

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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);


  const formattedReel = {
    id: currentReel.id,
    videoUrl: currentReel.video_url,
    thumbnailUrl: currentReel.thumbnail_url || '',
    title: currentReel.title,
    description: currentReel.description || '',
    user: {
      id: userId,
      profileId: userId,
      username,
      displayName,
      avatarUrl,
      verified,
    },
    stats: {
      likes: currentReel.likes_count || 0,
      comments: currentReel.comments_count || 0,
      shares: currentReel.shares_count || 0,
      views: currentReel.views_count || 0,
    },
  };

  const isOwner = authUser?.id === userId;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* Close Button - matches Home header position */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-3 right-4 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Main Reel Content - Full screen like Home */}
      <div className="flex-1 h-full w-full relative">
        <ReelCard
          key={currentReel.id}
          reel={formattedReel}
          followingIds={followingIds}
          toggleFollow={toggleFollow}
          isActive={true}
          isOwner={isOwner}
          autoAdvance={false}
        />
      </div>
    </div>
  );
};

export default ProfileReelViewer;