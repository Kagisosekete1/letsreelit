import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '@/types/user';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserContextType {
  currentUser: UserProfile | null;
  authUser: User | null;
  loading: boolean;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data && !error) {
      setCurrentUser({
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        bio: data.bio || '',
        verified: data.verified || false,
        stats: {
          following: data.following_count || 0,
          followers: data.followers_count || 0,
          reels: data.reels_count || 0,
        },
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateUser = async (updates: Partial<UserProfile>) => {
    if (!authUser) return;

    const dbUpdates: Record<string, any> = {};
    if (updates.username) dbUpdates.username = updates.username;
    if (updates.displayName) dbUpdates.display_name = updates.displayName;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;

    await supabase.from('profiles').update(dbUpdates).eq('user_id', authUser.id);
    setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setAuthUser(null);
  };

  const followUser = (userId: string) => {
    setCurrentUser(prev => prev ? { ...prev, stats: { ...prev.stats, following: prev.stats.following + 1 } } : null);
  };

  const unfollowUser = (userId: string) => {
    setCurrentUser(prev => prev ? { ...prev, stats: { ...prev.stats, following: Math.max(0, prev.stats.following - 1) } } : null);
  };

  return (
    <UserContext.Provider value={{ currentUser, authUser, loading, updateUser, signOut, followUser, unfollowUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};