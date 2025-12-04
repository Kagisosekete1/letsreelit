import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  count: number;
}

interface FollowUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

const FollowersModal: React.FC<FollowersModalProps> = ({ isOpen, onClose, userId, type, count }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && count > 0) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isOpen, userId, type]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get user's profile id first
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      if (type === 'followers') {
        const { data: follows } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', profile.id);

        if (follows && follows.length > 0) {
          const followerIds = follows.map(f => f.follower_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', followerIds);
          
          setUsers(profiles || []);
        }
      } else {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', profile.id);

        if (follows && follows.length > 0) {
          const followingIds = follows.map(f => f.following_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', followingIds);
          
          setUsers(profiles || []);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (username: string) => {
    onClose();
    navigate(`/user/${username}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] max-h-[80vh] rounded-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{type === 'followers' ? 'Followers' : 'Following'}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="py-4 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : count === 0 || users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {type === 'followers' ? 'No followers yet' : 'Not following anyone'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <Button
                  key={user.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 px-2"
                  onClick={() => handleUserClick(user.username)}
                >
                  <img
                    src={user.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face'}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover mr-3"
                  />
                  <div className="text-left">
                    <p className="font-semibold">{user.display_name}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersModal;
