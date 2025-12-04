import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Heart, MessageCircle, Send, Users, Radio, Mic, MicOff, Camera, CameraOff, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';

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
  const { currentUser } = useUser();
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
  const [step, setStep] = useState<'setup' | 'live'>('setup');

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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
    
    // Simulate viewers joining
    const viewerInterval = setInterval(() => {
      setViewerCount(prev => Math.min(prev + Math.floor(Math.random() * 3), 100));
    }, 3000);

    // Simulate likes
    const likeInterval = setInterval(() => {
      if (Math.random() > 0.5) {
        setLikeCount(prev => prev + Math.floor(Math.random() * 5));
      }
    }, 2000);

    // Simulate comments
    const commentInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        const sampleComments = [
          "Amazing moves! 🔥",
          "Love this!",
          "You're so talented!",
          "Keep going!",
          "💪💪💪",
          "This is fire!",
          "❤️❤️❤️",
        ];
        const newSimComment: Comment = {
          id: Date.now().toString(),
          username: `user${Math.floor(Math.random() * 1000)}`,
          text: sampleComments[Math.floor(Math.random() * sampleComments.length)],
          timestamp: new Date(),
        };
        setComments(prev => [...prev.slice(-20), newSimComment]);
      }
    }, 4000);

    return () => {
      clearInterval(viewerInterval);
      clearInterval(likeInterval);
      clearInterval(commentInterval);
    };
  };

  const handleEndLive = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsLive(false);
    toast({
      title: "Live ended",
      description: `You were live for ${viewerCount} viewers with ${likeCount} likes!`,
    });
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
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="aspect-[9/16] bg-muted rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <Radio className="w-12 h-12 text-pink-500 mx-auto mb-2" />
                <p className="text-muted-foreground">Camera preview will appear here</p>
              </div>
            </div>

            <Input
              placeholder="Add a title for your live..."
              value={liveTitle}
              onChange={(e) => setLiveTitle(e.target.value)}
              className="rounded-xl"
              maxLength={100}
            />

            <Button 
              className="w-full bg-pink-500 hover:bg-pink-600 rounded-xl"
              onClick={handleGoLive}
            >
              <Radio className="w-4 h-4 mr-2" />
              Go Live
            </Button>
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
              onClick={handleEndLive}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Title */}
          <div className="absolute top-16 left-4 right-4">
            <p className="text-white font-semibold">{liveTitle}</p>
          </div>

          {/* Comments Section */}
          <div className="absolute bottom-32 left-0 right-16 max-h-64 overflow-hidden px-4">
            <div className="space-y-2">
              {comments.slice(-8).map((comment) => (
                <div key={comment.id} className="bg-black/40 rounded-xl px-3 py-2 backdrop-blur-sm">
                  <span className="text-white font-semibold text-sm">@{comment.username}</span>
                  <span className="text-white/80 text-sm ml-2">{comment.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Like Animation Area */}
          <div className="absolute right-4 bottom-48 flex flex-col items-center gap-2">
            <div className="bg-black/50 rounded-full p-3">
              <Heart className="w-6 h-6 text-pink-500" fill="currentColor" />
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