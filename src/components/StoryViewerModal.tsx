import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Pause, Play } from 'lucide-react';

interface Story {
  id: number;
  username: string;
  avatarUrl: string;
  videoUrl: string;
}

interface StoryViewerModalProps {
  story: Story;
  onClose: () => void;
}

const StoryViewerModal: React.FC<StoryViewerModalProps> = ({ story, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  const handleVideoEnd = () => {
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] h-[600px] p-0 bg-black border-none">
        <div className="relative h-full w-full">
          {/* Progress Bar */}
          <div className="absolute top-4 left-4 right-4 z-20">
            <div className="w-full bg-foreground/20 rounded-full h-1">
              <div 
                className="bg-foreground h-1 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Header */}
          <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={story.avatarUrl}
                alt={story.username}
                className="w-8 h-8 rounded-full border border-foreground/20"
              />
              <span className="text-foreground font-medium">{story.username}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground hover:bg-foreground/10"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Video */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            src={story.videoUrl}
            autoPlay
            muted
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnd}
            onClick={togglePlay}
          />

          {/* Play/Pause Overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Button
                variant="ghost"
                size="lg"
                className="bg-background/20 backdrop-blur-glass rounded-full p-4"
                onClick={togglePlay}
              >
                <Play className="w-6 h-6 text-foreground" fill="currentColor" />
              </Button>
            </div>
          )}

          {/* Tap Areas for Navigation */}
          <div className="absolute inset-0 flex">
            <div className="flex-1" onClick={onClose} />
            <div className="flex-1" onClick={onClose} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryViewerModal;