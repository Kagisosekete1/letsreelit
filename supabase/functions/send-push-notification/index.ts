import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Muv'it app icon shown on the left of every push (falls back to server-side default in OneSignal dashboard)
const APP_LOGO_URL = 'https://storage.googleapis.com/gpt-engineer-file-uploads/3IJdB71tehaMuxKUHI9gI6WMXsq1/uploads/1768602440644-Muv%27it.png';

type PushType = 'like' | 'comment' | 'follow' | 'new_reel' | 'saved' | 'message' | 'live' | 'live_start' | 'battle_challenge';

interface PushPayload {
  userId: string;
  type: PushType;
  fromUserId: string;
  reelId?: string;
  conversationId?: string;
  liveSessionId?: string;
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalRestKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload: PushPayload = await req.json();
    if (payload.fromUserId !== user.id) {
      return new Response(JSON.stringify({ error: 'Cannot send notifications as another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Rate limit
    const { count: recentCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('from_user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString());
    if ((recentCount ?? 0) > 30) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Preferences
    const { data: prefs } = await supabase
      .from('notification_preferences').select('*').eq('user_id', payload.userId).maybeSingle();
    const prefMap: Record<string, string> = {
      like: 'likes', comment: 'comments', follow: 'follows',
      new_reel: 'new_reels', saved: 'likes', message: 'messages',
      live: 'new_reels', live_start: 'new_reels', battle_challenge: 'new_reels',
    };
    const prefField = prefMap[payload.type];
    if (prefs && (prefs as any).push_enabled === false) {
      return new Response(JSON.stringify({ success: true, message: 'Push disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (prefs && prefField && (prefs as any)[prefField] === false) {
      return new Response(JSON.stringify({ success: true, message: 'Type disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: fromUser } = await supabase
      .from('profiles').select('username, display_name, avatar_url').eq('user_id', payload.fromUserId).single();
    const senderName = fromUser?.display_name || fromUser?.username || 'Someone';
    const senderAvatar = fromUser?.avatar_url || APP_LOGO_URL;

    let title = "Muv'it";
    let body = 'You have a new notification';
    switch (payload.type) {
      case 'like':     title = 'New Like ❤️'; body = `${senderName} liked your Muv`; break;
      case 'comment':  title = 'New Comment 💬'; body = payload.message ? `${senderName}: "${payload.message}"` : `${senderName} commented on your Muv`; break;
      case 'follow':   title = 'New Follower 👤'; body = `${senderName} started following you`; break;
      case 'new_reel': title = 'New Muv 🎬'; body = `${senderName} posted a new Muv`; break;
      case 'saved':    title = 'Muv Saved 🔖'; body = `${senderName} saved your Muv`; break;
      case 'message':  title = 'New Message 💬'; body = payload.message ? `${senderName}: "${payload.message}"` : `${senderName} sent you a message`; break;
      case 'live':
      case 'live_start': title = "Muv'it Live 🔴"; body = `${senderName} is live now`; break;
      case 'battle_challenge': title = 'Battle Challenge ⚔️'; body = `${senderName} challenged you to a dance battle`; break;
    }

    // In-app notification row (skip messages – they have their own thread)
    if (payload.type !== 'message') {
      await supabase.from('notifications').insert({
        user_id: payload.userId,
        from_user_id: payload.fromUserId,
        type: payload.type,
        reel_id: payload.reelId || null,
        message: body,
      });
    }

    // OneSignal push
    let pushDelivered = false;
    if (oneSignalAppId && oneSignalRestKey) {
      const additionalData: Record<string, unknown> = {
        type: payload.type,
        from_user_id: payload.fromUserId,
      };
      if (payload.reelId) additionalData.reel_id = payload.reelId;
      if (payload.conversationId) additionalData.conversation_id = payload.conversationId;
      if (payload.liveSessionId) additionalData.live_session_id = payload.liveSessionId;

      const notification = {
        app_id: oneSignalAppId,
        include_aliases: { external_id: [payload.userId] },
        target_channel: 'push',
        headings: { en: title },
        contents: { en: body },
        // Left-side icon on Android + web: sender's avatar (falls back to Muv'it logo)
        large_icon: senderAvatar,
        chrome_web_icon: senderAvatar,
        firefox_icon: senderAvatar,
        // Big picture / large media
        big_picture: senderAvatar,
        chrome_web_image: senderAvatar,
        // Small icon (Android status bar): app logo
        small_icon: 'ic_stat_onesignal_default',
        chrome_web_badge: APP_LOGO_URL,
        data: additionalData,
      };

      try {
        const resp = await fetch('https://api.onesignal.com/notifications?c=push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${oneSignalRestKey}`,
          },
          body: JSON.stringify(notification),
        });
        const respBody = await resp.text();
        console.log('OneSignal response', resp.status, respBody);
        pushDelivered = resp.ok;
      } catch (err) {
        console.error('OneSignal send failed', err);
      }
    } else {
      console.warn('OneSignal env vars missing – skipping push delivery');
    }

    return new Response(
      JSON.stringify({ success: true, pushDelivered, title, body }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
