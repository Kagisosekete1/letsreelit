import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import ProfileLink from '@/components/ui/ProfileLink';
import { sendCommentNotification } from '@/services/notificationService';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface DesktopCommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  reelId: string;
  reelOwnerId?: string;
  onCommentCountChange?: (count: number) => void;
}

const DesktopCommentsPanel: React.FC<DesktopCommentsPanelProps> = ({
  isOpen,
  onClose,
  reelId,
  reelOwnerId,
  onCommentCountChange,
}) => {
  const { authUser } = useUser();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && reelId) {
      fetchComments();
      
      // Subscribe to real-time comments
      const channel = supabase
        .channel(`desktop-comments-${reelId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: `reel_id=eq.${reelId}`,
          },
          () => {
            fetchComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, reelId]);

  const fetchComments = async () => {
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('reel_id', reelId)
      .order('created_at', { ascending: true });

    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const commentsWithProfiles = commentsData.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id),
      }));

      setComments(commentsWithProfiles);
      onCommentCountChange?.(commentsWithProfiles.length);
    } else {
      setComments([]);
      onCommentCountChange?.(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !authUser) return;

    setLoading(true);
    const commentText = newComment.trim();
    const { error } = await supabase
      .from('comments')
      .insert({
        reel_id: reelId,
        user_id: authUser.id,
        content: commentText,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    } else {
      setNewComment('');
      await fetchComments();
      
      // Update reel comments_count and get owner id
      const { data: reel } = await supabase
        .from('reels')
        .select('comments_count, user_id')
        .eq('id', reelId)
        .single();
      
      await supabase
        .from('reels')
        .update({ comments_count: (reel?.comments_count || 0) + 1 })
        .eq('id', reelId);

      // Send notification
      const ownerId = reelOwnerId || reel?.user_id;
      if (ownerId && ownerId !== authUser.id) {
        void sendCommentNotification(ownerId, authUser.id, reelId, commentText);
      }
      
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    setLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    // Optimistic UI
    const previous = comments;
    const next = comments.filter(c => c.id !== commentId);
    setComments(next);
    onCommentCountChange?.(next.length);

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      setComments(previous);
      onCommentCountChange?.(previous.length);
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
      return;
    }

    // Update reel comments_count
    const { data: reel } = await supabase
      .from('reels')
      .select('comments_count')
      .eq('id', reelId)
      .single();

    await supabase
      .from('reels')
      .update({ comments_count: Math.max(0, (reel?.comments_count || 1) - 1) })
      .eq('id', reelId);

    toast({ title: 'Deleted', description: 'Comment removed.' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <div 
      className={`hidden lg:flex flex-col w-[350px] h-full border-l border-border bg-background transition-all duration-300 ease-out ${
        isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
      }`}
      style={{
        position: isOpen ? 'relative' : 'absolute',
        right: 0,
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-lg">{comments.length} Comments</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No comments yet</p>
            <p className="text-sm">Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment, index) => (
            <div 
              key={comment.id} 
              className="flex gap-3 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ProfileLink username={comment.profile?.username || 'user'}>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={comment.profile?.avatar_url || ''} />
                  <AvatarFallback>{comment.profile?.display_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
              </ProfileLink>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <ProfileLink username={comment.profile?.username || 'user'}>
                    <span className="font-semibold text-sm">
                      @{comment.profile?.username || 'user'}
                    </span>
                  </ProfileLink>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm break-words">{comment.content}</p>
              </div>
              {authUser?.id === comment.user_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-destructive/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(comment.id);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Comment Input */}
      {authUser && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-border flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 rounded-full"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || loading}
            className="rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default DesktopCommentsPanel;
