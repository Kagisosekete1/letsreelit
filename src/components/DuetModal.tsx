import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Video, VideoOff, Mic, MicOff, RotateCcw, Play, Pause, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { Progress } from '@/components/ui/progress';
import { useAudio } from '@/contexts/AudioContext';

interface DuetModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalReel: {
    id: string;
    videoUrl: string;
    title: string;
    user: {
      username: string;
      avatarUrl: string;
    };
  };
}

const DuetModal: React.FC<DuetModalProps> = ({ isOpen, onClose, originalReel }) => {
  const { toast } = useToast();
  const { authUser, currentUser } = useUser();
  const { forceCleanupAll } = useAudio();
  
  const [step, setStep] = useState<'setup' | 'recording' | 'preview' | 'uploading'>('setup');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewOriginalRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup all background audio when modal opens
  useEffect(() => {
    if (isOpen) {
      forceCleanupAll();
    }
  }, [isOpen, forceCleanupAll]);

  // Setup camera - always use front camera (selfie) for duets
  useEffect(() => {
    if (isOpen && step === 'setup') {
      setupCamera();
    }
    
    return () => {
      if (!isOpen) {
        stopCamera();
      }
    };
  }, [isOpen, step]);

  const setupCamera = async () => {
    try {
      // Stop any existing stream first
      stopCamera();
      setCameraReady(false);
      
      // Always use front camera (user facing) for duets
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 720 }, 
          height: { ideal: 1280 } 
        },
        audio: true,
      });
      
      streamRef.current = stream;
      
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
        userVideoRef.current.muted = true;
        
        // Wait for video to be ready
        userVideoRef.current.onloadedmetadata = async () => {
          try {
            await userVideoRef.current?.play();
            setCameraReady(true);
          } catch (e) {
            console.error('Camera play error:', e);
          }
        };
      }

      // Set initial mic state
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMicOn;
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (userVideoRef.current) {
      userVideoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) {
      await setupCamera();
      // Wait for camera to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!streamRef.current) return;
    }

    // Reset and prepare original video
    if (originalVideoRef.current) {
      originalVideoRef.current.currentTime = 0;
      originalVideoRef.current.muted = false;
      originalVideoRef.current.volume = 1;
    }

    chunksRef.current = [];
    
    try {
      // Determine supported mime type
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        setStep('preview');
        stopCamera();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording and play original video simultaneously
      mediaRecorder.start(100);
      setIsRecording(true);
      setStep('recording');

      // Play original video after a tiny delay to sync
      setTimeout(() => {
        originalVideoRef.current?.play().catch(console.error);
      }, 50);

    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: 'Recording Error',
        description: 'Could not start recording. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Stop recording error:', e);
      }
      setIsRecording(false);
      
      if (originalVideoRef.current) {
        originalVideoRef.current.pause();
        originalVideoRef.current.muted = true;
      }
    }
  };

  const retakeRecording = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setIsPlaying(false);
    setStep('setup');
    
    // Small delay before setting up camera again
    setTimeout(() => {
      setupCamera();
    }, 100);
  };

  const togglePreviewPlay = () => {
    const preview = previewVideoRef.current;
    const original = previewOriginalRef.current;
    
    if (preview && original) {
      if (isPlaying) {
        preview.pause();
        original.pause();
      } else {
        preview.currentTime = 0;
        original.currentTime = 0;
        preview.play().catch(() => {});
        original.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleUpload = async () => {
    if (!recordedBlob || !authUser || !currentUser) {
      toast({ title: 'Error', description: 'Please sign in to upload', variant: 'destructive' });
      return;
    }

    setStep('uploading');
    setUploadProgress(0);

    try {
      // Upload user's recording
      const fileName = `duets/${authUser.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('reels')
        .upload(fileName, recordedBlob, {
          contentType: 'video/webm',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      setUploadProgress(50);

      // Get public URL
      const { data: urlData } = supabase.storage.from('reels').getPublicUrl(fileName);
      setUploadProgress(70);

      // Create reel entry
      const { error: reelError } = await supabase.from('reels').insert({
        user_id: authUser.id,
        title: `Duet with @${originalReel.user.username}`,
        description: `#duet with @${originalReel.user.username} • Original: ${originalReel.title}`,
        video_url: urlData.publicUrl,
        is_portrait: true,
      });

      if (reelError) throw reelError;
      setUploadProgress(90);

      // Update user's reel count
      await supabase
        .from('profiles')
        .update({ reels_count: (currentUser.stats?.reels || 0) + 1 })
        .eq('id', currentUser.id);

      setUploadProgress(100);

      toast({
        title: 'Duet uploaded!',
        description: 'Your duet has been posted successfully.',
      });

      handleClose();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Could not upload duet',
        variant: 'destructive',
      });
      setStep('preview');
    }
  };

  const handleClose = () => {
    // Stop all media
    stopCamera();
    
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    
    // Pause and cleanup original video
    if (originalVideoRef.current) {
      originalVideoRef.current.pause();
      originalVideoRef.current.muted = true;
      originalVideoRef.current.currentTime = 0;
    }
    
    // Cleanup preview videos
    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
      previewVideoRef.current.src = '';
    }
    if (previewOriginalRef.current) {
      previewOriginalRef.current.pause();
      previewOriginalRef.current.muted = true;
    }
    
    // Cleanup recorded URL
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    
    // Reset state
    setRecordedBlob(null);
    setRecordedUrl(null);
    setStep('setup');
    setIsRecording(false);
    setIsPlaying(false);
    setUploadProgress(0);
    setCameraReady(false);
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-black border-none rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleClose}
            >
              <X className="w-6 h-6" />
            </Button>
            <h2 className="text-white font-semibold">
              {step === 'setup' && 'Duet Setup'}
              {step === 'recording' && 'Recording...'}
              {step === 'preview' && 'Preview Duet'}
              {step === 'uploading' && 'Uploading...'}
            </h2>
            <div className="w-10" />
          </div>
        </div>

        {/* Main content - Side by side videos */}
        <div className="w-full h-full flex">
          {step === 'uploading' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-white font-medium">Uploading your duet...</p>
              <div className="w-full max-w-xs">
                <Progress value={uploadProgress} className="h-2" />
              </div>
              <p className="text-white/60 text-sm">{uploadProgress}%</p>
            </div>
          ) : (
            <>
              {/* Original Video - Left side */}
              <div className="flex-1 relative bg-black">
                <div className="absolute top-16 left-2 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                  <p className="text-white text-xs">@{originalReel.user.username}</p>
                </div>
                {step === 'preview' ? (
                  <video
                    ref={previewOriginalRef}
                    src={originalReel.videoUrl}
                    className="w-full h-full object-cover"
                    playsInline
                    loop
                    muted={false}
                  />
                ) : (
                  <video
                    ref={originalVideoRef}
                    src={originalReel.videoUrl}
                    className="w-full h-full object-cover"
                    playsInline
                    loop
                    muted={step !== 'recording'}
                    preload="auto"
                  />
                )}
              </div>

              {/* Divider */}
              <div className="w-1 bg-primary" />

              {/* User Video - Right side */}
              <div className="flex-1 relative bg-black">
                <div className="absolute top-16 left-2 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                  <p className="text-white text-xs">You</p>
                </div>
                {step === 'preview' && recordedUrl ? (
                  <video
                    ref={previewVideoRef}
                    src={recordedUrl}
                    className="w-full h-full object-cover"
                    playsInline
                    loop
                  />
                ) : (
                  <video
                    ref={userVideoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                    style={{ transform: 'scaleX(-1)' }}
                  />
                )}
                
                {!isCameraOn && step !== 'preview' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <VideoOff className="w-12 h-12 text-white/50" />
                  </div>
                )}

                {/* Camera loading indicator */}
                {step === 'setup' && !cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center">
                      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-white/60 text-sm">Starting camera...</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom Controls */}
        {step !== 'uploading' && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/90 to-transparent">
            {step === 'setup' && (
              <div className="flex items-center justify-center gap-8">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 rounded-full bg-white/20 text-white"
                  onClick={toggleCamera}
                >
                  {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>

                <Button
                  className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 border-4 border-white disabled:opacity-50"
                  onClick={startRecording}
                  disabled={!cameraReady}
                >
                  <div className="w-8 h-8 bg-white rounded-full" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 rounded-full bg-white/20 text-white"
                  onClick={toggleMic}
                >
                  {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </Button>
              </div>
            )}

            {step === 'recording' && (
              <div className="flex items-center justify-center">
                <Button
                  className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 border-4 border-white animate-pulse"
                  onClick={stopRecording}
                >
                  <div className="w-8 h-8 bg-white rounded" />
                </Button>
              </div>
            )}

            {step === 'preview' && (
              <div className="flex items-center justify-center gap-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-14 h-14 rounded-full bg-white/20 text-white"
                  onClick={retakeRecording}
                >
                  <RotateCcw className="w-7 h-7" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="w-14 h-14 rounded-full bg-white/20 text-white"
                  onClick={togglePreviewPlay}
                >
                  {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
                </Button>

                <Button
                  className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90"
                  onClick={handleUpload}
                >
                  <Check className="w-7 h-7" />
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DuetModal;
