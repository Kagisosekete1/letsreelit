import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Heart, Send, Users, Radio, Mic, MicOff, Camera, CameraOff, RotateCcw, MessageCircle, Power, Trash2, SwitchCamera, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { useAudio } from '@/contexts/AudioContext';
import { supabase } from '@/integrations/supabase/client';
import FloatingHearts from '@/components/ui/FloatingHearts';
import ConfettiBurst from '@/components/ui/ConfettiBurst';
import ProfileLink from '@/components/ui/ProfileLink';

interface GoLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: Date;
  avatarUrl?: string;
}

interface Viewer {
  oderId: string;
  username: string;
  avatarUrl?: string;
}

// Beauty filters for live camera
const BEAUTY_FILTERS = [
  { name: 'None', class: '', icon: '✨' },
  { name: 'Soft', class: 'brightness(105%) contrast(95%) saturate(90%)', icon: '🌸' },
  { name: 'Warm', class: 'sepia(15%) saturate(120%) brightness(105%)', icon: '☀️' },
  { name: 'Cool', class: 'hue-rotate(10deg) saturate(90%) brightness(105%)', icon: '❄️' },
  { name: 'Glow', class: 'brightness(110%) contrast(90%) saturate(110%)', icon: '💫' },
  { name: 'Vivid', class: 'saturate(130%) contrast(105%)', icon: '🌈' },
  { name: 'Portrait', class: 'brightness(108%) contrast(92%) saturate(95%)', icon: '📸' },
  { name: 'Dreamy', class: 'brightness(105%) blur(0.3px) saturate(85%)', icon: '🌙' },
];

// AR Face Effects - overlay emojis/stickers on the face area
const AR_EFFECTS = [
  { name: 'None', emoji: '❌', overlay: null },
  { name: 'Bunny', emoji: '🐰', overlay: '🐰' },
  { name: 'Cat', emoji: '🐱', overlay: '😺' },
  { name: 'Dog', emoji: '🐶', overlay: '🐕' },
  { name: 'Crown', emoji: '👑', overlay: '👑' },
  { name: 'Hearts', emoji: '💕', overlay: '💕' },
  { name: 'Stars', emoji: '⭐', overlay: '✨' },
  { name: 'Glasses', emoji: '🕶️', overlay: '🕶️' },
  { name: 'Angel', emoji: '😇', overlay: '😇' },
  { name: 'Devil', emoji: '😈', overlay: '😈' },
  { name: 'Fire', emoji: '🔥', overlay: '🔥' },
  { name: 'Sparkle', emoji: '✨', overlay: '💫' },
];

// Viewer milestones for confetti
const VIEWER_MILESTONES = [10, 50, 100, 500, 1000];

const GoLiveModal: React.FC<GoLiveModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const { currentUser, authUser } = useUser();
  const { forceCleanupAll } = useAudio();
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [viewers, setViewers] = useState<Map<string, Viewer>>(new Map());
  const [likeCount, setLikeCount] = useState(0);
  const [likeTrigger, setLikeTrigger] = useState(0);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [currentMilestone, setCurrentMilestone] = useState<number | undefined>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [liveTitle, setLiveTitle] = useState('');
  const [step, setStep] = useState<'setup' | 'countdown' | 'live' | 'ended'>('setup');
  const [countdown, setCountdown] = useState(3);
  const [liveStartTime, setLiveStartTime] = useState<Date | null>(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAREffect, setSelectedAREffect] = useState(0);
  const [showAREffects, setShowAREffects] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [allComments, setAllComments] = useState<Comment[]>([]); // Store ALL comments for scroll history
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reachedMilestones = useRef<Set<number>>(new Set());

  const viewerCount = viewers.size;

  // When opening the live modal, hard-stop any reel audio playing behind it.
  useEffect(() => {
    if (isOpen) {
      forceCleanupAll();
    }
  }, [isOpen, forceCleanupAll]);

  // Cleanup streams when modal closes
  useEffect(() => {
    if (!isOpen && stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [isOpen]);

  // Check for viewer milestones
  useEffect(() => {
    for (const milestone of VIEWER_MILESTONES) {
      if (viewerCount >= milestone && !reachedMilestones.current.has(milestone)) {
        reachedMilestones.current.add(milestone);
        setCurrentMilestone(milestone);
        setConfettiTrigger(prev => prev + 1);
        
        toast({
          title: `🎉 ${milestone} Viewers!`,
          description: "Your live is on fire!",
        });
      }
    }
  }, [viewerCount, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Update live duration
  useEffect(() => {
    if (isLive && liveStartTime) {
      const interval = setInterval(() => {
        setLiveDuration(Math.floor((Date.now() - liveStartTime.getTime()) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLive, liveStartTime]);

  // Setup Supabase Realtime for viewer presence when live
  useEffect(() => {
    if (!isLive || !liveSessionId || !authUser) return;

    const channel = supabase.channel(`live:${liveSessionId}`, {
      config: {
        presence: {
          key: authUser.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const newViewers = new Map<string, Viewer>();
        
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== authUser.id && Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as any;
            newViewers.set(key, {
              oderId: key,
              username: presence.username || 'Anonymous',
              avatarUrl: presence.avatarUrl,
            });
          }
        });
        
        setViewers(newViewers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== authUser.id && newPresences.length > 0) {
          const presence = newPresences[0] as any;
          setViewers(prev => {
            const next = new Map(prev);
            next.set(key, {
              oderId: key,
              username: presence.username || 'Anonymous',
              avatarUrl: presence.avatarUrl,
            });
            return next;
          });
          
          toast({
            title: `${presence.username || 'Someone'} joined`,
            description: 'A new viewer is watching your live!',
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== authUser.id) {
          setViewers(prev => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        }
      })
      .on('broadcast', { event: 'like' }, () => {
        setLikeCount(prev => prev + 1);
        setLikeTrigger(prev => prev + 1);
      })
      .on('broadcast', { event: 'comment' }, ({ payload }) => {
        const comment = payload as Comment;
        // Store in BOTH - allComments for scroll history, comments for display
        setAllComments(prev => [...prev, comment]);
        setComments(prev => [...prev.slice(-20), comment]);
        // Auto-scroll to latest comment
        setTimeout(() => {
          if (commentsContainerRef.current) {
            commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
          }
        }, 100);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            username: currentUser?.username || 'Broadcaster',
            avatarUrl: currentUser?.avatarUrl,
            isBroadcaster: true,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isLive, liveSessionId, authUser?.id]);

  // Attach stream to video when step changes to live
  useEffect(() => {
    if (step === 'live' && stream && liveVideoRef.current) {
      liveVideoRef.current.srcObject = stream;
      liveVideoRef.current.play().catch((err) => {
        console.log('Video play error:', err);
      });
    }
  }, [step, stream]);

  // Attach stream to preview video - ensure it works on mobile
  useEffect(() => {
    if ((step === 'setup' || step === 'countdown') && stream && previewVideoRef.current) {
      const video = previewVideoRef.current;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      
      const playVideo = async () => {
        try {
          await video.play();
        } catch (err) {
          console.log('Preview video play error:', err);
          // Retry after a short delay (mobile browsers sometimes need this)
          setTimeout(async () => {
            try {
              await video.play();
            } catch (retryErr) {
              console.log('Preview video retry error:', retryErr);
            }
          }, 100);
        }
      };
      
      playVideo();
    }
  }, [step, stream]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check and request permissions
  const checkPermissions = async () => {
    try {
      // Check if we're on HTTPS (required for camera access on mobile)
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      if (!isSecure) {
        setPermissionStatus('denied');
        toast({
          title: "Secure connection required",
          description: "Camera access requires HTTPS. Please use a secure connection.",
          variant: "destructive",
        });
        return;
      }

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionStatus('denied');
        toast({
          title: "Camera not supported",
          description: "Your browser doesn't support camera access. Try using Chrome or Safari.",
          variant: "destructive",
        });
        return;
      }

      // Try to check permission status via Permissions API (not all browsers support this)
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        if (cameraPermission.state === 'granted' && micPermission.state === 'granted') {
          setPermissionStatus('granted');
        } else if (cameraPermission.state === 'denied' || micPermission.state === 'denied') {
          setPermissionStatus('denied');
        } else {
          setPermissionStatus('prompt');
        }
      } catch {
        // Permissions API not supported, we'll try direct access
        setPermissionStatus('prompt');
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setPermissionStatus('prompt');
    }
  };

  // Request all permissions with better error handling for mobile
  const requestAllPermissions = async () => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      mediaStream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      toast({
        title: "Permissions granted",
        description: "Camera and microphone access enabled!",
      });
      // Now start the preview camera
      startPreviewCamera();
    } catch (error: any) {
      console.error('Permission request error:', error);
      setPermissionStatus('denied');
      
      // Provide specific error messages based on the error type
      let errorMessage = "Please enable camera and microphone access.";
      let errorTitle = "Permission denied";
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorTitle = "Camera access blocked";
        errorMessage = "Camera permission was denied. To fix this:\n1. Tap the lock/info icon in your browser's address bar\n2. Find 'Camera' and 'Microphone' settings\n3. Change them to 'Allow'\n4. Refresh the page and try again";
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorTitle = "No camera found";
        errorMessage = "No camera or microphone detected on your device.";
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorTitle = "Camera in use";
        errorMessage = "Your camera might be in use by another app. Close other apps using the camera and try again.";
      } else if (error.name === 'OverconstrainedError') {
        errorTitle = "Camera error";
        errorMessage = "Could not access camera with the requested settings. Trying with default settings...";
        // Try with minimal constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          fallbackStream.getTracks().forEach(track => track.stop());
          setPermissionStatus('granted');
          startPreviewCamera();
          return;
        } catch {
          errorMessage = "Camera access failed. Please check your camera settings.";
        }
      } else if (error.name === 'SecurityError') {
        errorTitle = "Security error";
        errorMessage = "Camera access is not allowed on insecure connections. Make sure you're using HTTPS.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Start camera for preview with better error handling for mobile
  const startPreviewCamera = async () => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionStatus('denied');
        toast({
          title: "Camera not available",
          description: "Your browser doesn't support camera access.",
          variant: "destructive",
        });
        return;
      }

      // Stop existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      // Mobile-optimized constraints - start simple, then upgrade
      const mobileConstraints: MediaStreamConstraints = {
        video: {
          facingMode: currentFacingMode,
          width: { ideal: 720, max: 1280 },
          height: { ideal: 1280, max: 1920 },
        },
        audio: false,
      };

      let mediaStream: MediaStream;
      
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(mobileConstraints);
      } catch (constraintError) {
        // Fallback to simplest possible constraints
        console.log('Trying simpler constraints...');
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: currentFacingMode },
          audio: false 
        });
      }
      
      setStream(mediaStream);
      setPermissionStatus('granted');
      
      // Ensure video element is ready for mobile
      if (previewVideoRef.current) {
        const video = previewVideoRef.current;
        video.srcObject = mediaStream;
        video.muted = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        
        // Wait for loadedmetadata before playing
        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch (playError) {
            console.log('Play error on loadedmetadata:', playError);
          }
        };
        
        // Also try immediate play
        try {
          await video.play();
        } catch (playErr) {
          console.log('Immediate play error (will retry on loadedmetadata):', playErr);
        }
      }
    } catch (error: any) {
      console.error('Camera preview error:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        toast({
          title: "Camera access blocked",
          description: "Please allow camera access in your browser settings, then refresh the page.",
          variant: "destructive",
        });
      } else if (error.name === 'NotFoundError') {
        setPermissionStatus('denied');
        toast({
          title: "No camera found",
          description: "Could not detect a camera on this device.",
          variant: "destructive",
        });
      } else if (error.name === 'NotReadableError') {
        toast({
          title: "Camera in use",
          description: "Your camera may be in use by another app. Please close other apps and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Camera error",
          description: "Could not access camera. Please check your device settings.",
          variant: "destructive",
        });
      }
    }
  };

  // Check permissions on mount and start camera preview when setup step is shown
  useEffect(() => {
    if (isOpen) {
      checkPermissions();
    }
    if ((step === 'setup' || step === 'countdown') && isOpen && !stream) {
      startPreviewCamera();
    }
  }, [step, isOpen]);

  // Countdown timer effect
  useEffect(() => {
    if (step === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // Countdown finished, start the actual live
        startActualLive();
      }
    }
  }, [step, countdown]);

  const startActualLive = async () => {
    try {
      // Stop preview stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Start full camera with audio for live (mobile-friendly portrait constraints)
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: currentFacingMode },
          width: { ideal: 720 },
          height: { ideal: 1280 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      // Attach to live video element
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = mediaStream;
        liveVideoRef.current.play().catch(console.log);
      }

      // Start recording
      let mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(mediaStream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      // Larger timeslice reduces jank on mobile
      mediaRecorder.start(3000);

      // Create live stream record in database
      const sessionId = `live_${authUser!.id}_${Date.now()}`;
      setLiveSessionId(sessionId);

      const { error } = await supabase
        .from('live_streams')
        .insert({
          user_id: authUser!.id,
          title: liveTitle.trim(),
          session_id: sessionId,
          is_active: true,
        });

      if (error) {
        console.error('Error creating live stream:', error);
      }

      setStep('live');
      setIsLive(true);
      setLiveStartTime(new Date());
      
      toast({
        title: "You're live!",
        description: "Real viewers will appear when they join your stream.",
      });
    } catch (error: any) {
      console.error('Camera access error:', error);
      toast({
        title: "Camera access required",
        description: "Please allow camera and microphone access to go live.",
        variant: "destructive",
      });
      setStep('setup');
      setCountdown(3);
    }
  };

  const handleGoLive = async () => {
    if (!liveTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please add a title for your live stream.",
        variant: "destructive",
      });
      return;
    }

    if (!authUser) {
      toast({
        title: "Sign in required",
        description: "Please sign in to go live.",
        variant: "destructive",
      });
      return;
    }

    // Check for existing active live streams from this user and end them
    const { data: existingLives } = await supabase
      .from('live_streams')
      .select('id, session_id')
      .eq('user_id', authUser.id)
      .eq('is_active', true);

    if (existingLives && existingLives.length > 0) {
      await supabase
        .from('live_streams')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('user_id', authUser.id)
        .eq('is_active', true);
    }

    // Start countdown
    setCountdown(3);
    setStep('countdown');
  };

  const handleEndLive = async () => {
    // Stop recording
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    // Clean up realtime channel
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Mark live stream as ended in database
    if (liveSessionId) {
      await supabase
        .from('live_streams')
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString(),
          viewer_count: viewerCount,
          likes_count: likeCount,
        })
        .eq('session_id', liveSessionId);
    }
    
    setStream(null);
    setIsLive(false);
    
    // Don't go to 'ended' screen - close immediately and clean up
    recordedChunksRef.current = [];
    reachedMilestones.current.clear();
    setStep('setup');
    setLiveTitle('');
    setComments([]);
    setAllComments([]);
    setViewers(new Map());
    setLikeCount(0);
    setLiveDuration(0);
    setSelectedAREffect(0);
    setSelectedFilter(0);
    
    toast({
      title: "Live ended",
      description: "Your live stream has ended.",
    });
    
    onClose();
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    recordedChunksRef.current = [];
    reachedMilestones.current.clear();
    setStep('setup');
    setLiveTitle('');
    setComments([]);
    setAllComments([]); // Reset all comments history
    setViewers(new Map());
    setLikeCount(0);
    setLiveDuration(0);
    setSelectedAREffect(0); // Reset AR effect
    setSelectedFilter(0); // Reset filter
    onClose();
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOn(!isCameraOn);
    }
  };

  const flipCamera = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: newFacingMode },
          width: { ideal: 1080 }, 
          height: { ideal: 1920 } 
        },
        audio: step === 'live',
      });
      setStream(newStream);
      setCurrentFacingMode(newFacingMode);
      
      if (step === 'live' && liveVideoRef.current) {
        liveVideoRef.current.srcObject = newStream;
      } else if (step === 'setup' && previewVideoRef.current) {
        previewVideoRef.current.srcObject = newStream;
      }
      
      toast({
        title: "Camera switched",
        description: newFacingMode === 'user' ? "Front camera" : "Back camera",
      });
    } catch (error) {
      console.error('Error flipping camera:', error);
      toast({
        title: "Camera switch failed",
        description: "Could not switch camera. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLive = async () => {
    if (liveSessionId) {
      await supabase
        .from('live_streams')
        .delete()
        .eq('session_id', liveSessionId);
      
      toast({
        title: "Live deleted",
        description: "Your live stream has been removed.",
      });
    }
    setShowDeleteConfirm(false);
    handleClose();
  };

  const sendComment = () => {
    if (newComment.trim() && currentUser && channelRef.current) {
      const comment: Comment = {
        id: Date.now().toString(),
        username: currentUser.username,
        text: newComment.trim(),
        timestamp: new Date(),
        avatarUrl: currentUser.avatarUrl,
      };
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'comment',
        payload: comment,
      });
      
      // Store in both arrays for history scrolling
      setAllComments(prev => [...prev, comment]);
      setComments(prev => [...prev.slice(-20), comment]);
      setNewComment('');
      
      // Auto-scroll to latest
      setTimeout(() => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  // SETUP SCREEN
  if (step === 'setup') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-[90vw] max-w-[320px] sm:max-w-[360px] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Go Live</h2>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Add a title for your live..."
              value={liveTitle}
              onChange={(e) => setLiveTitle(e.target.value)}
              className="rounded-xl text-sm"
            />

            {/* Camera Preview with Beauty Filter and AR Effects - Full screen preview like pro apps */}
            <div 
              className="aspect-[9/16] max-h-[50vh] bg-black rounded-xl overflow-hidden relative"
              style={{ filter: BEAUTY_FILTERS[selectedFilter].class }}
            >
              {stream ? (
                <>
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    playsInline
                    muted
                    webkit-playsinline="true"
                    className="w-full h-full object-cover"
                    style={{ 
                      transform: currentFacingMode === 'user' ? 'scaleX(-1)' : 'none',
                      WebkitTransform: currentFacingMode === 'user' ? 'scaleX(-1)' : 'none'
                    }}
                  />
                  {/* AR Effect Overlay */}
                  {AR_EFFECTS[selectedAREffect].overlay && (
                    <div className="absolute inset-0 flex items-start justify-center pt-8 pointer-events-none">
                      <span className="text-6xl animate-bounce drop-shadow-lg">
                        {AR_EFFECTS[selectedAREffect].overlay}
                      </span>
                    </div>
                  )}
                </>
              ) : permissionStatus === 'denied' ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-900/20 to-red-950/30">
                  <div className="text-center px-4">
                    <Camera className="w-10 h-10 text-red-400 mx-auto mb-2" />
                    <p className="text-base font-semibold mb-1 text-red-400">Permission Denied</p>
                    <p className="text-muted-foreground text-xs mb-2">Camera access was blocked</p>
                    <p className="text-xs text-muted-foreground">Please enable it in your browser settings:</p>
                    <p className="text-xs text-pink-400 mt-1">Settings → Privacy → Camera & Microphone</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={requestAllPermissions}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-900/10 to-purple-900/10">
                  <div className="text-center px-4">
                    <div className="relative">
                      <Camera className="w-12 h-12 text-pink-500 mx-auto mb-3" />
                      <Mic className="w-6 h-6 text-purple-500 absolute -right-1 -bottom-1" />
                    </div>
                    <p className="text-base font-semibold mb-1">Enable Camera & Mic</p>
                    <p className="text-muted-foreground text-xs mb-3">Allow access to go live with your followers</p>
                    <Button 
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      onClick={requestAllPermissions}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Allow Permissions
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Preview indicator + controls */}
              {stream && (
                <>
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                    <Radio className="w-3 h-3 text-pink-500" />
                    <span className="text-white text-xs font-medium">Preview</span>
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {/* AR Effects Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 rounded-full w-8 h-8 ${showAREffects ? 'ring-2 ring-pink-400' : ''}`}
                      onClick={() => { setShowAREffects(!showAREffects); setShowFilters(false); }}
                    >
                      <span className="text-sm">🎭</span>
                    </Button>
                    {/* Beauty Filters Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 rounded-full w-8 h-8 ${showFilters ? 'ring-2 ring-pink-400' : ''}`}
                      onClick={() => { setShowFilters(!showFilters); setShowAREffects(false); }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 rounded-full w-8 h-8"
                      onClick={flipCamera}
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* AR Effects Panel */}
                  {showAREffects && (
                    <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-md rounded-xl p-2">
                      <p className="text-white text-xs font-medium mb-2 text-center">🎭 AR Effects</p>
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {AR_EFFECTS.map((effect, index) => (
                          <button
                            key={effect.name}
                            onClick={() => setSelectedAREffect(index)}
                            className={`flex flex-col items-center min-w-[48px] p-1.5 rounded-lg transition-all ${
                              selectedAREffect === index 
                                ? 'bg-pink-500/50 ring-1 ring-pink-400' 
                                : 'bg-white/10 hover:bg-white/20'
                            }`}
                          >
                            <span className="text-lg">{effect.emoji}</span>
                            <span className="text-[10px] text-white/80">{effect.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Beauty Filters Panel */}
                  {showFilters && (
                    <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-md rounded-xl p-2">
                      <p className="text-white text-xs font-medium mb-2 text-center">✨ Beauty Filters</p>
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {BEAUTY_FILTERS.map((filter, index) => (
                          <button
                            key={filter.name}
                            onClick={() => setSelectedFilter(index)}
                            className={`flex flex-col items-center min-w-[48px] p-1.5 rounded-lg transition-all ${
                              selectedFilter === index 
                                ? 'bg-pink-500/50 ring-1 ring-pink-400' 
                                : 'bg-white/10 hover:bg-white/20'
                            }`}
                          >
                            <span className="text-lg">{filter.icon}</span>
                            <span className="text-[10px] text-white/80">{filter.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <Button 
              className="w-full rounded-xl bg-pink-500 hover:bg-pink-600 h-10"
              onClick={handleGoLive}
              disabled={!liveTitle.trim()}
            >
              <Radio className="w-4 h-4 mr-2" />
              Go Live
            </Button>
            
            <Button 
              variant="outline"
              className="w-full rounded-xl h-9"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // COUNTDOWN SCREEN
  if (step === 'countdown') {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-full h-screen p-0 border-0 rounded-none">
          <div className="relative h-full bg-black">
            {/* Camera Preview during countdown */}
            <div 
              className="w-full h-full"
              style={{ filter: BEAUTY_FILTERS[selectedFilter].class }}
            >
              {stream ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: currentFacingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-600/20">
                  <Camera className="w-20 h-20 text-white/50" />
                </div>
              )}
            </div>
            
            {/* Countdown Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-pink-500 rounded-full blur-3xl opacity-30 animate-pulse" />
                  <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-2xl">
                    <span className="text-7xl font-bold text-white animate-bounce">
                      {countdown}
                    </span>
                  </div>
                </div>
                <p className="text-white text-xl font-medium mt-6">Going live in...</p>
                <p className="text-white/60 text-sm mt-2">{liveTitle}</p>
              </div>
            </div>
            
            {/* Cancel Button */}
            <Button
              variant="ghost"
              className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full"
              onClick={() => {
                setStep('setup');
                setCountdown(3);
              }}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ENDED SCREEN
  if (step === 'ended') {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="w-[90vw] max-w-[360px] rounded-2xl bg-gradient-to-br from-background via-background to-pink-500/5 border-pink-500/20 p-4">
          <div className="relative">
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-pink-500/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-purple-500/20 rounded-full blur-xl" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-bold">Live Ended</h2>
                </div>
              </div>

              <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 rounded-xl p-3 text-center border border-pink-500/20">
                    <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                      {viewerCount}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Peak Viewers</span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-xl p-3 text-center border border-red-500/20">
                    <div className="text-2xl font-bold text-red-500 flex items-center justify-center gap-1">
                      <Heart className="w-5 h-5 fill-red-500" />
                      {likeCount}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Likes</span>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl p-3 text-center border border-blue-500/20">
                    <div className="text-2xl font-bold text-blue-500 flex items-center justify-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {comments.length}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Comments</span>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl p-3 text-center border border-purple-500/20">
                    <div className="text-2xl font-bold text-purple-500">
                      {formatDuration(liveDuration)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Duration</span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-xl p-2 text-center">
                  <p className="text-xs text-muted-foreground">Stream title</p>
                  <p className="font-medium text-sm truncate">{liveTitle}</p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 h-10"
                    onClick={handleClose}
                  >
                    Done
                  </Button>
                  <Button 
                    variant="outline"
                    className="rounded-xl h-10 border-red-500/50 text-red-500 hover:bg-red-500/10"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>

                {showDeleteConfirm && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-2">
                    <p className="text-sm text-center">Delete this live stream permanently?</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        className="flex-1 h-8 text-sm"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1 h-8 text-sm bg-red-500 hover:bg-red-600"
                        onClick={handleDeleteLive}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // LIVE SCREEN
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-full h-screen p-0 border-0 rounded-none">
        <div className="relative h-full bg-gradient-to-b from-black via-black to-purple-950/30">
          {/* Confetti Burst for milestones */}
          <ConfettiBurst trigger={confettiTrigger} milestone={currentMilestone} />

          {/* Video Preview - camera feed with beauty filter and AR effects */}
          <div 
            className="w-full h-full relative"
            style={{ filter: BEAUTY_FILTERS[selectedFilter].class }}
          >
            <video
              ref={liveVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover"
              style={{ transform: currentFacingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            {/* AR Effect Overlay during live */}
            {AR_EFFECTS[selectedAREffect].overlay && (
              <div className="absolute inset-0 flex items-start justify-center pt-16 pointer-events-none">
                <span className="text-7xl animate-bounce drop-shadow-lg">
                  {AR_EFFECTS[selectedAREffect].overlay}
                </span>
              </div>
            )}
          </div>
          
          {/* Gradient overlays for modern look */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

          {/* Top Bar with glass effect */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Live badge with glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-pink-500 rounded-full blur-md opacity-50 animate-pulse" />
                  <div className="relative bg-gradient-to-r from-pink-500 to-red-500 px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-white text-sm font-bold tracking-wide">LIVE</span>
                  </div>
                </div>
                
                {/* Stats pills */}
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <Users className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-sm font-medium">{viewerCount}</span>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <span className="text-white text-sm font-medium">{formatDuration(liveDuration)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* END LIVE BUTTON - Prominent */}
                <Button
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full px-4 h-10 flex items-center gap-2 font-semibold"
                  onClick={handleEndLive}
                >
                  <Power className="w-4 h-4" />
                  End Live
                </Button>
              </div>
            </div>
            
            {/* Title with subtle background */}
            <div className="mt-3 bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/5">
              <p className="text-white font-semibold text-lg">{liveTitle}</p>
            </div>
          </div>

          {/* Viewer avatars with better styling */}
          {viewerCount > 0 && (
            <div className="absolute top-32 left-4 flex -space-x-2 z-10">
              {Array.from(viewers.values()).slice(0, 5).map((viewer, idx) => (
                <div
                  key={viewer.oderId}
                  className="w-9 h-9 rounded-full border-2 border-pink-500/50 bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center overflow-hidden shadow-lg"
                  style={{ zIndex: 5 - idx }}
                >
                  {viewer.avatarUrl ? (
                    <img src={viewer.avatarUrl} alt={viewer.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs font-bold">{viewer.username[0]?.toUpperCase()}</span>
                  )}
                </div>
              ))}
              {viewerCount > 5 && (
                <div className="w-9 h-9 rounded-full border-2 border-white/20 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">+{viewerCount - 5}</span>
                </div>
              )}
            </div>
          )}

          {/* Comments Section with scrollable history - like TikTok/Instagram */}
          <div 
            ref={commentsContainerRef}
            className="absolute bottom-44 left-0 right-20 max-h-60 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
            style={{ scrollBehavior: 'smooth' }}
          >
            {allComments.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
                <span className="text-white/70 text-sm">✨ Waiting for viewers to join...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Scroll hint at top */}
                {allComments.length > 6 && (
                  <button 
                    className="w-full text-center text-white/50 text-xs py-1 hover:text-white/80 transition-colors"
                    onClick={() => {
                      if (commentsContainerRef.current) {
                        commentsContainerRef.current.scrollTop = 0;
                      }
                    }}
                  >
                    ↑ Scroll up to see {allComments.length - 6} older comments
                  </button>
                )}
                {allComments.map((comment, idx) => (
                  <div 
                    key={comment.id} 
                    className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/5 flex items-start gap-2 animate-in slide-in-from-left duration-300"
                    style={{ animationDelay: `${Math.min(idx, 6) * 50}ms` }}
                  >
                    {comment.avatarUrl ? (
                      <ProfileLink username={comment.username}>
                        <img src={comment.avatarUrl} alt="" className="w-6 h-6 rounded-full border border-white/20" />
                      </ProfileLink>
                    ) : (
                      <ProfileLink username={comment.username}>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{comment.username[0]?.toUpperCase()}</span>
                        </div>
                      </ProfileLink>
                    )}
                    <div className="flex-1 min-w-0">
                      <ProfileLink username={comment.username}>
                        <span className="text-pink-400 font-semibold text-sm">@{comment.username}</span>
                      </ProfileLink>
                      <p className="text-white/90 text-sm break-words">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floating Hearts Animation */}
          <FloatingHearts trigger={likeTrigger} />

          {/* Bottom Controls with glass morphism */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
            {/* Comment Input with modern styling */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 relative">
                <Input
                  placeholder="Say something..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                  className="w-full bg-white/10 backdrop-blur-md border-white/10 text-white placeholder:text-white/50 rounded-full pl-4 pr-12 py-3 focus:ring-2 focus:ring-pink-500/50"
                />
              </div>
              <Button
                size="icon"
                className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 w-11 h-11 shadow-lg"
                onClick={sendComment}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>

            {/* Control Buttons with glass effect */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                size="lg"
                className={`rounded-full w-14 h-14 backdrop-blur-md border border-white/10 transition-all ${isMuted ? 'bg-red-500/80 hover:bg-red-600/80' : 'bg-white/10 hover:bg-white/20'}`}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className={`rounded-full w-14 h-14 backdrop-blur-md border border-white/10 transition-all ${!isCameraOn ? 'bg-red-500/80 hover:bg-red-600/80' : 'bg-white/10 hover:bg-white/20'}`}
                onClick={toggleCamera}
              >
                {isCameraOn ? <Camera className="w-6 h-6 text-white" /> : <CameraOff className="w-6 h-6 text-white" />}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10"
                onClick={flipCamera}
                title="Switch Camera"
              >
                <SwitchCamera className="w-6 h-6 text-white" />
              </Button>
              {/* AR Effects Button during live */}
              <Button
                variant="ghost"
                size="lg"
                className={`rounded-full w-14 h-14 backdrop-blur-md border border-white/10 transition-all ${showAREffects ? 'bg-pink-500/50 ring-2 ring-pink-400' : 'bg-white/10 hover:bg-white/20'}`}
                onClick={() => { setShowAREffects(!showAREffects); setShowFilters(false); }}
                title="AR Effects"
              >
                <span className="text-2xl">🎭</span>
              </Button>
              {/* Beauty Filters Button during live */}
              <Button
                variant="ghost"
                size="lg"
                className={`rounded-full w-14 h-14 backdrop-blur-md border border-white/10 transition-all ${showFilters ? 'bg-pink-500/50 ring-2 ring-pink-400' : 'bg-white/10 hover:bg-white/20'}`}
                onClick={() => { setShowFilters(!showFilters); setShowAREffects(false); }}
                title="Beauty Filters"
              >
                <Sparkles className="w-6 h-6 text-white" />
              </Button>
            </div>
            
            {/* AR Effects Panel during live */}
            {showAREffects && (
              <div className="mt-3 bg-black/70 backdrop-blur-md rounded-xl p-2">
                <p className="text-white text-xs font-medium mb-2 text-center">🎭 AR Effects</p>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {AR_EFFECTS.map((effect, index) => (
                    <button
                      key={effect.name}
                      onClick={() => setSelectedAREffect(index)}
                      className={`flex flex-col items-center min-w-[48px] p-1.5 rounded-lg transition-all ${
                        selectedAREffect === index 
                          ? 'bg-pink-500/50 ring-1 ring-pink-400' 
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <span className="text-lg">{effect.emoji}</span>
                      <span className="text-[10px] text-white/80">{effect.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Beauty Filters Panel during live */}
            {showFilters && (
              <div className="mt-3 bg-black/70 backdrop-blur-md rounded-xl p-2">
                <p className="text-white text-xs font-medium mb-2 text-center">✨ Beauty Filters</p>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {BEAUTY_FILTERS.map((filter, index) => (
                    <button
                      key={filter.name}
                      onClick={() => setSelectedFilter(index)}
                      className={`flex flex-col items-center min-w-[48px] p-1.5 rounded-lg transition-all ${
                        selectedFilter === index 
                          ? 'bg-pink-500/50 ring-1 ring-pink-400' 
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <span className="text-lg">{filter.icon}</span>
                      <span className="text-[10px] text-white/80">{filter.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoLiveModal;
