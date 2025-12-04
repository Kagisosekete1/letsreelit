import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Video, Radio, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReelUploadModal from './ReelUploadModal';

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateReelModal: React.FC<CreateReelModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/quicktime,video/webm';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Check if video is portrait
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          if (video.videoHeight > video.videoWidth) {
            setSelectedFile(file);
            setShowUploadModal(true);
          } else {
            toast({
              title: "Invalid orientation",
              description: "Please upload a portrait reel (vertical)",
              variant: "destructive",
            });
          }
          URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(file);
      }
    };
    input.click();
  };

  const handleRecord = () => {
    toast({ title: "Coming soon", description: "Camera recording feature coming soon!" });
  };

  const handleGoLive = () => {
    toast({ title: "Go Live", description: "Live streaming feature coming soon!" });
  };

  const handleUploadModalClose = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    onClose();
  };

  const options = [
    {
      icon: Upload,
      title: 'Upload from Gallery',
      description: 'Choose a portrait reel from your device',
      color: 'bg-primary',
      action: handleUpload,
    },
    {
      icon: Video,
      title: 'Record Reel',
      description: 'Record a new portrait reel',
      color: 'bg-destructive',
      action: handleRecord,
    },
    {
      icon: Radio,
      title: 'Go Live',
      description: 'Start a live stream for your fans',
      color: 'bg-pink-500',
      action: handleGoLive,
    },
  ];

  if (showUploadModal && selectedFile) {
    return (
      <ReelUploadModal
        isOpen={showUploadModal}
        onClose={handleUploadModalClose}
        videoFile={selectedFile}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create Reel</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground px-1">
            Portrait reels only (vertical orientation)
          </p>
          
          {options.map((option, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="w-full h-auto py-4 justify-start"
              onClick={option.action}
            >
              <div className={`w-10 h-10 rounded-lg ${option.color} flex items-center justify-center mr-3`}>
                <option.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold">{option.title}</p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateReelModal;
