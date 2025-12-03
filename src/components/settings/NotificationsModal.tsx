import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Bell, Heart, MessageCircle, UserPlus, Video } from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [likes, setLikes] = useState(true);
  const [comments, setComments] = useState(true);
  const [followers, setFollowers] = useState(true);
  const [mentions, setMentions] = useState(true);

  const notificationOptions = [
    {
      icon: Bell,
      label: 'Push Notifications',
      description: 'Receive push notifications on your device',
      value: pushEnabled,
      onChange: setPushEnabled,
    },
    {
      icon: Heart,
      label: 'Likes',
      description: 'Get notified when someone likes your content',
      value: likes,
      onChange: setLikes,
    },
    {
      icon: MessageCircle,
      label: 'Comments',
      description: 'Get notified when someone comments',
      value: comments,
      onChange: setComments,
    },
    {
      icon: UserPlus,
      label: 'New Followers',
      description: 'Get notified when someone follows you',
      value: followers,
      onChange: setFollowers,
    },
    {
      icon: Video,
      label: 'Mentions',
      description: 'Get notified when someone mentions you',
      value: mentions,
      onChange: setMentions,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border rounded-3xl">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground">Notifications</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-1 bg-secondary/30 rounded-2xl overflow-hidden">
            {notificationOptions.map((option, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 hover:bg-secondary/50"
              >
                <div className="flex items-center gap-3">
                  <option.icon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
                <Switch checked={option.value} onCheckedChange={option.onChange} />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsModal;