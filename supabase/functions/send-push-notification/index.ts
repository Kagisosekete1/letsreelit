import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'new_reel' | 'saved' | 'message';
  fromUserId: string;
  reelId?: string;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: PushPayload = await req.json();

    // Caller may only send notifications as themselves
    if (payload.fromUserId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot send notifications as another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic rate limit: max 30 outgoing notifications per minute per user
    const { count: recentCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('from_user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString());
    if ((recentCount ?? 0) > 30) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Push notification request:', payload);

    // Check if the target user has this notification type enabled
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', payload.userId)
      .maybeSingle();

    // Map notification type to preference field
    const prefMap: Record<string, string> = {
      like: 'likes',
      comment: 'comments',
      follow: 'follows',
      new_reel: 'new_reels',
      saved: 'likes', // Treat saved as likes category
      message: 'messages',
    };

    const prefField = prefMap[payload.type] as keyof typeof prefs || 'push_enabled';
    
    // If user has preferences and this type is disabled, skip
    if (prefs && prefs[prefField] === false) {
      console.log(`User has ${payload.type} notifications disabled`);
      return new Response(
        JSON.stringify({ success: true, message: 'Notification type disabled by user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if push is enabled globally
    if (prefs && prefs.push_enabled === false) {
      console.log('User has push notifications disabled');
      return new Response(
        JSON.stringify({ success: true, message: 'Push notifications disabled by user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's FCM tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', payload.userId);

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      // Continue to create in-app notification even if no push tokens
    }

    // Get sender's profile
    const { data: fromUser } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('user_id', payload.fromUserId)
      .single();

    const senderName = fromUser?.display_name || fromUser?.username || 'Someone';

    // Build notification content based on type
    let title = '';
    let body = '';

    switch (payload.type) {
      case 'like':
        title = 'New Like ❤️';
        body = `${senderName} liked your reel`;
        break;
      case 'comment':
        title = 'New Comment 💬';
        body = payload.message ? `${senderName}: "${payload.message}"` : `${senderName} commented on your reel`;
        break;
      case 'follow':
        title = 'New Follower 👤';
        body = `${senderName} started following you`;
        break;
      case 'new_reel':
        title = 'New Reel 🎬';
        body = `${senderName} posted a new reel`;
        break;
      case 'saved':
        title = 'Reel Saved 🔖';
        body = `${senderName} saved your reel`;
        break;
      case 'message':
        title = 'New Message 💬';
        body = payload.message ? `${senderName}: "${payload.message}"` : `${senderName} sent you a message`;
        break;
      default:
        title = "Muv'it";
        body = 'You have a new notification';
    }

    console.log('Sending notification:', { title, body, tokensCount: tokens?.length || 0 });

    // Create in-app notification record (except for messages which have their own system)
    if (payload.type !== 'message') {
      await supabase.from('notifications').insert({
        user_id: payload.userId,
        from_user_id: payload.fromUserId,
        type: payload.type,
        reel_id: payload.reelId || null,
        message: body,
      });
    }

    // TODO: When FCM is fully configured with Firebase Admin SDK,
    // send actual push notifications to registered tokens here

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent',
        data: { title, body, tokensCount: tokens?.length || 0 }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
