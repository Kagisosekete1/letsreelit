import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

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

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reelId: string;
  onCommentCountChange?: (count: number) => void;
}

const CommentsModal: React.FC<CommentsModalProps> = ({
  isOpen,
  onClose,
  reelId,
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
        .channel(`comments-${reelId}`)
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
    const { error } = await supabase
      .from('comments')
      .insert({
        reel_id: reelId,
        user_id: authUser.id,
        content: newComment.trim(),
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    } else {
      setNewComment('');
      // Refetch comments to show the new one immediately
      await fetchComments();
      
      // Update reel comments_count
      const { data: reel } = await supabase
        .from('reels')
        .select('comments_count')
        .eq('id', reelId)
        .single();
      
      await supabase
        .from('reels')
        .update({ comments_count: (reel?.comments_count || 0) + 1 })
        .eq('id', reelId);
      
      // Scroll to bottom after adding comment
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

    // Update reel comments_count (best effort)
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[70vh] flex flex-col p-0 rounded-t-3xl">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="text-center">{comments.length} Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No comments yet</p>
              <p className="text-sm">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <img
                  src={comment.profile?.avatar_url || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face'}
                  alt={comment.profile?.username || 'User'}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      @{comment.profile?.username || 'user'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm break-words">{comment.content}</p>
                </div>
                {authUser?.id === comment.user_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto hover:bg-destructive/20 cursor-pointer"
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
              size="sm"
              disabled={!newComment.trim() || loading}
              className="rounded-full px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CommentsModal;
