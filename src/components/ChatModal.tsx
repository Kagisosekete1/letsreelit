import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send, CheckCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  otherUser: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, conversationId, otherUser }) => {
  const { authUser } = useUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen || !conversationId) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    };

    fetchMessages();

    // Mark messages as read
    const markAsRead = async () => {
      if (authUser) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', authUser.id);
      }
    };
    markAsRead();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          // Mark as read if not from current user
          if (authUser && payload.new.sender_id !== authUser.id) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, conversationId, authUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !authUser) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: authUser.id,
        content: messageContent
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
      setNewMessage(messageContent);
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDeleteConversation = async () => {
    if (!authUser) return;

    const confirmed = window.confirm('Delete this entire chat? This will remove all messages.');
    if (!confirmed) return;

    // Best-effort: delete messages first, then the conversation
    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (msgError) {
      toast({
        title: 'Error',
        description: 'Failed to delete messages',
        variant: 'destructive',
      });
      return;
    }

    const { error: convError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (convError) {
      toast({
        title: 'Error',
        description: 'Failed to delete chat',
        variant: 'destructive',
      });
      return;
    }

    setMessages([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b flex flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={otherUser.avatar_url || ''} />
            <AvatarFallback>{otherUser.display_name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <DialogTitle className="text-base font-semibold">{otherUser.display_name}</DialogTitle>
            <p className="text-xs text-muted-foreground">@{otherUser.username}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteConversation}
            title="Delete chat"
          >
            <Trash2 className="w-5 h-5 text-muted-foreground" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-center">
                No messages yet.<br />Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isMe = message.sender_id === authUser?.id;
              
              const handleDeleteMessage = async () => {
                const { error } = await supabase
                  .from('messages')
                  .delete()
                  .eq('id', message.id);
                
                if (error) {
                  toast({
                    title: 'Error',
                    description: 'Failed to delete message',
                    variant: 'destructive'
                  });
                } else {
                  setMessages(prev => prev.filter(m => m.id !== message.id));
                }
              };

              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-secondary text-foreground rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] opacity-70">{formatTime(message.created_at)}</span>
                        {isMe && message.is_read && (
                          <CheckCheck className="w-3 h-3 opacity-70" />
                        )}
                      </div>
                    </div>
                    {isMe && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleDeleteMessage}
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;