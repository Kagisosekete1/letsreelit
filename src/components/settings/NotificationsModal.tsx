import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, Heart, MessageCircle, UserPlus, Video, AlertCircle, ExternalLink, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [likes, setLikes] = useState(true);
  const [comments, setComments] = useState(true);
  const [followers, setFollowers] = useState(true);
  const [mentions, setMentions] = useState(true);

  // Check current permission status
  useEffect(() => {
    if ('Notification' in window) {
      const status = Notification.permission;
      setPushEnabled(status === 'granted');
      setPermissionDenied(status === 'denied');
    }
    
    // Load saved preferences
    const savedPrefs = localStorage.getItem('notificationPrefs');
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      setLikes(prefs.likes ?? true);
      setComments(prefs.comments ?? true);
      setFollowers(prefs.followers ?? true);
      setMentions(prefs.mentions ?? true);
    }
  }, [isOpen]);

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
      if (!('Notification' in window)) {
        toast({
          title: "Not supported",
          description: "Push notifications are not supported on this device.",
          variant: "destructive",
        });
        return;
      }

      const currentPermission = Notification.permission;
      
      if (currentPermission === 'denied') {
        setPermissionDenied(true);
        toast({
          title: "Permission blocked",
          description: "Notifications are blocked. Please enable them in your device settings.",
          variant: "destructive",
        });
        return;
      }

      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        setPushEnabled(true);
        setPermissionDenied(false);
        savePreferences('pushEnabled', true);
        toast({
          title: "Push notifications enabled",
          description: "You'll now receive notifications on this device.",
        });
      } else if (permission === 'denied') {
        setPermissionDenied(true);
        toast({
          title: "Permission denied",
          description: "You can enable notifications in your device settings.",
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

  const openSystemSettings = () => {
    const isNative = Capacitor.isNativePlatform();
    const isAndroid = Capacitor.getPlatform() === 'android';
    const isIOS = Capacitor.getPlatform() === 'ios';
    
    if (isNative) {
      if (isAndroid) {
        // For Android native app
        toast({
          title: "Open Settings",
          description: "Go to Settings → Apps → Reel'it → Notifications → Enable notifications",
        });
      } else if (isIOS) {
        // For iOS native app
        toast({
          title: "Open Settings",
          description: "Go to Settings → Reel'it → Notifications → Allow Notifications",
        });
      }
    } else {
      // For web browsers
      const isChrome = navigator.userAgent.includes('Chrome');
      const isFirefox = navigator.userAgent.includes('Firefox');
      const isSafari = navigator.userAgent.includes('Safari') && !isChrome;
      
      let instructions = '';
      
      if (isChrome) {
        instructions = 'Click the lock icon in the address bar → Site settings → Notifications → Allow';
      } else if (isFirefox) {
        instructions = 'Click the lock icon → Connection secure → More Information → Permissions → Notifications → Allow';
      } else if (isSafari) {
        instructions = 'Safari → Settings → Websites → Notifications → Allow for this site';
      } else {
        instructions = 'Open your browser settings and enable notifications for this site';
      }
      
      toast({
        title: "Enable Notifications",
        description: instructions,
        duration: 10000,
      });
    }
  };

  const notificationOptions = [
    {
      icon: Bell,
      label: 'Push Notifications',
      description: pushEnabled ? 'Enabled - receiving notifications' : 'Enable to receive real-time alerts',
      value: pushEnabled,
      onChange: handlePushToggle,
      key: 'pushEnabled',
      isPush: true,
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
      <DialogContent className="sm:max-w-[425px] bg-card border-border rounded-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground">Notifications</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Permission Denied Helper */}
          {permissionDenied && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Notifications Blocked</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You've previously blocked notifications. To receive alerts, you need to enable them in your device or browser settings.
                  </p>
                </div>
              </div>
              <Button 
                onClick={openSystemSettings}
                variant="outline"
                className="w-full gap-2 border-destructive/30 hover:bg-destructive/10"
              >
                <Settings className="w-4 h-4" />
                How to Re-enable
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          )}

          <div className="space-y-1 bg-secondary/30 rounded-2xl overflow-hidden">
            {notificationOptions.map((option, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-4 hover:bg-secondary/50 ${
                  option.isPush && permissionDenied ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <option.icon className={`w-5 h-5 ${
                    option.isPush && option.value 
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                  }`} />
                  <div>
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
                <Switch 
                  checked={option.value} 
                  onCheckedChange={option.onChange}
                  disabled={option.isPush && permissionDenied}
                />
              </div>
            ))}
          </div>

          {/* Info section */}
          <div className="bg-secondary/20 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground text-center">
              Push notifications let you know about likes, comments, and followers in real-time, even when you're not using the app.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsModal;
