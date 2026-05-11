import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, Video, AtSign, Mail, AlertCircle, Settings, ExternalLink, Loader2, Radio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { Capacitor } from '@capacitor/core';

interface Preferences {
  push_enabled: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  new_reels: boolean;
  mentions: boolean;
  messages: boolean;
  live_alerts: boolean;
}

const NotificationPreferencesPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    push_enabled: true,
    likes: true,
    comments: true,
    follows: true,
    new_reels: true,
    mentions: true,
    messages: true,
  });

  useEffect(() => {
    if (authUser) {
      fetchPreferences();
      checkPermissionStatus();
    }
  }, [authUser]);

  const checkPermissionStatus = () => {
    if ('Notification' in window) {
      setPermissionDenied(Notification.permission === 'denied');
    }
  };

  const fetchPreferences = async () => {
    if (!authUser) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (data) {
      setPreferences({
        push_enabled: data.push_enabled,
        likes: data.likes,
        comments: data.comments,
        follows: data.follows,
        new_reels: data.new_reels,
        mentions: data.mentions,
        messages: data.messages,
      });
    } else if (!error || error.code === 'PGRST116') {
      // No record exists, create default preferences
      await supabase.from('notification_preferences').insert({
        user_id: authUser.id,
      });
    }

    setLoading(false);
  };

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    if (!authUser) return;

    // Handle push permission specially
    if (key === 'push_enabled' && value) {
      if (!('Notification' in window)) {
        toast({
          title: "Not supported",
          description: "Push notifications are not supported on this device.",
          variant: "destructive",
        });
        return;
      }

      if (Notification.permission === 'denied') {
        setPermissionDenied(true);
        toast({
          title: "Permission blocked",
          description: "Please enable notifications in your device settings.",
          variant: "destructive",
        });
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        if (permission === 'denied') setPermissionDenied(true);
        return;
      }
      setPermissionDenied(false);
    }

    setPreferences(prev => ({ ...prev, [key]: value }));
    setSaving(true);

    const { error } = await supabase
      .from('notification_preferences')
      .update({ [key]: value })
      .eq('user_id', authUser.id);

    setSaving(false);

    if (error) {
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: !value }));
      toast({
        title: "Error",
        description: "Failed to save preference.",
        variant: "destructive",
      });
    }
  };

  const openSystemSettings = () => {
    const isNative = Capacitor.isNativePlatform();
    const isAndroid = Capacitor.getPlatform() === 'android';
    const isIOS = Capacitor.getPlatform() === 'ios';
    
    if (isNative) {
      toast({
        title: "Open Settings",
        description: isAndroid 
          ? "Go to Settings → Apps → Muv'it → Notifications → Enable"
          : "Go to Settings → Muv'it → Notifications → Allow",
        duration: 10000,
      });
    } else {
      const isChrome = navigator.userAgent.includes('Chrome');
      const isFirefox = navigator.userAgent.includes('Firefox');
      const isSafari = navigator.userAgent.includes('Safari') && !isChrome;
      
      let instructions = '';
      if (isChrome) {
        instructions = 'Click the lock icon → Site settings → Notifications → Allow';
      } else if (isFirefox) {
        instructions = 'Click the lock icon → Permissions → Notifications → Allow';
      } else if (isSafari) {
        instructions = 'Safari → Settings → Websites → Notifications → Allow';
      } else {
        instructions = 'Open browser settings and enable notifications for this site';
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
      key: 'push_enabled' as const,
      icon: Bell,
      label: 'Push Notifications',
      description: 'Receive real-time alerts on your device',
      isPush: true,
    },
    {
      key: 'likes' as const,
      icon: Heart,
      label: 'Likes',
      description: 'When someone likes your content',
    },
    {
      key: 'comments' as const,
      icon: MessageCircle,
      label: 'Comments',
      description: 'When someone comments on your reels',
    },
    {
      key: 'follows' as const,
      icon: UserPlus,
      label: 'New Followers',
      description: 'When someone starts following you',
    },
    {
      key: 'new_reels' as const,
      icon: Video,
      label: 'New Reels',
      description: 'When people you follow post new reels',
    },
    {
      key: 'mentions' as const,
      icon: AtSign,
      label: 'Mentions',
      description: 'When someone mentions you',
    },
    {
      key: 'messages' as const,
      icon: Mail,
      label: 'Direct Messages',
      description: 'When you receive a new message',
    },
  ];

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Notification Settings</h1>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />}
      </div>

      <div className="p-4 space-y-4">
        {/* Permission Denied Warning */}
        {permissionDenied && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Notifications Blocked</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You've blocked notifications. Enable them in your device settings to receive alerts.
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

        {/* Notification Options */}
        <div className="bg-secondary/30 rounded-2xl overflow-hidden divide-y divide-border/50">
          {notificationOptions.map((option) => (
            <div
              key={option.key}
              className={`flex items-center justify-between p-4 ${
                option.isPush && permissionDenied ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  preferences[option.key] ? 'bg-primary/20' : 'bg-secondary'
                }`}>
                  <option.icon className={`w-5 h-5 ${
                    preferences[option.key] ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{option.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                </div>
              </div>
              <Switch 
                checked={preferences[option.key]} 
                onCheckedChange={(v) => updatePreference(option.key, v)}
                disabled={option.isPush && permissionDenied}
              />
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="bg-secondary/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground text-center">
            Control what notifications you receive. Push notifications require device permission.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferencesPage;
