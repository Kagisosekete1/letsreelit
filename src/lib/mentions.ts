import { supabase } from '@/integrations/supabase/client';

const MENTION_RE = /@([a-zA-Z0-9_.]{2,30})/g;

export function extractMentions(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) {
    found.add(m[1].toLowerCase());
  }
  return [...found];
}

/**
 * Detect @usernames in `text` and create a `mention` notification for each.
 * Silently no-ops on errors so callers don't need try/catch.
 */
export async function notifyMentions(opts: {
  text: string;
  fromUserId: string;
  context: 'post' | 'comment' | 'message';
  reelId?: string | null;
}) {
  const usernames = extractMentions(opts.text);
  if (!usernames.length) return;

  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('username', usernames);

    if (!profiles?.length) return;

    const rows = profiles
      .filter((p) => p.user_id !== opts.fromUserId)
      .map((p) => ({
        user_id: p.user_id,
        from_user_id: opts.fromUserId,
        type: 'mention',
        reel_id: opts.reelId ?? null,
        message:
          opts.context === 'post'
            ? 'mentioned you in a post'
            : opts.context === 'comment'
            ? 'mentioned you in a comment'
            : 'mentioned you in a message',
      }));
    if (rows.length) {
      await supabase.from('notifications').insert(rows);
    }
  } catch (e) {
    console.warn('notifyMentions failed', e);
  }
}
