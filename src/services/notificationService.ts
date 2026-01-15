import { supabase } from '@/integrations/supabase/client';

/**
 * Service to handle sending push notifications for various events
 */

interface NotificationPayload {
  userId: string;
  fromUserId: string;
  type: 'like' | 'comment' | 'follow' | 'new_reel';
  reelId?: string;
  message?: string;
}

/**
 * Send a push notification to a user
 */
export const sendPushNotification = async (payload: NotificationPayload): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: payload,
    });

    if (error) {
      console.error('Failed to send push notification:', error);
    }
  } catch (err) {
    console.error('Error invoking push notification function:', err);
  }
};

/**
 * Send notification when someone likes a reel
 */
export const sendLikeNotification = async (
  reelOwnerId: string,
  likerId: string,
  reelId: string
): Promise<void> => {
  // Don't notify if user liked their own reel
  if (reelOwnerId === likerId) return;

  await sendPushNotification({
    userId: reelOwnerId,
    fromUserId: likerId,
    type: 'like',
    reelId,
  });
};

/**
 * Send notification when someone comments on a reel
 */
export const sendCommentNotification = async (
  reelOwnerId: string,
  commenterId: string,
  reelId: string,
  commentText: string
): Promise<void> => {
  // Don't notify if user commented on their own reel
  if (reelOwnerId === commenterId) return;

  await sendPushNotification({
    userId: reelOwnerId,
    fromUserId: commenterId,
    type: 'comment',
    reelId,
    message: commentText.slice(0, 100), // Truncate long comments
  });
};

/**
 * Send notification when someone follows a user
 */
export const sendFollowNotification = async (
  followedUserId: string,
  followerId: string
): Promise<void> => {
  await sendPushNotification({
    userId: followedUserId,
    fromUserId: followerId,
    type: 'follow',
  });
};

/**
 * Send notification to followers when a user posts a new reel
 */
export const sendNewReelNotification = async (
  creatorId: string,
  reelId: string,
  reelTitle: string
): Promise<void> => {
  try {
    // Get all followers of the creator
    const { data: followers } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', creatorId);

    if (!followers || followers.length === 0) return;

    // Send notification to each follower (limited to first 100 for performance)
    const notificationPromises = followers.slice(0, 100).map((follower) =>
      sendPushNotification({
        userId: follower.follower_id,
        fromUserId: creatorId,
        type: 'new_reel',
        reelId,
        message: reelTitle,
      })
    );

    await Promise.allSettled(notificationPromises);
  } catch (err) {
    console.error('Error sending new reel notifications:', err);
  }
};
