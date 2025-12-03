import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Share2, MessageCircle, Mail } from 'lucide-react';
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
    { 
      icon: MessageCircle, 
      label: 'Share via Message', 
      action: () => {
        if (navigator.share) {
          navigator.share({ title: 'Check out my Reel\'It profile', url: profileUrl });
        }
      }
    },
    { 
      icon: Mail, 
      label: 'Share via Email', 
      action: () => {
        window.location.href = `mailto:?subject=Check out my Reel'It profile&body=${profileUrl}`;
      }
    },
    { 
      icon: Share2, 
      label: 'More options', 
      action: () => {
        if (navigator.share) {
          navigator.share({ title: 'Check out my Reel\'It profile', url: profileUrl });
        }
      }
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border rounded-3xl">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground">Share Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Profile Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Profile Link</label>
            <div className="flex gap-2">
              <Input value={profileUrl} readOnly className="flex-1 rounded-xl" />
              <Button onClick={copyToClipboard} className="rounded-xl">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-1 bg-secondary/30 rounded-2xl overflow-hidden">
            {shareOptions.map((option, idx) => (
              <Button
                key={idx}
                variant="ghost"
                className="w-full justify-start h-auto py-4 px-4 rounded-none hover:bg-secondary/50"
                onClick={option.action}
              >
                <option.icon className="w-5 h-5 mr-3 text-muted-foreground" />
                <span className="text-foreground">{option.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareProfileModal;