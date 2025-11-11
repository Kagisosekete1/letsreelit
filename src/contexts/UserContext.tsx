import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile } from '@/types/user';

interface UserContextType {
  currentUser: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const initialUser: UserProfile = {
  id: 'current_user',
  username: 'yourhandle',
  displayName: 'Your Name',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face',
  bio: '✨ Content Creator | Dance Lover',
  verified: true,
  stats: {
    following: 0,
    followers: 0,
    reels: 0,
  },
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);

  const updateUser = (updates: Partial<UserProfile>) => {
    setCurrentUser(prev => ({
      ...prev,
      ...updates,
      stats: updates.stats ? { ...prev.stats, ...updates.stats } : prev.stats,
    }));
  };

  const followUser = (userId: string) => {
    setCurrentUser(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        following: prev.stats.following + 1,
      },
    }));
  };

  const unfollowUser = (userId: string) => {
    setCurrentUser(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        following: Math.max(0, prev.stats.following - 1),
      },
    }));
  };

  return (
    <UserContext.Provider value={{ currentUser, updateUser, followUser, unfollowUser }}>
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
