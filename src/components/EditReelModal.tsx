import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EditReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  reel: {
    id: string;
    title: string;
    description?: string;
  } | null;
  onUpdate?: () => void;
}

const EditReelModal: React.FC<EditReelModalProps> = ({ isOpen, onClose, reel, onUpdate }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reel) {
      setTitle(reel.title || '');
      setDescription(reel.description || '');
    }
  }, [reel]);

  const handleSave = async () => {
    if (!reel) return;
    
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your Muv.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('reels')
        .update({
          title: title.trim(),
          description: description.trim() || null,
        })
        .eq('id', reel.id);

      if (error) throw error;

      toast({
        title: 'Muv updated',
        description: 'Your Muv has been updated successfully.',
      });

      onUpdate?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Could not update Muv.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border rounded-3xl">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground">Edit Muv</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter Muv title"
              className="rounded-xl"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/100
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description & Hashtags
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description and hashtags like #dance #hiphop"
              className="rounded-xl resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          <div className="bg-secondary/30 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              💡 Tip: Use hashtags like #dance #challenge to help others discover your Muv.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-xl"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditReelModal;
