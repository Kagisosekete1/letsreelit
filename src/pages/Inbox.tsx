import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MoreHorizontal, Heart, MessageCircle, Users } from 'lucide-react';

const Inbox = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [inboxTab, setInboxTab] = useState('messages');
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    switch (tab) {
      case 'home':
        navigate('/');
        break;
      case 'discover':
        navigate('/discover');
        break;
      case 'create':
        console.log('Open camera/video creation');
        break;
      case 'inbox':
        navigate('/inbox');
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };

  const notifications = [
    {
      id: 1,
      type: 'like',
      user: 'sarah_dance',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop&crop=face',
      action: 'liked your video',
      time: '2h',
    },
    {
      id: 2,
      type: 'follow',
      user: 'mike_fitness',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face',
      action: 'started following you',
      time: '5h',
    },
    {
      id: 3,
      type: 'comment',
      user: 'anna_art',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face',
      action: 'commented on your video',
      time: '1d',
    },
  ];

  const messages = [
    {
      id: 1,
      user: 'alex_creator',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face',
      message: 'Hey! Loved your latest dance video! 🔥',
      time: '2m',
      unread: true,
    },
    {
      id: 2,
      user: 'jenny_music',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50&h=50&fit=crop&crop=face',
      message: 'Can we collaborate on a music video?',
      time: '1h',
      unread: false,
    },
    {
      id: 3,
      user: 'brand_official',
      avatar: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=50&h=50&fit=crop&crop=face',
      message: 'We have a partnership opportunity for you!',
      time: '3h',
      unread: false,
    },
  ];

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-8 pb-20 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-6">
          <h1 className="text-xl font-bold text-foreground">Inbox</h1>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Search className="w-5 h-5 text-foreground" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-5 h-5 text-foreground" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 mb-6">
          <div className="flex space-x-1 bg-secondary rounded-xl p-1 w-full">
            <Button
              variant="ghost"
              size="sm"
              className={`flex-1 rounded-lg ${
                inboxTab === 'messages'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setInboxTab('messages')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Messages
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`flex-1 rounded-lg ${
                inboxTab === 'notifications'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setInboxTab('notifications')}
            >
              <Heart className="w-4 h-4 mr-2" />
              Activity
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4">
          {inboxTab === 'messages' ? (
            <div className="space-y-1">
              {messages.map((message) => (
                <Button
                  key={message.id}
                  variant="ghost"
                  className="w-full p-4 h-auto justify-start rounded-xl hover:bg-secondary/50"
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="relative">
                      <img
                        src={message.avatar}
                        alt={message.user}
                        className="w-12 h-12 rounded-full"
                      />
                      {message.unread && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium ${message.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {message.user}
                        </h3>
                        <span className="text-xs text-muted-foreground">{message.time}</span>
                      </div>
                      <p className={`text-sm mt-1 ${message.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {message.message}
                      </p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <Button
                  key={notification.id}
                  variant="ghost"
                  className="w-full p-4 h-auto justify-start rounded-xl hover:bg-secondary/50"
                >
                  <div className="flex items-center space-x-3 w-full">
                    <img
                      src={notification.avatar}
                      alt={notification.user}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-foreground">{notification.user}</span>
                          <span className="text-muted-foreground ml-1">{notification.action}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {notification.type === 'like' && <Heart className="w-4 h-4 text-primary" />}
                      {notification.type === 'follow' && <Users className="w-4 h-4 text-accent" />}
                      {notification.type === 'comment' && <MessageCircle className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Inbox;