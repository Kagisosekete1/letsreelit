import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Bell, Heart, MessageCircle, UserPlus, Video } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [likes, setLikes] = useState(true);
  const [comments, setComments] = useState(true);
  const [followers, setFollowers] = useState(true);
  const [mentions, setMentions] = useState(true);

  // Load saved preferences
  useEffect(() => {
    const savedPrefs = localStorage.getItem('notificationPrefs');
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      setPushEnabled(prefs.pushEnabled ?? false);
      setLikes(prefs.likes ?? true);
      setComments(prefs.comments ?? true);
      setFollowers(prefs.followers ?? true);
      setMentions(prefs.mentions ?? true);
    }
  }, [isOpen]);

  // Save preferences when changed
  const savePreferences = (key: string, value: boolean) => {
    const currentPrefs = {
      pushEnabled,
      likes,
      comments,
      followers,
      mentions,
      [key]: value,
    };
    localStorage.setItem('notificationPrefs', JSON.stringify(currentPrefs));
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      // Request notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setPushEnabled(true);
          savePreferences('pushEnabled', true);
          toast({
            title: "Push notifications enabled",
            description: "You'll now receive notifications on this device.",
          });
        } else {
          toast({
            title: "Permission denied",
            description: "Please enable notifications in your browser settings.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Not supported",
          description: "Push notifications are not supported on this device.",
          variant: "destructive",
        });
      }
    } else {
      setPushEnabled(false);
      savePreferences('pushEnabled', false);
      toast({
        title: "Push notifications disabled",
        description: "You won't receive push notifications anymore.",
      });
    }
  };

  const handleToggle = (key: string, setter: (v: boolean) => void, value: boolean) => {
    setter(value);
    savePreferences(key, value);
  };

  const notificationOptions = [
    {
      icon: Bell,
      label: 'Push Notifications',
      description: 'Receive push notifications on your device',
      value: pushEnabled,
      onChange: handlePushToggle,
      key: 'pushEnabled',
    },
    {
      icon: Heart,
      label: 'Likes',
      description: 'Get notified when someone likes your content',
      value: likes,
      onChange: (v: boolean) => handleToggle('likes', setLikes, v),
      key: 'likes',
    },
    {
      icon: MessageCircle,
      label: 'Comments',
      description: 'Get notified when someone comments',
      value: comments,
      onChange: (v: boolean) => handleToggle('comments', setComments, v),
      key: 'comments',
    },
    {
      icon: UserPlus,
      label: 'New Followers',
      description: 'Get notified when someone follows you',
      value: followers,
      onChange: (v: boolean) => handleToggle('followers', setFollowers, v),
      key: 'followers',
    },
    {
      icon: Video,
      label: 'Mentions',
      description: 'Get notified when someone mentions you',
      value: mentions,
      onChange: (v: boolean) => handleToggle('mentions', setMentions, v),
      key: 'mentions',
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