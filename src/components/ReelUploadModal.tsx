import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { X, Scissors, Sparkles, Upload, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { reelSchema } from '@/lib/validations';

interface ReelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoFile: File;
}

const ReelUploadModal: React.FC<ReelUploadModalProps> = ({ isOpen, onClose, videoFile }) => {
  const { toast } = useToast();
  const { authUser, currentUser } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [step, setStep] = useState<'edit' | 'details' | 'uploading'>('edit');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);

  const handleRecordReel = () => {
    toast({
      title: "Record Reel",
      description: "Crop & trim feature coming soon!",
    });
  };

  const handleFiltersEffects = () => {
    toast({
      title: "Filters & Effects",
      description: "Filters feature coming soon!",
    });
  };

  const validateForm = () => {
    const result = reelSchema.safeParse({ title, description });
    if (!result.success) {
      const fieldErrors: { title?: string; description?: string } = {};
      result.error.issues.forEach(err => {
        if (err.path[0] === 'title') fieldErrors.title = err.message;
        if (err.path[0] === 'description') fieldErrors.description = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleUpload = async () => {
    if (!authUser || !currentUser) {
      toast({ title: "Error", description: "Please sign in to upload", variant: "destructive" });
      return;
    }

    if (!validateForm()) return;

    setStep('uploading');
    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload video to storage
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reels')
        .upload(fileName, videoFile);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reels')
        .getPublicUrl(fileName);

      setUploadProgress(95);

      // Create reel record in database
      const { error: dbError } = await supabase
        .from('reels')
        .insert({
          user_id: authUser.id,
          title: title.trim(),
          description: description.trim() || null,
          video_url: publicUrl,
          is_portrait: true,
        });

      if (dbError) throw dbError;

      setUploadProgress(100);

      toast({
        title: "Reel uploaded!",
        description: "Your reel is now live.",
      });

      setTimeout(() => {
        onClose();
      }, 500);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload reel",
        variant: "destructive",
      });
      setStep('details');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            {step !== 'edit' && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step === 'uploading' ? 'details' : 'edit')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <DialogTitle className="flex-1 text-center">
              {step === 'edit' && 'Edit Reel'}
              {step === 'details' && 'Reel Details'}
              {step === 'uploading' && 'Uploading...'}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={uploading}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {step === 'edit' && (
          <div className="space-y-4 py-4">
            {/* Video Preview */}
            <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden max-h-64">
              <video
                ref={videoRef}
                src={videoPreviewUrl}
                className="w-full h-full object-contain"
                controls
                playsInline
              />
            </div>

            {/* Edit Options */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-auto py-4 justify-start"
                onClick={handleRecordReel}
              >
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mr-3">
                  <Scissors className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Record Reel</p>
                  <p className="text-sm text-muted-foreground">Crop & trim your video</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto py-4 justify-start"
                onClick={handleFiltersEffects}
              >
                <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center mr-3">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Filters & Effects</p>
                  <p className="text-sm text-muted-foreground">Add stunning filters</p>
                </div>
              </Button>
            </div>

            <Button className="w-full" onClick={() => setStep('details')}>
              Next
            </Button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4 py-4">
            {/* Video Thumbnail Preview */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              <video
                src={videoPreviewUrl}
                className="w-full h-full object-contain"
                muted
              />
            </div>

            <div className="space-y-3">
              <div>
                <Input
                  placeholder="Add a title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="rounded-xl"
                />
                {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
              </div>
              <div>
                <Textarea
                  placeholder="Add a description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  className="rounded-xl resize-none"
                  rows={3}
                />
                {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
              </div>
            </div>

            <Button className="w-full" onClick={handleUpload} disabled={!title.trim()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Reel
            </Button>
          </div>
        )}

        {step === 'uploading' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <p className="text-lg font-semibold mb-2">Uploading your reel...</p>
              <p className="text-sm text-muted-foreground mb-4">{uploadProgress}%</p>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReelUploadModal;
