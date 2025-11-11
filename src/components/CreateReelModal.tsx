import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Upload, 
  Video, 
  Scissors, 
  Crop,
  Sparkles,
  Radio,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateReelModal: React.FC<CreateReelModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/quicktime';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Check if video is portrait
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          if (video.videoHeight > video.videoWidth) {
            setSelectedFile(file);
            toast({
              title: "Video uploaded",
              description: "Your video is ready for editing!",
            });
          } else {
            toast({
              title: "Invalid orientation",
              description: "Please upload a portrait video (vertical)",
              variant: "destructive",
            });
          }
        };
        video.src = URL.createObjectURL(file);
      }
    };
    input.click();
  };

  const options = [
    {
      icon: Upload,
      title: 'Upload from Gallery',
      description: 'Choose a video from your device',
      color: 'bg-primary',
      action: handleUpload,
    },
    {
      icon: Video,
      title: 'Record Video',
      description: 'Record a new video',
      color: 'bg-destructive',
      action: () => toast({ title: "Coming soon", description: "Camera feature coming soon!" }),
    },
    {
      icon: Crop,
      title: 'Crop & Trim',
      description: 'Edit your video length',
      color: 'bg-accent',
      action: () => toast({ title: "Coming soon", description: "Crop feature coming soon!" }),
    },
    {
      icon: Sparkles,
      title: 'Filters & Effects',
      description: 'Add stunning filters',
      color: 'bg-purple-500',
      action: () => toast({ title: "Coming soon", description: "Filters coming soon!" }),
    },
    {
      icon: Radio,
      title: 'Go Live',
      description: 'Start a live stream',
      color: 'bg-pink-500',
      action: () => toast({ title: "Coming soon", description: "Live streaming coming soon!" }),
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Reel</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground px-1">
            Portrait videos only (vertical orientation)
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
