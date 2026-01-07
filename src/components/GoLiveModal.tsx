import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Heart, Send, Users, Radio, Mic, MicOff, Camera, CameraOff, RotateCcw, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';

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

  const saveLiveToTutorial = async () => {
    if (!authUser || !currentUser) {
      toast({ title: "Error", description: "Please sign in", variant: "destructive" });
      return;
    }

    try {
      // Create blob from recorded chunks
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const file = new File([blob], `live_${Date.now()}.webm`, { type: 'video/webm' });

      // Upload to storage
      const fileName = `${authUser.id}/live_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('reels')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('reels')
        .getPublicUrl(fileName);

      // Save to database as reel (live replay)
      const { error: dbError } = await supabase
        .from('reels')
        .insert({
          user_id: authUser.id,
          title: liveTitle,
          description: `Live replay • ${formatDuration(liveDuration)} • ${viewerCount} viewers`,
          video_url: publicUrl,
          is_portrait: true,
          views_count: viewerCount,
          likes_count: likeCount,
          comments_count: comments.length,
        });

      if (dbError) throw dbError;

      await refreshProfile();

      toast({
        title: "Live saved!",
        description: "Your live replay has been saved.",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save live",
        variant: "destructive",
      });
    }
  };

  const handleDiscard = () => {
    recordedChunksRef.current = [];
    toast({ title: "Live discarded", description: "Your live recording has been deleted." });
    onClose();
  };

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
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Live Ended</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-6 py-4">
            {/* Live Results - Real stats only */}
            <div className="bg-secondary/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-center">Live Results</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{formatDuration(liveDuration)}</p>
                  <p className="text-sm text-muted-foreground">Duration</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{viewerCount}</p>
                  <p className="text-sm text-muted-foreground">Viewers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-pink-500">{likeCount}</p>
                  <p className="text-sm text-muted-foreground">Likes</p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">{comments.length} comments received</p>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                className="w-full rounded-xl"
                onClick={saveLiveToTutorial}
              >
                Save as Reel
              </Button>
              <Button 
                variant="outline"
                className="w-full rounded-xl text-destructive hover:text-destructive"
                onClick={handleDiscard}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Discard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-full h-screen p-0 border-0 rounded-none">
        <div className="relative h-full bg-black">
          {/* Video Preview */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Live Badge & Stats - Real counts only */}
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
              <div className="bg-black/50 px-3 py-1 rounded-full">
                <span className="text-white text-sm">{formatDuration(liveDuration)}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="bg-black/50 text-white hover:bg-black/70 rounded-full"
              onClick={handleEndLive}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Title */}
          <div className="absolute top-16 left-4 right-4">
            <p className="text-white font-semibold">{liveTitle}</p>
          </div>

          {/* Viewer avatars (if any) */}
          {viewerCount > 0 && (
            <div className="absolute top-24 left-4 flex -space-x-2">
              {Array.from(viewers.values()).slice(0, 5).map((viewer, idx) => (
                <div
                  key={viewer.oderId}
                  className="w-8 h-8 rounded-full border-2 border-white bg-gray-600 flex items-center justify-center overflow-hidden"
                  style={{ zIndex: 5 - idx }}
                >
                  {viewer.avatarUrl ? (
                    <img src={viewer.avatarUrl} alt={viewer.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs">{viewer.username[0]?.toUpperCase()}</span>
                  )}
                </div>
              ))}
              {viewerCount > 5 && (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs">+{viewerCount - 5}</span>
                </div>
              )}
            </div>
          )}

          {/* Comments Section - Real comments only */}
          <div className="absolute bottom-32 left-0 right-16 max-h-64 overflow-hidden px-4">
            {comments.length === 0 ? (
              <div className="bg-black/40 rounded-xl px-3 py-2 backdrop-blur-sm">
                <span className="text-white/60 text-sm">Waiting for viewers to join...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {comments.slice(-8).map((comment) => (
                  <div key={comment.id} className="bg-black/40 rounded-xl px-3 py-2 backdrop-blur-sm flex items-center gap-2">
                    {comment.avatarUrl && (
                      <img src={comment.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                    )}
                    <div>
                      <span className="text-white font-semibold text-sm">@{comment.username}</span>
                      <span className="text-white/80 text-sm ml-2">{comment.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Like Animation Area - Real likes only */}
          <div className="absolute right-4 bottom-48 flex flex-col items-center gap-2">
            <div className="bg-black/50 rounded-full p-3">
              <Heart className={`w-6 h-6 ${likeCount > 0 ? 'text-pink-500 fill-pink-500' : 'text-white'}`} />
            </div>
            <span className="text-white text-sm font-semibold">{likeCount}</span>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            {/* Comment Input */}
            <div className="flex items-center gap-2 mb-4">
              <Input
                placeholder="Say something..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                className="flex-1 bg-white/10 border-0 text-white placeholder:text-white/50 rounded-full"
              />
              <Button
                size="sm"
                className="rounded-full bg-primary"
                onClick={sendComment}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="lg"
                className={`rounded-full ${isMuted ? 'bg-destructive/80' : 'bg-white/20'}`}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className={`rounded-full ${!isCameraOn ? 'bg-destructive/80' : 'bg-white/20'}`}
                onClick={toggleCamera}
              >
                {isCameraOn ? <Camera className="w-6 h-6 text-white" /> : <CameraOff className="w-6 h-6 text-white" />}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full bg-white/20"
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
