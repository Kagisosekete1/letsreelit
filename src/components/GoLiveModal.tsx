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
}

const GoLiveModal: React.FC<GoLiveModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const { currentUser, authUser, refreshProfile } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [liveTitle, setLiveTitle] = useState('');
  const [step, setStep] = useState<'setup' | 'live' | 'ended'>('setup');
  const [liveStartTime, setLiveStartTime] = useState<Date | null>(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } },
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

    await startCamera();
    setStep('live');
    setIsLive(true);
    setLiveStartTime(new Date());
    
    // Real counts only - no fake viewers, likes, or comments
    // Viewers, likes, and comments will be 0 until real users interact
  };

  const handleEndLive = async () => {
    // Stop recording
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
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
    if (newComment.trim() && currentUser) {
      const comment: Comment = {
        id: Date.now().toString(),
        username: currentUser.username,
        text: newComment.trim(),
        timestamp: new Date(),
      };
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
                <p className="text-muted-foreground text-sm">Only real viewers and interactions will be counted</p>
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

          {/* Comments Section - Real comments only */}
          <div className="absolute bottom-32 left-0 right-16 max-h-64 overflow-hidden px-4">
            {comments.length === 0 ? (
              <div className="bg-black/40 rounded-xl px-3 py-2 backdrop-blur-sm">
                <span className="text-white/60 text-sm">No comments yet. Be the first to comment!</span>
              </div>
            ) : (
              <div className="space-y-2">
                {comments.slice(-8).map((comment) => (
                  <div key={comment.id} className="bg-black/40 rounded-xl px-3 py-2 backdrop-blur-sm">
                    <span className="text-white font-semibold text-sm">@{comment.username}</span>
                    <span className="text-white/80 text-sm ml-2">{comment.text}</span>
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