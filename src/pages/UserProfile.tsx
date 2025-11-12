import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreVertical, Grid3X3, Video, Bookmark, AlertCircle, Ban } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { mockReels } from '@/data/mockData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const UserProfileMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-6 h-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <AlertCircle className="w-4 h-4 mr-2" />
          Report
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <Ban className="w-4 h-4 mr-2" />
          Block
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const UserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { currentUser, followUser, unfollowUser } = useUser();
  const [activeTab, setActiveTab] = useState('profile');
  const [contentTab, setContentTab] = useState('reels');
  
  // Find user from mock data
  const userReel = mockReels.find(r => r.user.username === username);
  const user = userReel?.user;
  
  const [isFollowing, setIsFollowing] = useState(false);

  if (!user) {
    return <div>User not found</div>;
  }

  const handleFollow = () => {
    if (isFollowing) {
      unfollowUser(user.id);
      setIsFollowing(false);
    } else {
      followUser(user.id);
      setIsFollowing(true);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'home':
        navigate('/');
        break;
      case 'tutorials':
        navigate('/tutorials');
        break;
      case 'inbox':
        navigate('/inbox');
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-4 pb-20 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold">@{user.username}</h1>
          <UserProfileMenu />
        </div>

        {/* Profile Info */}
        <div className="px-4 mb-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-3">
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-24 h-24 rounded-full object-cover border-2 border-border"
              />
              {user.verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs text-primary-foreground font-bold">✓</span>
                </div>
              )}
            </div>
            
            <h2 className="text-xl font-bold mb-1">{user.displayName || `@${user.username}`}</h2>
            <p className="text-muted-foreground text-sm mb-4">Dance Creator ✨</p>
            
            {/* Stats */}
            <div className="flex items-center gap-6 mb-4">
              <Button 
                variant="ghost" 
                className="text-center flex flex-col items-center p-2 hover:bg-secondary/50 rounded-lg"
                onClick={() => console.log('View following')}
              >
                <p className="text-lg font-bold">0</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </Button>
              <Button 
                variant="ghost" 
                className="text-center flex flex-col items-center p-2 hover:bg-secondary/50 rounded-lg"
                onClick={() => console.log('View followers')}
              >
                <p className="text-lg font-bold">{user.followers?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </Button>
              <Button 
                variant="ghost" 
                className="text-center flex flex-col items-center p-2 hover:bg-secondary/50 rounded-lg"
                onClick={() => setContentTab('reels')}
              >
                <p className="text-lg font-bold">0</p>
                <p className="text-xs text-muted-foreground">Reels</p>
              </Button>
            </div>

            {/* Action Button */}
            <Button 
              className="w-full" 
              variant={isFollowing ? "outline" : "default"}
              onClick={handleFollow}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="border-t border-border">
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              className={`flex-1 py-3 rounded-none ${
                contentTab === 'reels' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
              onClick={() => setContentTab('reels')}
            >
              <Grid3X3 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className={`flex-1 py-3 rounded-none ${
                contentTab === 'tutorials' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
              onClick={() => setContentTab('tutorials')}
            >
              <Video className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className={`flex-1 py-3 rounded-none ${
                contentTab === 'saved' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
              onClick={() => setContentTab('saved')}
            >
              <Bookmark className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-3 gap-0.5 px-0.5 pt-0.5">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square bg-muted relative overflow-hidden"
            >
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
            </div>
          ))}
        </div>
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default UserProfile;
