/**
 * OneSignal integration for Muv'it.
 *
 * - Web: uses the OneSignal Web SDK v16 loaded in `index.html`.
 * - Native (Capacitor Android/iOS): uses `onesignal-cordova-plugin` when available.
 *
 * Responsibilities:
 *   1. Initialize the SDK (web only – native init happens once the Capacitor app boots).
 *   2. Log the user in via their Supabase user id (External User ID) so backend
 *      pushes can target by user_id instead of a per-device player id.
 *   3. Persist the current player/subscription id on `profiles.onesignal_player_id`.
 *   4. Route notification-click deep links (live streams, inbox threads, reels).
 */

import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = '0b049171-0951-40ba-b90e-38fe7e06ae21';

type Deferred = (OneSignal: any) => void | Promise<void>;

declare global {
  interface Window {
    OneSignalDeferred?: Deferred[];
    OneSignal?: any;
    plugins?: { OneSignal?: any };
  }
}

const isNative = () => Capacitor.isNativePlatform();

/** Push a callback that runs once the OneSignal Web SDK is ready. */
const withWebSDK = (cb: Deferred) => {
  if (typeof window === 'undefined') return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(cb);
};

/** Handle a notification-click payload by navigating to the right in-app screen. */
export function handleNotificationOpen(data: Record<string, any> | undefined | null) {
  if (!data) return;
  try {
    // Common fields we set on outbound pushes
    const type: string | undefined = data.type;
    const url: string | undefined = data.url;
    const liveSessionId: string | undefined = data.live_session_id;
    const conversationId: string | undefined = data.conversation_id;
    const reelId: string | undefined = data.reel_id;
    const fromUserId: string | undefined = data.from_user_id;

    let target = '/';
    if (url) {
      target = url;
    } else if (type === 'message' && conversationId) {
      target = `/inbox?conversation=${conversationId}`;
    } else if ((type === 'live' || type === 'live_start') && liveSessionId) {
      target = `/?live=${liveSessionId}`;
    } else if (reelId) {
      target = `/?reel=${reelId}`;
    } else if (type === 'follow' && fromUserId) {
      target = `/profile/${fromUserId}`;
    } else if (type === 'like' || type === 'comment' || type === 'saved' || type === 'new_reel') {
      target = '/activity';
    } else if (type === 'message') {
      target = '/inbox';
    }

    // Use SPA navigation when available, otherwise fall back to a hard nav.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('onesignal:navigate', { detail: target }));
      // Fallback if no listener handled it within a tick
      setTimeout(() => {
        if (window.location.pathname + window.location.search !== target) {
          window.location.href = target;
        }
      }, 250);
    }
  } catch (err) {
    console.warn('[OneSignal] click handler error', err);
  }
}

/** Persist the current player id + external id on the user's profile. */
async function syncPlayerIdWithBackend(playerId: string | null | undefined, userId: string) {
  if (!playerId || !userId) return;
  try {
    await supabase
      .from('profiles')
      .update({ onesignal_player_id: playerId })
      .eq('user_id', userId);
  } catch (err) {
    console.warn('[OneSignal] failed to sync player id', err);
  }
}

/** Initialize the SDK. Safe to call multiple times. */
export async function initOneSignal() {
  if (typeof window === 'undefined') return;

  if (isNative()) {
    // Native (Android/iOS) initialization via onesignal-cordova-plugin
    const plugin = window.plugins?.OneSignal;
    if (!plugin) return; // plugin only present in a real device build
    try {
      plugin.initialize?.(ONESIGNAL_APP_ID);
      plugin.Notifications?.requestPermission?.(true);
      plugin.Notifications?.addEventListener?.('click', (event: any) => {
        handleNotificationOpen(event?.notification?.additionalData);
      });
    } catch (err) {
      console.warn('[OneSignal] native init failed', err);
    }
    return;
  }

  // Web SDK is initialized in index.html; here we just register listeners.
  withWebSDK(async (OneSignal) => {
    try {
      OneSignal.Notifications?.addEventListener?.('click', (event: any) => {
        handleNotificationOpen(event?.notification?.additionalData);
      });
    } catch (err) {
      console.warn('[OneSignal] web listener registration failed', err);
    }
  });
}

/** Login (associate the OneSignal identity with a Supabase user id) and sync the player id. */
export async function loginOneSignalUser(userId: string) {
  if (!userId || typeof window === 'undefined') return;

  if (isNative()) {
    const plugin = window.plugins?.OneSignal;
    if (!plugin) return;
    try {
      plugin.login?.(userId);
      const state = await new Promise<any>((resolve) => {
        try {
          plugin.User?.pushSubscription?.getIdAsync?.().then(resolve).catch(() => resolve(null));
        } catch {
          resolve(null);
        }
      });
      if (state) await syncPlayerIdWithBackend(state, userId);
    } catch (err) {
      console.warn('[OneSignal] native login failed', err);
    }
    return;
  }

  withWebSDK(async (OneSignal) => {
    try {
      await OneSignal.login(userId);
      // v16 exposes the current subscription id
      const playerId: string | undefined =
        OneSignal.User?.PushSubscription?.id ||
        (await OneSignal.User?.PushSubscription?.getIdAsync?.());
      if (playerId) await syncPlayerIdWithBackend(playerId, userId);

      // Update on subscription changes (permission granted later, id rotated, etc.)
      OneSignal.User?.PushSubscription?.addEventListener?.('change', (evt: any) => {
        const newId = evt?.current?.id;
        if (newId) syncPlayerIdWithBackend(newId, userId);
      });
    } catch (err) {
      console.warn('[OneSignal] web login failed', err);
    }
  });
}

/** Log out on sign-out so the device stops receiving that user's pushes. */
export async function logoutOneSignalUser() {
  if (typeof window === 'undefined') return;
  if (isNative()) {
    try { window.plugins?.OneSignal?.logout?.(); } catch { /* noop */ }
    return;
  }
  withWebSDK(async (OneSignal) => {
    try { await OneSignal.logout(); } catch { /* noop */ }
  });
}
