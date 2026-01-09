import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Heart, Send, Users, Radio, Mic, MicOff, Camera, CameraOff, RotateCcw, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import FloatingHearts from '@/components/ui/FloatingHearts';

interface GoLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: Date;
  avatarUrl?: string;
}

interface Viewer {
  oderId: string;
  username: string;
  avatarUrl?: string;
}

const GoLiveModal: React.FC<GoLiveModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const { currentUser, authUser, refreshProfile } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [viewers, setViewers] = useState<Map<string, Viewer>>(new Map());
  const [likeCount, setLikeCount] = useState(0);
  const [likeTrigger, setLikeTrigger] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [liveTitle, setLiveTitle] = useState('');
  const [step, setStep] = useState<'setup' | 'live' | 'ended'>('setup');
  const [liveStartTime, setLiveStartTime] = useState<Date | null>(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const viewerCount = viewers.size;

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      // Clean up realtime channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [stream]);

  // Update live duration
  useEffect(() => {
    if (isLive && liveStartTime) {
      const interval = setInterval(() => {
        setLiveDuration(Math.floor((Date.now() - liveStartTime.getTime()) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLive, liveStartTime]);

  // Setup Supabase Realtime for viewer presence when live
  useEffect(() => {
    if (!isLive || !liveSessionId || !authUser) return;

    const channel = supabase.channel(`live:${liveSessionId}`, {
      config: {
        presence: {
          key: authUser.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const newViewers = new Map<string, Viewer>();
        
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== authUser.id && Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as any;
            newViewers.set(key, {
              oderId: key,
              username: presence.username || 'Anonymous',
              avatarUrl: presence.avatarUrl,
            });
          }
        });
        
        setViewers(newViewers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== authUser.id && newPresences.length > 0) {
          const presence = newPresences[0] as any;
          setViewers(prev => {
            const next = new Map(prev);
            next.set(key, {
              oderId: key,
              username: presence.username || 'Anonymous',
              avatarUrl: presence.avatarUrl,
            });
            return next;
          });
          
          // Show join notification
          toast({
            title: `${presence.username || 'Someone'} joined`,
            description: 'A new viewer is watching your live!',
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== authUser.id) {
          setViewers(prev => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        }
      })
      .on('broadcast', { event: 'like' }, () => {
        setLikeCount(prev => prev + 1);
        setLikeTrigger(prev => prev + 1); // Trigger floating hearts
      })
      .on('broadcast', { event: 'comment' }, ({ payload }) => {
        const comment = payload as Comment;
        setComments(prev => [...prev.slice(-20), comment]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track the broadcaster's presence
          await channel.track({
            username: currentUser?.username || 'Broadcaster',
            avatarUrl: currentUser?.avatarUrl,
            isBroadcaster: true,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isLive, liveSessionId, authUser?.id, currentUser?.username]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

const startCamera = async () => {
    try {
      // Use front-facing camera (selfie) for mobile devices
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'user' }, // Front camera for selfie
          width: { ideal: 1080 }, 
          height: { ideal: 1920 } 
        },
        audio: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Start recording
      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
    } catch (error) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera and microphone access to go live.",
        variant: "destructive",
      });
    }
  };

  const handleGoLive = async () => {
    if (!liveTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please add a title for your live stream.",
        variant: "destructive",
      });
      return;
    }

    if (!authUser) {
      toast({
        title: "Sign in required",
        description: "Please sign in to go live.",
        variant: "destructive",
      });
      return;
    }

    // Generate unique session ID for this live stream
    const sessionId = `live_${authUser.id}_${Date.now()}`;
    setLiveSessionId(sessionId);

    // Create live stream record in database
    const { error } = await supabase
      .from('live_streams')
      .insert({
        user_id: authUser.id,
        title: liveTitle.trim(),
        session_id: sessionId,
        is_active: true,
      });

    if (error) {
      console.error('Error creating live stream:', error);
      toast({
        title: "Failed to start live",
        description: "Please try again.",
        variant: "destructive",
      });
      return;
    }

    await startCamera();
    setStep('live');
    setIsLive(true);
    setLiveStartTime(new Date());
    
    toast({
      title: "You're live!",
      description: "Real viewers will appear when they join your stream.",
    });
  };

  const handleEndLive = async () => {
    // Stop recording
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    // Clean up realtime channel
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Mark live stream as ended in database
    if (liveSessionId) {
      await supabase
        .from('live_streams')
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString(),
          viewer_count: viewerCount,
          likes_count: likeCount,
        })
        .eq('session_id', liveSessionId);
    }
    
    setStream(null);
    setIsLive(false);
    setStep('ended');
  };

  // No longer save lives - just close when ending
  const handleClose = () => {
    recordedChunksRef.current = [];
    onClose();
  };

  // Emojis for quick reactions
  const QUICK_EMOJIS = ['❤️', '🔥', '😍', '👏', '😂', '🎉', '💯', '🙌'];

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOn(!isCameraOn);
    }
  };

  const flipCamera = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isCameraOn ? 'environment' : 'user' },
        audio: true,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error('Error flipping camera:', error);
    }
  };

  const sendComment = () => {
    if (newComment.trim() && currentUser && channelRef.current) {
      const comment: Comment = {
        id: Date.now().toString(),
        username: currentUser.username,
        text: newComment.trim(),
        timestamp: new Date(),
        avatarUrl: currentUser.avatarUrl,
      };
      
      // Broadcast comment to all viewers
      channelRef.current.send({
        type: 'broadcast',
        event: 'comment',
        payload: comment,
      });
      
      // Add to local comments
      setComments(prev => [...prev.slice(-20), comment]);
      setNewComment('');
    }
  };

  if (step === 'setup') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Go Live</h2>
          </div>

          <div className="space-y-4">
            <Input
              placeholder="Add a title for your live..."
              value={liveTitle}
              onChange={(e) => setLiveTitle(e.target.value)}
              className="rounded-xl"
            />

            <div className="aspect-[9/16] bg-muted rounded-2xl flex items-center justify-center">
              <div className="text-center px-4">
                <Radio className="w-12 h-12 text-pink-500 mx-auto mb-3" />
                <p className="text-lg font-semibold mb-2">Ready to go live?</p>
                <p className="text-muted-foreground text-sm">Real-time viewer tracking with Supabase Presence</p>
              </div>
            </div>

            <Button 
              className="w-full rounded-xl bg-pink-500 hover:bg-pink-600"
              onClick={handleGoLive}
              disabled={!liveTitle.trim()}
            >
              <Radio className="w-4 h-4 mr-2" />
              Go Live
            </Button>
            
            <Button 
              variant="outline"
              className="w-full rounded-xl"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'ended') {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-gradient-to-br from-background via-background to-pink-500/5 border-pink-500/20">
          <div className="relative">
            {/* Decorative elements */}
            <div className="absolute -top-2 -right-2 w-20 h-20 bg-pink-500/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-500/20 rounded-full blur-xl" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold">Live Ended</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClose} className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 rounded-2xl p-4 text-center border border-pink-500/20">
                    <div className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                      {viewerCount}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Peak Viewers</span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-2xl p-4 text-center border border-red-500/20">
                    <div className="text-3xl font-bold text-red-500 flex items-center justify-center gap-1">
                      <Heart className="w-6 h-6 fill-red-500" />
                      {likeCount}
                    </div>
                    <span className="text-xs text-muted-foreground">Likes</span>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl p-4 text-center border border-blue-500/20">
                    <div className="text-3xl font-bold text-blue-500 flex items-center justify-center gap-1">
                      <MessageCircle className="w-5 h-5" />
                      {comments.length}
                    </div>
                    <span className="text-xs text-muted-foreground">Comments</span>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl p-4 text-center border border-purple-500/20">
                    <div className="text-3xl font-bold text-purple-500">
                      {formatDuration(liveDuration)}
                    </div>
                    <span className="text-xs text-muted-foreground">Duration</span>
                  </div>
                </div>

                {/* Title recap */}
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-sm text-muted-foreground">Stream title</p>
                  <p className="font-semibold">{liveTitle}</p>
                </div>

                {/* Close button */}
                <Button 
                  className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  onClick={handleClose}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-full h-screen p-0 border-0 rounded-none">
        <div className="relative h-full bg-gradient-to-b from-black via-black to-purple-950/30">
          {/* Video Preview with gradient overlay */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Gradient overlays for modern look */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

          {/* Top Bar with glass effect */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Live badge with glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-pink-500 rounded-full blur-md opacity-50 animate-pulse" />
                  <div className="relative bg-gradient-to-r from-pink-500 to-red-500 px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-white text-sm font-bold tracking-wide">LIVE</span>
                  </div>
                </div>
                
                {/* Stats pills */}
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <Users className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-sm font-medium">{viewerCount}</span>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <span className="text-white text-sm font-medium">{formatDuration(liveDuration)}</span>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="bg-white/10 backdrop-blur-md text-white hover:bg-red-500/80 rounded-full w-10 h-10 border border-white/10"
                onClick={handleEndLive}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Title with subtle background */}
            <div className="mt-3 bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/5">
              <p className="text-white font-semibold text-lg">{liveTitle}</p>
            </div>
          </div>

          {/* Viewer avatars with better styling */}
          {viewerCount > 0 && (
            <div className="absolute top-32 left-4 flex -space-x-2 z-10">
              {Array.from(viewers.values()).slice(0, 5).map((viewer, idx) => (
                <div
                  key={viewer.oderId}
                  className="w-9 h-9 rounded-full border-2 border-pink-500/50 bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center overflow-hidden shadow-lg"
                  style={{ zIndex: 5 - idx }}
                >
                  {viewer.avatarUrl ? (
                    <img src={viewer.avatarUrl} alt={viewer.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs font-bold">{viewer.username[0]?.toUpperCase()}</span>
                  )}
                </div>
              ))}
              {viewerCount > 5 && (
                <div className="w-9 h-9 rounded-full border-2 border-white/20 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">+{viewerCount - 5}</span>
                </div>
              )}
            </div>
          )}

          {/* Comments Section with modern bubbles */}
          <div className="absolute bottom-44 left-0 right-20 max-h-60 overflow-hidden px-4">
            {comments.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
                <span className="text-white/70 text-sm">✨ Waiting for viewers to join...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {comments.slice(-6).map((comment, idx) => (
                  <div 
                    key={comment.id} 
                    className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/5 flex items-start gap-2 animate-in slide-in-from-left duration-300"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {comment.avatarUrl ? (
                      <img src={comment.avatarUrl} alt="" className="w-6 h-6 rounded-full border border-white/20" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{comment.username[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-pink-400 font-semibold text-sm">@{comment.username}</span>
                      <p className="text-white/90 text-sm break-words">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floating Hearts Animation */}
          <FloatingHearts trigger={likeTrigger} />

          {/* Side actions - Likes with animation */}
          <div className="absolute right-4 bottom-52 flex flex-col items-center gap-3 z-10">
            <div className="relative">
              <div className={`absolute inset-0 bg-pink-500 rounded-full blur-lg transition-opacity ${likeCount > 0 ? 'opacity-50' : 'opacity-0'}`} />
              <div className="relative bg-white/10 backdrop-blur-md rounded-full p-3 border border-white/10">
                <Heart className={`w-7 h-7 transition-all ${likeCount > 0 ? 'text-pink-500 fill-pink-500 scale-110' : 'text-white'}`} />
              </div>
            </div>
            <span className="text-white text-sm font-bold">{likeCount}</span>
          </div>

          {/* Bottom Controls with glass morphism */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
            {/* Quick emoji reactions */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setNewComment(prev => prev + emoji);
                  }}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-lg transition-all hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Comment Input with modern styling */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 relative">
                <Input
                  placeholder="Say something..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                  className="w-full bg-white/10 backdrop-blur-md border-white/10 text-white placeholder:text-white/50 rounded-full pl-4 pr-12 py-3 focus:ring-2 focus:ring-pink-500/50"
                />
              </div>
              <Button
                size="icon"
                className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 w-11 h-11 shadow-lg"
                onClick={sendComment}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>

            {/* Control Buttons with glass effect */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                size="lg"
                className={`rounded-full w-14 h-14 backdrop-blur-md border border-white/10 transition-all ${isMuted ? 'bg-red-500/80 hover:bg-red-600/80' : 'bg-white/10 hover:bg-white/20'}`}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className={`rounded-full w-14 h-14 backdrop-blur-md border border-white/10 transition-all ${!isCameraOn ? 'bg-red-500/80 hover:bg-red-600/80' : 'bg-white/10 hover:bg-white/20'}`}
                onClick={toggleCamera}
              >
                {isCameraOn ? <Camera className="w-6 h-6 text-white" /> : <CameraOff className="w-6 h-6 text-white" />}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10"
                onClick={flipCamera}
              >
                <RotateCcw className="w-6 h-6 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoLiveModal;
