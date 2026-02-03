import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, Trash2, X, MessageCircle } from 'lucide-react';
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
    <>
      {/* Backdrop */}
      <div 
        className={`hidden lg:block fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Floating Comments Bubble */}
      <div 
        className={`hidden lg:flex flex-col fixed right-8 top-1/2 -translate-y-1/2 w-[380px] max-h-[70vh] bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl z-50 overflow-hidden transition-all duration-500 ease-out ${
          isOpen 
            ? 'translate-x-0 opacity-100 scale-100' 
            : 'translate-x-[120%] opacity-0 scale-95 pointer-events-none'
        }`}
        style={{
          boxShadow: isOpen ? '0 25px 80px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1) inset' : 'none',
        }}
      >
        {/* Header with gradient */}
        <div className="relative p-5 flex items-center justify-between bg-gradient-to-b from-background/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{comments.length} Comments</h2>
              <p className="text-xs text-muted-foreground">Join the conversation</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {comments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No comments yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment, index) => (
              <div 
                key={comment.id} 
                className="flex gap-3 p-3 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-all duration-200 group animate-comment-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <ProfileLink username={comment.profile?.username || 'user'}>
                  <Avatar className="w-9 h-9 flex-shrink-0 ring-2 ring-background">
                    <AvatarImage src={comment.profile?.avatar_url || ''} />
                    <AvatarFallback className="text-sm">{comment.profile?.display_name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                </ProfileLink>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <ProfileLink username={comment.profile?.username || 'user'}>
                      <span className="font-semibold text-sm hover:text-primary transition-colors">
                        @{comment.profile?.username || 'user'}
                      </span>
                    </ProfileLink>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm break-words leading-relaxed">{comment.content}</p>
                </div>
                {authUser?.id === comment.user_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20"
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

        {/* Comment Input with modern styling */}
        {authUser && (
          <form onSubmit={handleSubmit} className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-xl">
            <div className="flex gap-3 items-center">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="text-xs">You</AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="pr-12 rounded-full border-border/50 bg-secondary/50 focus:bg-background transition-colors"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newComment.trim() || loading}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      <style>{`
        @keyframes commentIn {
          from { 
            opacity: 0; 
            transform: translateX(20px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0) scale(1); 
          }
        }
        .animate-comment-in {
          animation: commentIn 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </>
  );
};

export default DesktopCommentsPanel;
