import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Copy, Share2, MessageCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

const ShareProfileModal: React.FC<ShareProfileModalProps> = ({ isOpen, onClose, username }) => {
  const { toast } = useToast();
  const profileUrl = `https://reelit.app/@${username}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Link copied!",
      description: "Profile link copied to clipboard",
    });
  };

  const shareOptions = [
    { icon: MessageCircle, label: 'Share via Message', action: () => console.log('Share message') },
    { icon: Mail, label: 'Share via Email', action: () => console.log('Share email') },
    { icon: Share2, label: 'More options', action: () => console.log('More') },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Profile</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Profile Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Profile Link</label>
            <div className="flex gap-2">
              <Input value={profileUrl} readOnly className="flex-1" />
              <Button onClick={copyToClipboard}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-2">
            {shareOptions.map((option, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="w-full justify-start"
                onClick={option.action}
              >
                <option.icon className="w-5 h-5 mr-3" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareProfileModal;
