import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Heart, Send, Users, Radio, Power, Gift, Pin, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { useAudio } from '@/contexts/AudioContext';
import { supabase } from '@/integrations/supabase/client';
import { useWebRTCViewer } from '@/hooks/useWebRTCSignaling';
import FloatingHearts from '@/components/ui/FloatingHearts';
import ProfileLink from '@/components/ui/ProfileLink';
import GiftPanel, { GIFTS, type GiftDefinition } from '@/components/live/GiftPanel';
import GiftAnimation from '@/components/live/GiftAnimation';
import GiftLeaderboard from '@/components/live/GiftLeaderboard';
import PinnedMessage from '@/components/live/PinnedMessage';

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

interface AnimatedGiftEvent {
  id: number;
  emoji: string;
  name: string;
  senderName: string;
  animation: string;
}

interface LeaderboardEntry {
  username: string;
  avatarUrl?: string;
  totalCoins: number;
}

const QUICK_EMOJIS = ['❤️', '🔥', '😍', '👏', '😂', '🎉', '💯', '🙌'];

const LiveWatcherModal: React.FC<LiveWatcherModalProps> = ({ isOpen, onClose, liveStream }) => {
  const { toast } = useToast();
  const { currentUser, authUser } = useUser();
  const { forceCleanupAll } = useAudio();
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [likeTrigger, setLikeTrigger] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [hasLiked, setHasLiked] = useState(false);
  const [isEndingLive, setIsEndingLive] = useState(false);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [giftAnimation, setGiftAnimation] = useState<AnimatedGiftEvent | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<{ username: string; content: string } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const isOwner = !!authUser && authUser.id === liveStream.user_id;

  // WebRTC viewer - connect to broadcaster's video
  const { remoteStream, connectionState } = useWebRTCViewer(
    isOpen && !isOwner ? liveStream.session_id : null,
    authUser?.id ?? null
  );

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(console.log);
    }
  }, [remoteStream]);

  // Mute background audio
  useEffect(() => {
    if (isOpen) forceCleanupAll();
  }, [isOpen, forceCleanupAll]);

  // Load coin balance
  useEffect(() => {
    if (!isOpen || !authUser) return;
    const loadCoins = async () => {
      const { data } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', authUser.id)
        .maybeSingle();
      if (data) {
        setCoinBalance(data.balance);
      } else {
        // Create initial coin balance
        await supabase.from('user_coins').insert({ user_id: authUser.id, balance: 1000 });
        setCoinBalance(1000);
      }
    };
    loadCoins();
  }, [isOpen, authUser?.id]);

  // Realtime channel for presence, chat, gifts, pins
  useEffect(() => {
    if (!isOpen || !liveStream.session_id || !authUser) return;

    const channel = supabase.channel(`live:${liveStream.session_id}`, {
      config: { presence: { key: authUser.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const rawCount = Object.keys(state).length;
        setViewerCount(isOwner ? Math.max(0, rawCount - 1) : rawCount);
      })
      .on('broadcast', { event: 'like' }, () => {
        setLikeCount(prev => prev + 1);
        setLikeTrigger(prev => prev + 1);
      })
      .on('broadcast', { event: 'comment' }, ({ payload }) => {
        setComments(prev => [...prev.slice(-30), payload as Comment]);
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .on('broadcast', { event: 'gift' }, ({ payload }) => {
        const g = payload as { senderName: string; emoji: string; name: string; animation: string; cost: number };
        setGiftAnimation({ id: Date.now(), ...g });
        // Update leaderboard
        setLeaderboard(prev => {
          const existing = prev.find(e => e.username === g.senderName);
          if (existing) {
            return prev.map(e => e.username === g.senderName ? { ...e, totalCoins: e.totalCoins + g.cost } : e)
              .sort((a, b) => b.totalCoins - a.totalCoins);
          }
          return [...prev, { username: g.senderName, totalCoins: g.cost }].sort((a, b) => b.totalCoins - a.totalCoins);
        });
      })
      .on('broadcast', { event: 'pin' }, ({ payload }) => {
        setPinnedMessage(payload as { username: string; content: string });
      })
      .on('broadcast', { event: 'unpin' }, () => {
        setPinnedMessage(null);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
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
  }, [isOpen, liveStream.session_id, authUser?.id, isOwner]);

  const handleLike = useCallback(() => {
    if (!channelRef.current || hasLiked) return;
    channelRef.current.send({ type: 'broadcast', event: 'like', payload: { userId: authUser?.id } });
    setHasLiked(true);
    setLikeCount(prev => prev + 1);
    setLikeTrigger(prev => prev + 1);
    setTimeout(() => setHasLiked(false), 2000);
  }, [hasLiked, authUser?.id]);

  const handleEmojiClick = useCallback((emoji: string) => {
    if (!currentUser || !channelRef.current) return;
    const comment: Comment = {
      id: Date.now().toString(),
      username: currentUser.username,
      text: emoji,
      timestamp: new Date(),
      avatarUrl: currentUser.avatarUrl,
    };
    channelRef.current.send({ type: 'broadcast', event: 'comment', payload: comment });
    setComments(prev => [...prev.slice(-30), comment]);
    if (emoji === '❤️') handleLike();
  }, [currentUser, handleLike]);

  const sendComment = useCallback(() => {
    if (!newComment.trim() || !currentUser || !channelRef.current) return;
    const comment: Comment = {
      id: Date.now().toString(),
      username: currentUser.username,
      text: newComment.trim(),
      timestamp: new Date(),
      avatarUrl: currentUser.avatarUrl,
    };
    channelRef.current.send({ type: 'broadcast', event: 'comment', payload: comment });
    setComments(prev => [...prev.slice(-30), comment]);
    setNewComment('');
  }, [newComment, currentUser]);

  const handleSendGift = useCallback(async (gift: GiftDefinition) => {
    if (!authUser || !currentUser || !channelRef.current) return;
    if (coinBalance < gift.cost) {
      toast({ title: 'Not enough coins', variant: 'destructive' });
      return;
    }

    // Deduct coins
    const newBalance = coinBalance - gift.cost;
    setCoinBalance(newBalance);
    await supabase.from('user_coins').update({
      balance: newBalance,
      total_spent: coinBalance - newBalance,
    }).eq('user_id', authUser.id);

    // Record gift
    await supabase.from('live_gifts').insert({
      session_id: liveStream.session_id,
      sender_id: authUser.id,
      receiver_id: liveStream.user_id,
      gift_type: gift.id,
      gift_name: gift.name,
      coin_cost: gift.cost,
    });

    // Broadcast gift
    channelRef.current.send({
      type: 'broadcast',
      event: 'gift',
      payload: {
        senderName: currentUser.username,
        emoji: gift.emoji,
        name: gift.name,
        animation: gift.animation,
        cost: gift.cost,
      },
    });

    // Local animation
    setGiftAnimation({
      id: Date.now(),
      emoji: gift.emoji,
      name: gift.name,
      senderName: currentUser.username,
      animation: gift.animation,
    });

    setShowGiftPanel(false);
    toast({ title: `${gift.emoji} ${gift.name} sent!` });
  }, [authUser, currentUser, coinBalance, liveStream]);

  const handlePinMessage = useCallback((comment: Comment) => {
    if (!isOwner || !channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'pin',
      payload: { username: comment.username, content: comment.text },
    });
    setPinnedMessage({ username: comment.username, content: comment.text });
  }, [isOwner]);

  const handleUnpin = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.send({ type: 'broadcast', event: 'unpin', payload: {} });
    setPinnedMessage(null);
  }, []);

  const handleClose = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    onClose();
  }, [onClose]);

  const handleEndLive = useCallback(async () => {
    if (!isOwner || !liveStream.session_id || isEndingLive) return;
    setIsEndingLive(true);
    try {
      await supabase.from('live_streams').update({
        is_active: false,
        ended_at: new Date().toISOString(),
        viewer_count: viewerCount,
        likes_count: likeCount,
      }).eq('session_id', liveStream.session_id);
      toast({ title: 'Live ended' });
      handleClose();
    } catch {
      toast({ title: 'Failed to end live', variant: 'destructive' });
    } finally {
      setIsEndingLive(false);
    }
  }, [isOwner, liveStream.session_id, isEndingLive, viewerCount, likeCount, handleClose]);

  const hasVideo = remoteStream && connectionState === 'connected';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-full h-screen p-0 border-0 rounded-none lg:max-w-[400px] lg:h-[90vh] lg:rounded-[2rem]">
        <div className="relative h-full bg-black flex flex-col">
          {/* Video Area */}
          <div className="flex-1 relative bg-gradient-to-br from-gray-900 to-black flex items-center justify-center overflow-hidden">
            {/* Remote WebRTC video */}
            {!isOwner && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full object-cover ${hasVideo ? 'opacity-100' : 'opacity-0'}`}
                style={{ transform: 'scaleX(-1)' }}
              />
            )}

            {/* Fallback avatar when no video */}
            {(!hasVideo || isOwner) && (
              <div className="text-center z-10">
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
                {!isOwner && connectionState !== 'connected' && (
                  <p className="text-white/40 text-xs mt-2">
                    {connectionState === 'connecting' ? 'Connecting to video...' : 'Waiting for video...'}
                  </p>
                )}
              </div>
            )}

            {/* Top stats bar */}
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
                <div className="bg-black/50 px-3 py-1 rounded-full flex items-center gap-1">
                  <Heart className="w-3 h-3 text-white" />
                  <span className="text-white text-sm">{likeCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-red-500/80 text-white hover:bg-red-600 rounded-full"
                    onClick={handleEndLive}
                    disabled={isEndingLive}
                  >
                    <Power className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-black/50 text-white hover:bg-black/70 rounded-full"
                  onClick={handleClose}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Stream Title + Leaderboard */}
            <div className="absolute top-16 left-4 right-4 z-10 space-y-2">
              <p className="text-white font-semibold text-center">{liveStream.title}</p>
              {leaderboard.length > 0 && (
                <div className="flex justify-center">
                  <GiftLeaderboard entries={leaderboard} />
                </div>
              )}
            </div>

            {/* Pinned Message */}
            {pinnedMessage && (
              <div className="absolute top-28 left-0 right-0 z-10">
                <PinnedMessage
                  username={pinnedMessage.username}
                  content={pinnedMessage.content}
                  canUnpin={isOwner}
                  onUnpin={handleUnpin}
                />
              </div>
            )}

            {/* Gift Animation */}
            <GiftAnimation trigger={giftAnimation} />

            {/* Floating Hearts */}
            <FloatingHearts trigger={likeTrigger} />
          </div>

          {/* Comments Section */}
          <div className="h-52 bg-gradient-to-t from-black via-black/90 to-transparent absolute bottom-36 left-0 right-0 px-4 py-2 overflow-hidden">
            <div className="space-y-1.5 max-h-full overflow-y-auto scrollbar-hide">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start gap-2 animate-fade-in group"
                  onDoubleClick={() => handlePinMessage(comment)}
                >
                  <ProfileLink username={comment.username}>
                    <img
                      src={comment.avatarUrl || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face'}
                      alt={comment.username}
                      className="w-6 h-6 rounded-full flex-shrink-0"
                    />
                  </ProfileLink>
                  <div className="flex-1 min-w-0">
                    <ProfileLink username={comment.username}>
                      <span className="text-pink-400 text-xs font-semibold">@{comment.username}</span>
                    </ProfileLink>
                    <p className="text-white text-sm">{comment.text}</p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handlePinMessage(comment)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white"
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          </div>

          {/* Gift Panel */}
          <GiftPanel
            isOpen={showGiftPanel}
            onClose={() => setShowGiftPanel(false)}
            coinBalance={coinBalance}
            onSendGift={handleSendGift}
          />

          {/* Interaction Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-sm">
            {/* Quick emoji reactions */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95"
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
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-full h-9 text-sm"
              />
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 h-9 w-9" onClick={sendComment}>
                <Send className="w-4 h-4" />
              </Button>
              {!isOwner && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-yellow-400 hover:bg-white/10 h-9 w-9 relative"
                  onClick={() => setShowGiftPanel(!showGiftPanel)}
                >
                  <Gift className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {coinBalance > 999 ? '1k' : coinBalance}
                  </span>
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className={`${hasLiked ? 'text-pink-500' : 'text-white'} hover:bg-white/10 h-9 w-9 relative`}
                onClick={handleLike}
              >
                <Heart className="w-5 h-5" fill={hasLiked ? 'currentColor' : 'none'} />
                {likeCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
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
