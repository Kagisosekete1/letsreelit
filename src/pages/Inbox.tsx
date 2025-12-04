import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Search, MessageCircle, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CreateReelModal from '@/components/CreateReelModal';

const Inbox = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [inboxTab, setInboxTab] = useState('messages');
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    switch (tab) {
      case 'home':
        navigate('/');
        break;
      case 'tutorials':
        navigate('/tutorials');
        break;
      case 'create':
        setIsCreateReelOpen(true);
        break;
      case 'inbox':
        navigate('/inbox');
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };

  const handleSearch = () => {
    toast({
      title: "Search",
      description: "Search functionality coming soon!",
    });
  };

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pt-8 pb-20 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-6">
          <h1 className="text-xl font-bold text-foreground">Inbox</h1>
          <Button variant="ghost" size="sm" onClick={handleSearch}>
            <Search className="w-5 h-5 text-foreground" />
          </Button>
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

        {/* Empty Content */}
        <div className="px-4">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
              {inboxTab === 'messages' ? (
                <MessageCircle className="w-10 h-10 text-muted-foreground" />
              ) : (
                <Heart className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <h2 className="text-lg font-semibold mb-2">
              {inboxTab === 'messages' ? 'No messages yet' : 'No activity yet'}
            </h2>
            <p className="text-muted-foreground text-center text-sm">
              {inboxTab === 'messages' 
                ? 'When you receive messages, they will appear here.'
                : 'When someone interacts with your content, you\'ll see it here.'}
            </p>
          </div>
        </div>
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      
      <CreateReelModal isOpen={isCreateReelOpen} onClose={() => setIsCreateReelOpen(false)} />
    </div>
  );
};

export default Inbox;