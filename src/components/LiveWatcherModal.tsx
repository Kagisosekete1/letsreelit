import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Heart, Send, Users, Radio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import FloatingHearts from '@/components/ui/FloatingHearts';
import ProfileLink from '@/components/ui/ProfileLink';

interface LiveWatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveStream: {
    id: string;
    session_id: string;
    title: string;
    user_id: string;
    broadcaster?: {
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
}

interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: Date;
  avatarUrl?: string;
}

// Quick emoji reactions for viewers
const QUICK_EMOJIS = ['❤️', '🔥', '😍', '👏', '😂', '🎉', '💯', '🙌'];

const LiveWatcherModal: React.FC<LiveWatcherModalProps> = ({ isOpen, onClose, liveStream }) => {
  const { toast } = useToast();
  const { currentUser, authUser } = useUser();
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [likeTrigger, setLikeTrigger] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [hasLiked, setHasLiked] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isOpen || !liveStream.session_id || !authUser) return;

    const channel = supabase.channel(`live:${liveStream.session_id}`, {
      config: {
        presence: {
          key: authUser.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Count all users in the channel
        const count = Object.keys(state).length;
        setViewerCount(count);
      })
      .on('broadcast', { event: 'like' }, () => {
        setLikeCount(prev => prev + 1);
        setLikeTrigger(prev => prev + 1);
      })
      .on('broadcast', { event: 'comment' }, ({ payload }) => {
        const comment = payload as Comment;
        setComments(prev => [...prev.slice(-20), comment]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track viewer presence
          await channel.track({
            username: currentUser?.username || 'Anonymous',
            avatarUrl: currentUser?.avatarUrl,
            online_at: new Date().toISOString(),
          });

          toast({
            title: 'Joined live',
            description: `You're watching ${liveStream.broadcaster?.display_name || 'this live'}`,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isOpen, liveStream.session_id, authUser?.id]);

  const handleLike = () => {
    if (!channelRef.current || hasLiked) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'like',
      payload: { userId: authUser?.id },
    });

    setHasLiked(true);
    setLikeCount(prev => prev + 1);
    setLikeTrigger(prev => prev + 1);

    // Allow liking again after 2 seconds
    setTimeout(() => setHasLiked(false), 2000);
  };

  const handleEmojiClick = (emoji: string) => {
    // Send emoji as a comment
    if (!currentUser || !channelRef.current) return;

    const comment: Comment = {
      id: Date.now().toString(),
      username: currentUser.username,
      text: emoji,
      timestamp: new Date(),
      avatarUrl: currentUser.avatarUrl,
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'comment',
      payload: comment,
    });

    setComments(prev => [...prev.slice(-20), comment]);

    // Also send a like for heart emoji
    if (emoji === '❤️') {
      handleLike();
    }
  };

  const sendComment = () => {
    if (!newComment.trim() || !currentUser || !channelRef.current) return;

    const comment: Comment = {
      id: Date.now().toString(),
      username: currentUser.username,
      text: newComment.trim(),
      timestamp: new Date(),
      avatarUrl: currentUser.avatarUrl,
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'comment',
      payload: comment,
    });

    setComments(prev => [...prev.slice(-20), comment]);
    setNewComment('');
  };

  const handleClose = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-full h-screen p-0 border-0 rounded-none">
        <div className="relative h-full bg-black flex flex-col">
          {/* Video Area - placeholder for actual stream */}
          <div className="flex-1 relative bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
            {/* Broadcaster Avatar as placeholder */}
            <div className="text-center">
              <ProfileLink username={liveStream.broadcaster?.username || ''}>
                <img
                  src={liveStream.broadcaster?.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face'}
                  alt={liveStream.broadcaster?.username}
                  className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-pink-500"
                />
              </ProfileLink>
              <ProfileLink username={liveStream.broadcaster?.username || ''}>
                <p className="text-white text-lg font-semibold">
                  {liveStream.broadcaster?.display_name || 'Live Stream'}
                </p>
                <p className="text-white/60 text-sm">@{liveStream.broadcaster?.username}</p>
              </ProfileLink>
            </div>

            {/* Live Badge & Stats */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="bg-pink-500 px-3 py-1 rounded-full flex items-center gap-1">
                  <Radio className="w-3 h-3 text-white animate-pulse" />
                  <span className="text-white text-sm font-semibold">LIVE</span>
                </div>
                <div className="bg-black/50 px-3 py-1 rounded-full flex items-center gap-1">
                  <Users className="w-3 h-3 text-white" />
                  <span className="text-white text-sm">{viewerCount}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="bg-black/50 text-white hover:bg-black/70 rounded-full"
                onClick={handleClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Stream Title */}
            <div className="absolute top-16 left-4 right-4">
              <p className="text-white font-semibold text-center">{liveStream.title}</p>
            </div>

            {/* Floating Hearts */}
            <FloatingHearts trigger={likeTrigger} />
          </div>

          {/* Comments Section */}
          <div className="h-64 bg-gradient-to-t from-black via-black/90 to-transparent absolute bottom-32 left-0 right-0 px-4 py-2 overflow-hidden">
            <div className="space-y-2 max-h-full overflow-y-auto scrollbar-hide">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2 animate-fade-in">
                  <ProfileLink username={comment.username}>
                    <img
                      src={comment.avatarUrl || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face'}
                      alt={comment.username}
                      className="w-6 h-6 rounded-full"
                    />
                  </ProfileLink>
                  <div>
                    <ProfileLink username={comment.username}>
                      <span className="text-pink-400 text-xs font-semibold">@{comment.username}</span>
                    </ProfileLink>
                    <p className="text-white text-sm">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interaction Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-sm">
            {/* Quick emoji reactions - clickable */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Say something..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-full"
              />
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={sendComment}
              >
                <Send className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={`${hasLiked ? 'text-pink-500' : 'text-white'} hover:bg-white/10 relative`}
                onClick={handleLike}
              >
                <Heart className="w-6 h-6" fill={hasLiked ? 'currentColor' : 'none'} />
                {likeCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {likeCount > 99 ? '99+' : likeCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveWatcherModal;
