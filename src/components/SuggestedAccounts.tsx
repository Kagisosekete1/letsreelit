import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, UserCheck, ChevronRight, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { sendFollowNotification } from '@/services/notificationService';

interface SuggestedProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  verified: boolean;
  followers_count: number;
  bio: string | null;
}

interface SuggestedAccountsProps {
  limit?: number;
  showTitle?: boolean;
  compact?: boolean;
}

const SuggestedAccounts: React.FC<SuggestedAccountsProps> = ({ 
  limit = 5, 
  showTitle = true,
  compact = false 
}) => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<SuggestedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pendingFollow, setPendingFollow] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestedAccounts();
    if (authUser) fetchFollowing();
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

  const fetchSuggestedAccounts = async () => {
    setLoading(true);

    try {
      // Get accounts the user is NOT following, ordered by followers count
      let query = supabase
        .from('profiles')
        .select('*')
        .order('followers_count', { ascending: false })
        .limit(limit + 10); // Fetch extra to filter

      if (authUser) {
        // Exclude self
        query = query.neq('user_id', authUser.id);
      }

      const { data } = await query;

      if (data) {
        // Filter out accounts the user is already following
        const filtered = data.filter(p => !followingIds.has(p.user_id)).slice(0, limit);
        setAccounts(filtered);
      }
    } catch (error) {
      console.error('Error fetching suggested accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!authUser) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to follow accounts',
      });
      return;
    }

    setPendingFollow(userId);
    const isFollowing = followingIds.has(userId);

    // Optimistic update
    setFollowingIds(prev => {
      const next = new Set(prev);
      if (isFollowing) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', authUser.id)
          .eq('following_id', userId);
      } else {
        await supabase.from('follows').insert({
          follower_id: authUser.id,
          following_id: userId,
        });

        // Create notification and send push
        await supabase.from('notifications').insert({
          user_id: userId,
          from_user_id: authUser.id,
          type: 'follow',
        });
        sendFollowNotification(userId, authUser.id);
      }
    } catch (error) {
      // Revert on error
      setFollowingIds(prev => {
        const next = new Set(prev);
        if (isFollowing) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    } finally {
      setPendingFollow(null);
    }
  };

  const handleProfileClick = (username: string) => {
    navigate(`/user/${username}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className={compact ? '' : 'space-y-3'}>
      {showTitle && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Suggested Muva'z</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary text-sm"
            onClick={() => navigate('/suggested-muvaz')}
          >
            See All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      <div className={compact ? 'flex gap-3 overflow-x-auto pb-2 scrollbar-hide' : 'space-y-2'}>
        {accounts.map((account) => {
          const isFollowing = followingIds.has(account.user_id);
          const isPending = pendingFollow === account.user_id;

          if (compact) {
            // Compact horizontal layout
            return (
              <div
                key={account.id}
                className="flex-shrink-0 w-28 bg-secondary/50 rounded-2xl p-3 flex flex-col items-center gap-2"
              >
                <Avatar 
                  className="w-14 h-14 cursor-pointer"
                  onClick={() => handleProfileClick(account.username)}
                >
                  <AvatarImage src={account.avatar_url || ''} />
                  <AvatarFallback>{account.display_name[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center w-full">
                  <p 
                    className="text-sm font-medium truncate cursor-pointer hover:text-primary"
                    onClick={() => handleProfileClick(account.username)}
                  >
                    {account.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">@{account.username}</p>
                </div>
                <Button
                  size="sm"
                  variant={isFollowing ? 'outline' : 'default'}
                  className="w-full h-7 text-xs rounded-full"
                  onClick={() => handleFollow(account.user_id)}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isFollowing ? (
                    'Following'
                  ) : (
                    'Follow'
                  )}
                </Button>
              </div>
            );
          }

          // Full layout
          return (
            <div
              key={account.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <Avatar 
                className="w-12 h-12 cursor-pointer"
                onClick={() => handleProfileClick(account.username)}
              >
                <AvatarImage src={account.avatar_url || ''} />
                <AvatarFallback>{account.display_name[0]}</AvatarFallback>
              </Avatar>
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => handleProfileClick(account.username)}
              >
                <div className="flex items-center gap-1">
                  <p className="font-medium truncate">{account.display_name}</p>
                  {account.verified && (
                    <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] text-white font-bold">✓</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">@{account.username}</p>
                {account.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{account.bio}</p>
                )}
              </div>
              <Button
                size="sm"
                variant={isFollowing ? 'outline' : 'default'}
                className="rounded-full h-8 px-4"
                onClick={() => handleFollow(account.user_id)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestedAccounts;
