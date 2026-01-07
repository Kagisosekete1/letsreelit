import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, ChevronUp, ChevronDown, Volume2, VolumeX } from 'lucide-react';
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
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState(100);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentReel = reels[currentIndex];

  useEffect(() => {
    if (authUser) {
      fetchFollowing();
    }
  }, [authUser]);


  // Apply volume to active video
  useEffect(() => {
    const video = document.querySelector('video[data-reel-video="true"]') as HTMLVideoElement;
    if (video) {
      video.volume = volume / 100;
    }
  }, [volume, currentIndex]);

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

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      handlePrevious();
    } else if (e.key === 'ArrowDown') {
      handleNext();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);


  const formattedReel = {
    id: currentReel.id,
    videoUrl: currentReel.video_url,
    thumbnailUrl: currentReel.thumbnail_url || '',
    title: currentReel.title,
    description: currentReel.description,
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
      className="fixed inset-0 z-50 bg-background flex items-center justify-center"
    >
      {/* Close Button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Volume Control - Desktop/Tablet */}
      <div 
        className="absolute top-4 left-4 z-50 hidden sm:flex items-center gap-2"
        onMouseEnter={() => setShowVolumeSlider(true)}
        onMouseLeave={() => setShowVolumeSlider(false)}
      >
        <Button
          variant="ghost"
          size="sm"
          className="text-white bg-black/50 hover:bg-black/70 rounded-full"
          onClick={() => setVolume(volume > 0 ? 0 : 100)}
        >
          {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
        {showVolumeSlider && (
          <div className="bg-black/70 rounded-full px-3 py-2 flex items-center gap-2">
            <Slider
              value={[volume]}
              onValueChange={(val) => setVolume(val[0])}
              max={100}
              step={1}
              className="w-24"
            />
            <span className="text-white text-xs w-8">{volume}%</span>
          </div>
        )}
      </div>

      {/* Navigation Arrows - Desktop/Tablet */}
      <div className="absolute left-1/2 -translate-x-1/2 top-20 z-50 hidden sm:flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-white bg-black/50 hover:bg-black/70 rounded-full disabled:opacity-30"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-20 z-50 hidden sm:flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-white bg-black/50 hover:bg-black/70 rounded-full disabled:opacity-30"
          onClick={handleNext}
          disabled={currentIndex === reels.length - 1}
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      </div>

      {/* Reel Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 rounded-full px-3 py-1">
        <span className="text-white text-sm">{currentIndex + 1} / {reels.length}</span>
      </div>

      {/* Main Reel Content - Single reel view with button navigation */}
      <div className="w-full h-full relative">
        <ReelCard
          key={currentReel.id}
          reel={formattedReel}
          followingIds={followingIds}
          toggleFollow={toggleFollow}
          isActive={true}
          isOwner={isOwner}
          autoAdvance={false}
          variant="profile"
        />
      </div>

      {/* Mobile Navigation Arrows */}
      <div className="absolute left-1/2 -translate-x-1/2 top-20 z-50 sm:hidden flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-white bg-black/50 hover:bg-black/70 rounded-full disabled:opacity-30"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-20 z-50 sm:hidden flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-white bg-black/50 hover:bg-black/70 rounded-full disabled:opacity-30"
          onClick={handleNext}
          disabled={currentIndex === reels.length - 1}
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default ProfileReelViewer;