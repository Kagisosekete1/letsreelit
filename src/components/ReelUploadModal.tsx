import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { X, Scissors, Sparkles, Upload, ArrowLeft, Check, Music2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { reelSchema } from '@/lib/validations';
import { generateThumbnail } from '@/lib/thumbnailGenerator';
import MusicLibraryModal, { type PlaceholderSong } from '@/components/MusicLibraryModal';

interface ReelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoFile: File;
}

const FILTERS = [
  { name: 'None', class: '', preview: 'N' },
  { name: 'Warm', class: 'sepia(30%) saturate(140%)', preview: 'W' },
  { name: 'Cool', class: 'hue-rotate(180deg) saturate(80%)', preview: 'C' },
  { name: 'Vintage', class: 'sepia(50%) contrast(90%)', preview: 'V' },
  { name: 'B&W', class: 'grayscale(100%)', preview: 'BW' },
  { name: 'Vivid', class: 'saturate(200%) contrast(110%)', preview: 'Vi' },
  { name: 'Fade', class: 'brightness(110%) contrast(90%) saturate(80%)', preview: 'F' },
  { name: 'Drama', class: 'contrast(130%) brightness(90%)', preview: 'D' },
];

const ReelUploadModal: React.FC<ReelUploadModalProps> = ({ isOpen, onClose, videoFile }) => {
  const { toast } = useToast();
  const { authUser, currentUser, refreshProfile } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [step, setStep] = useState<'edit' | 'crop' | 'filters' | 'details' | 'uploading'>('edit');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [cropStart, setCropStart] = useState(0);
  const [cropEnd, setCropEnd] = useState(100);
  const [videoDuration, setVideoDuration] = useState(0);
  const [postAs, setPostAs] = useState<'reel' | 'tutorial'>('reel');
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [selectedSong, setSelectedSong] = useState<PlaceholderSong | null>(null);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);

  useEffect(() => {
    if (videoRef.current && videoPreviewUrl) {
      videoRef.current.onloadedmetadata = () => {
        setVideoDuration(videoRef.current?.duration || 0);
      };
    }
  }, [videoPreviewUrl]);

  const handleCropReel = () => {
    setStep('crop');
  };

  const handleFiltersEffects = () => {
    setStep('filters');
  };

  const applyCropTrim = () => {
    toast({
      title: "Crop Applied",
      description: `Video trimmed from ${formatTime(cropStart * videoDuration / 100)} to ${formatTime(cropEnd * videoDuration / 100)}`,
    });
    setStep('edit');
  };

  const applyFilter = () => {
    toast({
      title: "Filter Applied",
      description: `${FILTERS[selectedFilter].name} filter applied to your reel`,
    });
    setStep('edit');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      // Step 1: Generate thumbnail from video
      setUploadProgress(10);
      let thumbnailUrl: string | null = null;
      
      try {
        const thumbnailBlob = await generateThumbnail(videoFile, 1);
        const thumbnailFileName = `${authUser.id}/${Date.now()}_thumb.jpg`;
        
        setUploadProgress(20);
        
        const { data: thumbUpload, error: thumbError } = await supabase.storage
          .from('reels')
          .upload(thumbnailFileName, thumbnailBlob, {
            contentType: 'image/jpeg',
          });
        
        if (!thumbError && thumbUpload) {
          const { data: { publicUrl } } = supabase.storage
            .from('reels')
            .getPublicUrl(thumbnailFileName);
          thumbnailUrl = publicUrl;
        }
      } catch (thumbErr) {
        console.warn('Thumbnail generation failed, continuing without thumbnail:', thumbErr);
      }

      setUploadProgress(30);

      // Step 2: Upload video to storage
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reels')
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reels')
        .getPublicUrl(fileName);

      setUploadProgress(80);

      // Step 3: Create reel record in database with thumbnail
      const { error: dbError } = await supabase
        .from('reels')
        .insert({
          user_id: authUser.id,
          title: title.trim(),
          description: description.trim() || null,
          video_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          is_portrait: true,
          is_tutorial: postAs === 'tutorial',
        });

      if (dbError) throw dbError;

      setUploadProgress(95);

      // Update user's reel count
      await supabase
        .from('profiles')
        .update({ reels_count: (currentUser.stats.reels || 0) + 1 })
        .eq('user_id', authUser.id);

      // Refresh profile to update reel count
      await refreshProfile();

      setUploadProgress(100);

      toast({
        title: postAs === 'reel' ? "Muv uploaded!" : "Tutorial Muv uploaded!",
        description: `Your ${postAs === 'reel' ? 'Muv' : 'Tutorial Muv'} is now live.`,
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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <div className="flex items-center">
            {step !== 'edit' && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step === 'uploading' ? 'details' : 'edit')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <DialogTitle className="flex-1 text-center">
              {step === 'edit' && 'Edit Muv'}
              {step === 'crop' && 'Crop Muv'}
              {step === 'filters' && 'Filters & Effects'}
              {step === 'details' && 'Muv Details'}
              {step === 'uploading' && 'Uploading...'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {step === 'edit' && (
          <div className="space-y-4 py-4">
            {/* Video Preview */}
            <div 
              className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden max-h-64"
              style={{ filter: FILTERS[selectedFilter].class }}
            >
              <video
                ref={videoRef}
                src={videoPreviewUrl}
                className="w-full h-full object-contain"
                controls
                playsInline
                onClick={(e) => {
                  const video = e.currentTarget;
                  if (video.paused) {
                    video.play().catch(() => {});
                  } else {
                    video.pause();
                  }
                }}
              />
            </div>

            {/* Edit Options */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-auto py-4 justify-start rounded-2xl"
                onClick={handleCropReel}
              >
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mr-3">
                  <Scissors className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Crop Reel</p>
                  <p className="text-sm text-muted-foreground">Crop & trim your video</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto py-4 justify-start rounded-2xl"
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

            <Button className="w-full rounded-xl" onClick={() => setStep('details')}>
              Next
            </Button>
          </div>
        )}

        {step === 'crop' && (
          <div className="space-y-4 py-4">
            <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden max-h-64">
              <video
                ref={videoRef}
                src={videoPreviewUrl}
                className="w-full h-full object-contain"
                controls
                playsInline
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Trim Start: {formatTime(cropStart * videoDuration / 100)}</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropStart}
                  onChange={(e) => setCropStart(Math.min(Number(e.target.value), cropEnd - 5))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Trim End: {formatTime(cropEnd * videoDuration / 100)}</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropEnd}
                  onChange={(e) => setCropEnd(Math.max(Number(e.target.value), cropStart + 5))}
                  className="w-full accent-primary"
                />
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Duration: {formatTime((cropEnd - cropStart) * videoDuration / 100)}
              </p>
            </div>

            <Button className="w-full rounded-xl" onClick={applyCropTrim}>
              <Check className="w-4 h-4 mr-2" />
              Apply Crop
            </Button>
          </div>
        )}

        {step === 'filters' && (
          <div className="space-y-4 py-4">
            <div 
              className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden max-h-64"
              style={{ filter: FILTERS[selectedFilter].class }}
            >
              <video
                src={videoPreviewUrl}
                className="w-full h-full object-contain"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {FILTERS.map((filter, index) => (
                <Button
                  key={filter.name}
                  variant={selectedFilter === index ? "default" : "outline"}
                  className={`flex flex-col items-center p-2 h-auto rounded-xl ${
                    selectedFilter === index ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedFilter(index)}
                >
                  <span className="text-lg mb-1">{filter.preview}</span>
                  <span className="text-xs">{filter.name}</span>
                </Button>
              ))}
            </div>

            <Button className="w-full rounded-xl" onClick={applyFilter}>
              <Check className="w-4 h-4 mr-2" />
              Apply Filter
            </Button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4 py-4">
            {/* Video Preview - Playable */}
            <div 
              className="relative aspect-video bg-black rounded-xl overflow-hidden"
              style={{ filter: FILTERS[selectedFilter].class }}
            >
              <video
                src={videoPreviewUrl}
                className="w-full h-full object-contain"
                controls
                playsInline
                onClick={(e) => {
                  const video = e.currentTarget;
                  if (video.paused) {
                    video.play().catch(() => {});
                  } else {
                    video.pause();
                  }
                }}
              />
            </div>

            <div className="space-y-3">
              {/* Music (placeholder UI for future platform integration) */}
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between rounded-2xl"
                onClick={() => setShowMusicLibrary(true)}
              >
                <div className="flex items-center gap-2">
                  <Music2 className="w-4 h-4" />
                  <span className="font-medium">Add sound</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {selectedSong ? `${selectedSong.title} • ${selectedSong.artist}` : 'Choose'}
                </span>
              </Button>

              {selectedSong && (
                <div className="text-xs text-muted-foreground px-1">
                  Selected: <span className="font-medium text-foreground">{selectedSong.title}</span> — {selectedSong.artist}
                </div>
              )}

              <div>
                <Input
                  placeholder="Add Caption..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="rounded-xl"
                />
                {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
              </div>
              <div className="relative">
                <Textarea
                  placeholder="Add Hashtags..."
                  value={description}
                  onChange={(e) => {
                    if (e.target.value.length <= 50) {
                      setDescription(e.target.value);
                    }
                  }}
                  maxLength={50}
                  className="rounded-xl resize-none"
                  rows={2}
                />
                <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                  {description.length}/50
                </span>
                {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
              </div>

              {/* Post As Selection */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Post as:</p>
                <div className="flex gap-2">
                  <Button
                    variant={postAs === 'reel' ? 'default' : 'outline'}
                    className="flex-1 rounded-xl"
                    onClick={() => setPostAs('reel')}
                  >
                    Muv
                  </Button>
                  <Button
                    variant={postAs === 'tutorial' ? 'default' : 'outline'}
                    className="flex-1 rounded-xl"
                    onClick={() => setPostAs('tutorial')}
                  >
                    Tutorial
                  </Button>
                </div>
              </div>
            </div>

            <Button className="w-full rounded-xl" onClick={handleUpload} disabled={!title.trim()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload {postAs === 'reel' ? 'Muv' : 'Tutorial Muv'}
            </Button>

            <MusicLibraryModal
              isOpen={showMusicLibrary}
              onClose={() => setShowMusicLibrary(false)}
              onSelect={(song) => {
                setSelectedSong(song);
                toast({
                  title: 'Sound selected',
                  description: `${song.title} — ${song.artist}`,
                });
              }}
            />
          </div>
        )}

        {step === 'uploading' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <p className="text-lg font-semibold mb-2">Uploading your {postAs}...</p>
              <p className="text-sm text-muted-foreground mb-4">{uploadProgress}%</p>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};

export default ReelUploadModal;