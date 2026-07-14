import { useCallback, useEffect, useState } from "react";

export type VideoOrientation = "landscape" | "portrait" | "square" | "unknown";

/**
 * Tracks the native orientation of a <video> element by reading its
 * intrinsic videoWidth / videoHeight. Updates on metadata load, on resize
 * events the track emits, and when the srcObject changes.
 *
 * NEVER mutates the video frame — orientation is reported, not enforced.
 */
export function useVideoOrientation(videoRef: React.RefObject<HTMLVideoElement>) {
  const [orientation, setOrientation] = useState<VideoOrientation>("unknown");
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const measure = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const w = el.videoWidth;
    const h = el.videoHeight;
    if (!w || !h) return;
    setDimensions({ width: w, height: h });
    if (w > h) setOrientation("landscape");
    else if (h > w) setOrientation("portrait");
    else setOrientation("square");
  }, [videoRef]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    measure();
    el.addEventListener("loadedmetadata", measure);
    el.addEventListener("resize", measure);
    el.addEventListener("playing", measure);
    return () => {
      el.removeEventListener("loadedmetadata", measure);
      el.removeEventListener("resize", measure);
      el.removeEventListener("playing", measure);
    };
  }, [measure, videoRef]);

  return { orientation, dimensions, remeasure: measure };
}