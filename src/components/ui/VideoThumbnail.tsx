import React, { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';

interface VideoThumbnailProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  viewsCount?: number;
  onClick?: () => void;
  className?: string;
}

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  videoUrl,
  thumbnailUrl,
  viewsCount,
  onClick,
  className = '',
}) => {
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // If we have a thumbnail URL, use it directly
    if (thumbnailUrl) {
      setGeneratedThumbnail(thumbnailUrl);
      setIsLoading(false);
      return;
    }

    // Generate thumbnail from video
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const handleLoadedData = () => {
      // Seek to 1 second or 10% of duration
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    const handleSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 360;
        canvas.height = video.videoHeight || 640;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setGeneratedThumbnail(dataUrl);
        }
      } catch (e) {
        console.error('Failed to generate thumbnail:', e);
      } finally {
        setIsLoading(false);
        video.remove();
      }
    };

    const handleError = () => {
      setIsLoading(false);
      video.remove();
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    // Set timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setIsLoading(false);
      video.remove();
    }, 5000);

    video.src = videoUrl;

    return () => {
      clearTimeout(timeout);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      video.remove();
    };
  }, [videoUrl, thumbnailUrl]);

  return (
    <div
      className={`aspect-[9/16] bg-muted relative overflow-hidden cursor-pointer group ${className}`}
      onClick={onClick}
    >
      {/* Thumbnail or Loading State */}
      {generatedThumbnail ? (
        <img
          src={generatedThumbnail}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
        />
      ) : isLoading ? (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        // Fallback: show first frame using video element with poster
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Play className="w-8 h-8 text-white" fill="currentColor" />
      </div>

      {/* Views Count */}
      {viewsCount !== undefined && (
        <div className="absolute bottom-1 left-1 flex items-center gap-1">
          <Play className="w-3 h-3 text-white" fill="currentColor" />
          <span className="text-white text-xs font-medium">{viewsCount}</span>
        </div>
      )}
    </div>
  );
};

export default VideoThumbnail;
