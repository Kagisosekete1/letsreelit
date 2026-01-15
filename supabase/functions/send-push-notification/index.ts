import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'new_reel' | 'saved' | 'duet' | 'profile_view';
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    console.log('Push notification request:', payload);

    // Get user's FCM tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', payload.userId);

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('No FCM tokens found for user:', payload.userId);
      return new Response(
        JSON.stringify({ success: true, message: 'No tokens registered' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      case 'duet':
        title = 'New Duet 🎭';
        body = `${senderName} created a duet with your reel`;
        break;
      case 'profile_view':
        title = 'Profile View 👀';
        body = `${senderName} viewed your profile`;
        break;
      default:
        title = "Reel'it";
        body = 'You have a new notification';
    }

    console.log('Sending notification:', { title, body, tokens: tokens.length });

    // For now, we'll store the notification in the database
    // Real FCM would require Firebase Admin SDK
    // This is a placeholder for when FCM is fully configured
    
    // Create notification record
    await supabase.from('notifications').insert({
      user_id: payload.userId,
      from_user_id: payload.fromUserId,
      type: payload.type,
      reel_id: payload.reelId || null,
      message: body,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent',
        data: { title, body, tokensCount: tokens.length }
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
