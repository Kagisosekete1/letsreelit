import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Eye, 
  Users, 
  Video, 
  Trophy, 
  Lock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

interface Badge {
  type: 'likes' | 'views' | 'followers' | 'uploads';
  milestone: number;
  achieved: boolean;
  achievedAt?: string;
}

interface MilestoneBadgesProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

const MILESTONES = {
  likes: [1000, 10000, 50000, 100000, 200000, 500000, 1000000, 5000000, 10000000, 20000000],
  views: [1000, 10000, 50000, 100000, 200000, 500000, 1000000, 5000000, 10000000, 20000000],
  followers: [1000, 10000, 50000, 100000, 200000, 500000, 1000000, 5000000, 10000000, 20000000],
  uploads: [500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
};

const BADGE_CONFIG = {
  likes: {
    icon: Heart,
    label: 'Likes',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  views: {
    icon: Eye,
    label: 'Views',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  followers: {
    icon: Users,
    label: 'Followers',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  uploads: {
    icon: Video,
    label: 'Uploads',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
};

const formatMilestone = (num: number): string => {
  if (num >= 1000000) return `${num / 1000000}M`;
  if (num >= 1000) return `${num / 1000}K`;
  return num.toString();
};

const MilestoneBadges: React.FC<MilestoneBadgesProps> = ({ isOpen, onClose, userId }) => {
  const { authUser, currentUser } = useUser();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [achievedCount, setAchievedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'likes' | 'views' | 'followers' | 'uploads'>('likes');
  const [userStats, setUserStats] = useState({ totalLikes: 0, totalViews: 0, followers: 0, uploads: 0 });

  const targetUserId = userId || authUser?.id;

  useEffect(() => {
    if (isOpen && targetUserId) {
      fetchBadges();
      fetchUserStats();
    }
  }, [isOpen, targetUserId]);

  const fetchUserStats = async () => {
    if (!targetUserId) return;

    // Get user's profile for followers count
    const { data: profile } = await supabase
      .from('profiles')
      .select('followers_count, reels_count')
      .eq('user_id', targetUserId)
      .single();

    // Get total likes across all reels
    const { data: reels } = await supabase
      .from('reels')
      .select('likes_count, views_count')
      .eq('user_id', targetUserId);

    const totalLikes = reels?.reduce((sum, r) => sum + (r.likes_count || 0), 0) || 0;
    const totalViews = reels?.reduce((sum, r) => sum + (r.views_count || 0), 0) || 0;

    setUserStats({
      totalLikes,
      totalViews,
      followers: profile?.followers_count || 0,
      uploads: profile?.reels_count || 0,
    });
  };

  const fetchBadges = async () => {
    if (!targetUserId) return;

    const { data: achievedBadges } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', targetUserId);

    const achievedSet = new Set(
      achievedBadges?.map(b => `${b.badge_type}-${b.milestone}`) || []
    );

    const allBadges: Badge[] = [];
    
    Object.entries(MILESTONES).forEach(([type, milestones]) => {
      milestones.forEach(milestone => {
        const key = `${type}-${milestone}`;
        const achieved = achievedSet.has(key);
        const achievedBadge = achievedBadges?.find(
          b => b.badge_type === type && b.milestone === milestone
        );
        
        allBadges.push({
          type: type as Badge['type'],
          milestone,
          achieved,
          achievedAt: achievedBadge?.achieved_at,
        });
      });
    });

    setBadges(allBadges);
    setAchievedCount(allBadges.filter(b => b.achieved).length);
    setTotalCount(allBadges.length);
  };

  const checkAndAwardBadges = async () => {
    if (!authUser) return;

    const badgesToAward: { badge_type: string; milestone: number }[] = [];

    // Check likes milestones
    MILESTONES.likes.forEach(milestone => {
      if (userStats.totalLikes >= milestone && 
          !badges.find(b => b.type === 'likes' && b.milestone === milestone && b.achieved)) {
        badgesToAward.push({ badge_type: 'likes', milestone });
      }
    });

    // Check views milestones
    MILESTONES.views.forEach(milestone => {
      if (userStats.totalViews >= milestone && 
          !badges.find(b => b.type === 'views' && b.milestone === milestone && b.achieved)) {
        badgesToAward.push({ badge_type: 'views', milestone });
      }
    });

    // Check followers milestones
    MILESTONES.followers.forEach(milestone => {
      if (userStats.followers >= milestone && 
          !badges.find(b => b.type === 'followers' && b.milestone === milestone && b.achieved)) {
        badgesToAward.push({ badge_type: 'followers', milestone });
      }
    });

    // Check uploads milestones
    MILESTONES.uploads.forEach(milestone => {
      if (userStats.uploads >= milestone && 
          !badges.find(b => b.type === 'uploads' && b.milestone === milestone && b.achieved)) {
        badgesToAward.push({ badge_type: 'uploads', milestone });
      }
    });

    // Award new badges
    for (const badge of badgesToAward) {
      await supabase.from('user_badges').insert({
        user_id: authUser.id,
        badge_type: badge.badge_type,
        milestone: badge.milestone,
      });
    }

    if (badgesToAward.length > 0) {
      fetchBadges();
    }
  };

  useEffect(() => {
    if (badges.length > 0 && authUser?.id === targetUserId) {
      checkAndAwardBadges();
    }
  }, [userStats, badges.length]);

  const categoryBadges = badges.filter(b => b.type === activeCategory);
  const config = BADGE_CONFIG[activeCategory];
  const CategoryIcon = config.icon;

  const getCurrentProgress = () => {
    switch (activeCategory) {
      case 'likes': return userStats.totalLikes;
      case 'views': return userStats.totalViews;
      case 'followers': return userStats.followers;
      case 'uploads': return userStats.uploads;
    }
  };

  const getNextMilestone = () => {
    const current = getCurrentProgress();
    return MILESTONES[activeCategory].find(m => m > current) || null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto bg-card border-border rounded-3xl">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Milestone Badges
          </DialogTitle>
        </DialogHeader>

        {/* Progress Summary */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Badges Achieved</p>
              <p className="text-2xl font-bold text-foreground">{achievedCount} of {totalCount}</p>
            </div>
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div 
                className="absolute inset-0 rounded-full border-4 border-primary"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((achievedCount / totalCount) * 2 * Math.PI)}% ${50 - 50 * Math.cos((achievedCount / totalCount) * 2 * Math.PI)}%, 50% 50%)`
                }}
              />
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
          {(Object.keys(BADGE_CONFIG) as Array<keyof typeof BADGE_CONFIG>).map((cat) => {
            const catConfig = BADGE_CONFIG[cat];
            const CatIcon = catConfig.icon;
            const catAchieved = badges.filter(b => b.type === cat && b.achieved).length;
            const catTotal = badges.filter(b => b.type === cat).length;
            
            return (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 rounded-full gap-1 ${
                  activeCategory === cat ? '' : catConfig.bgColor
                }`}
              >
                <CatIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{catConfig.label}</span>
                <span className="text-xs opacity-70">({catAchieved}/{catTotal})</span>
              </Button>
            );
          })}
        </div>

        {/* Current Progress */}
        <div className={`${config.bgColor} rounded-xl p-3 mb-4 border ${config.borderColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CategoryIcon className={`w-5 h-5 ${config.color}`} />
              <span className="font-medium">Current {config.label}</span>
            </div>
            <span className="font-bold">{formatMilestone(getCurrentProgress())}</span>
          </div>
          {getNextMilestone() && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress to {formatMilestone(getNextMilestone()!)}</span>
                <span>{Math.round((getCurrentProgress() / getNextMilestone()!) * 100)}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full ${config.color.replace('text-', 'bg-')} transition-all duration-300`}
                  style={{ width: `${Math.min((getCurrentProgress() / getNextMilestone()!) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-4 gap-3">
          {categoryBadges.map((badge) => (
            <div
              key={`${badge.type}-${badge.milestone}`}
              className={`relative flex flex-col items-center p-3 rounded-xl transition-all ${
                badge.achieved 
                  ? `${config.bgColor} border-2 ${config.borderColor}` 
                  : 'bg-secondary/30 opacity-50'
              }`}
            >
              {badge.achieved ? (
                <CategoryIcon className={`w-8 h-8 ${config.color} mb-1`} />
              ) : (
                <Lock className="w-8 h-8 text-muted-foreground mb-1" />
              )}
              <span className={`text-sm font-bold ${badge.achieved ? 'text-foreground' : 'text-muted-foreground'}`}>
                {formatMilestone(badge.milestone)}
              </span>
              {badge.achieved && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-primary-foreground">✓</span>
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Earn badges by reaching milestones. Keep creating to unlock more!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MilestoneBadges;
