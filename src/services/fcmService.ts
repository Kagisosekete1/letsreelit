// Firebase Cloud Messaging Service for native push notifications
// This service handles FCM token management and device registration

import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

export interface FCMToken {
  token: string;
  platform: 'android' | 'ios' | 'web';
  createdAt: Date;
}

class FCMService {
  private static instance: FCMService;
  private token: string | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const platform = this.getPlatform();
      
      if (platform === 'web') {
        // Web push using service worker
        return await this.initializeWebPush();
      } else {
        // Native push using Capacitor
        return await this.initializeNativePush();
      }
    } catch (error) {
      console.error('FCM initialization failed:', error);
      return false;
    }
  }

  private getPlatform(): 'android' | 'ios' | 'web' {
    if (Capacitor.isNativePlatform()) {
      return Capacitor.getPlatform() as 'android' | 'ios';
    }
    return 'web';
  }

  private async initializeWebPush(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Web push not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // For now, use VAPID-less subscription (local notifications only)
      // To enable full web push, you need to add VAPID keys
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        this.token = JSON.stringify(subscription);
        this.isInitialized = true;
        return true;
      }

      console.log('Web push subscription not available - using local notifications');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Web push initialization failed:', error);
      return false;
    }
  }

  private async initializeNativePush(): Promise<boolean> {
    // This will be activated when you add @capacitor/push-notifications
    // and configure google-services.json / GoogleService-Info.plist
    
    try {
      // Import dynamically to avoid errors when not installed
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Request permission
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        const newStatus = await PushNotifications.requestPermissions();
        if (newStatus.receive !== 'granted') {
          console.log('Push notification permission denied');
          return false;
        }
      } else if (permStatus.receive !== 'granted') {
        console.log('Push notification permission not granted');
        return false;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Listen for registration
      PushNotifications.addListener('registration', async (token) => {
        console.log('FCM Token:', token.value);
        this.token = token.value;
        await this.saveTokenToBackend(token.value);
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Registration error:', error);
      });

      // Listen for incoming notifications
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received:', notification);
        // Handle foreground notification
        this.handleForegroundNotification(notification);
      });

      // Listen for notification actions
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed:', notification);
        // Handle notification tap
        this.handleNotificationTap(notification.notification.data);
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Native push initialization failed:', error);
      // Fallback to local notifications
      this.isInitialized = true;
      return true;
    }
  }

  private async saveTokenToBackend(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user, cannot save FCM token');
        return;
      }

      const platform = this.getPlatform();

      // Store token in a custom table or edge function
      // For now, we'll store in localStorage and sync later
      const tokens = this.getSavedTokens();
      tokens[user.id] = {
        token,
        platform,
        createdAt: new Date(),
      };
      localStorage.setItem('fcm_tokens', JSON.stringify(tokens));

      console.log('FCM token saved for user:', user.id);
    } catch (error) {
      console.error('Failed to save FCM token:', error);
    }
  }

  private getSavedTokens(): Record<string, FCMToken> {
    try {
      const saved = localStorage.getItem('fcm_tokens');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  private handleForegroundNotification(notification: any): void {
    // Show a local notification or in-app alert
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title || "Reel'it", {
        body: notification.body || 'You have a new notification',
        icon: '/icons/android/icon-192x192.png',
        tag: notification.id,
      });
    }
  }

  private handleNotificationTap(data: any): void {
    // Navigate to the appropriate screen based on notification type
    if (data?.type === 'like' && data?.reelId) {
      window.location.href = `/reel/${data.reelId}`;
    } else if (data?.type === 'follow' && data?.userId) {
      window.location.href = `/user/${data.userId}`;
    } else if (data?.type === 'comment' && data?.reelId) {
      window.location.href = `/reel/${data.reelId}?comments=true`;
    } else if (data?.type === 'message') {
      window.location.href = '/inbox';
    } else {
      window.location.href = '/inbox';
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async unregister(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        await PushNotifications.removeAllListeners();
      } catch (error) {
        console.error('Failed to unregister push notifications:', error);
      }
    }
    this.token = null;
    this.isInitialized = false;
  }
}

export const fcmService = FCMService.getInstance();

// React hook for FCM
import { useState, useEffect } from 'react';

export function useFCM() {
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const success = await fcmService.initialize();
      setIsReady(success);
      setToken(fcmService.getToken());
    };

    init();

    return () => {
      // Cleanup if needed
    };
  }, []);

  return {
    isReady,
    token,
    getPlatform: () => {
      if (Capacitor.isNativePlatform()) {
        return Capacitor.getPlatform();
      }
      return 'web';
    },
  };
}
