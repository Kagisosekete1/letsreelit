import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send, Check, CheckCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import MessageDeletePopover from './MessageDeletePopover';
import MentionInput from '@/components/ui/MentionInput';

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
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showDeleteConversation, setShowDeleteConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setMessages([]);
      } else {
        // Filter out any null/undefined messages
        setMessages((data || []).filter(msg => msg && msg.id && msg.content));
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

    // Subscribe to new messages and read status updates
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Update read status in real-time
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id 
              ? { ...msg, is_read: (payload.new as Message).is_read }
              : msg
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
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

  const handleDeleteMessage = async (messageId: string) => {
    // Immediately remove from UI (optimistic)
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setSelectedMessageId(null);
    
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive'
      });
      // Refetch to restore state if delete failed
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      setMessages((data || []).filter(msg => msg && msg.id && msg.content));
    } else {
      toast({ title: 'Deleted', description: 'Message removed.' });
    }
  };

  const handleDeleteConversation = async () => {
    if (!authUser) return;

    try {
      await supabase.from('messages').delete().eq('conversation_id', conversationId);
      await supabase.from('conversations').delete().eq('id', conversationId);
      toast({ title: 'Chat deleted', description: 'The conversation has been removed.' });
      setMessages([]);
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete chat',
        variant: 'destructive',
      });
    }
    setShowDeleteConversation(false);
  };

  const handleMessageLongPressStart = (messageId: string) => {
    longPressTimer.current = setTimeout(() => {
      setSelectedMessageId(messageId);
    }, 500);
  };

  const handleMessageLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleHeaderLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowDeleteConversation(true);
    }, 500);
  };

  const handleHeaderLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b flex flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="w-10 h-10">
              <AvatarImage src={otherUser.avatar_url || ''} />
              <AvatarFallback>{otherUser.display_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold truncate">{otherUser.display_name}</DialogTitle>
              <p className="text-xs text-muted-foreground truncate">@{otherUser.username}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (window.confirm('Delete this entire chat for both users? This cannot be undone.')) {
                handleDeleteConversation();
              }
            }}
            aria-label="Delete chat"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-5 h-5" />
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

              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} group select-none`}
                >
                  <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'} max-w-[85%]`}>
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-secondary text-foreground rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] opacity-70">{formatTime(message.created_at)}</span>
                        {isMe && (
                          message.is_read ? (
                            <CheckCheck className="w-3 h-3" />
                          ) : (
                            <Check className="w-3 h-3 opacity-70" />
                          )
                        )}
                      </div>
                    </div>
                    {isMe && (
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this message for both users?')) {
                            handleDeleteMessage(message.id);
                          }
                        }}
                        aria-label="Delete message"
                        className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-70"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t flex gap-2">
          <MentionInput
            value={newMessage}
            onChange={setNewMessage}
            onSubmit={handleSend}
            placeholder="Type a message..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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