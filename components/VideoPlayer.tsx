"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize, Loader, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  isLive?: boolean;
  poster?: string;
}

export default function VideoPlayer({ src, isLive = false, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Only .m3u8 sources are actual HLS streams. Every regular uploaded
  // video (mp4/webm/mov) is a direct, already-playable file — running it
  // through hls.js instead (as this component used to do unconditionally)
  // means MANIFEST_PARSED never fires, so the loading spinner never
  // clears and the video never plays. That was the bug.
  const isHlsSource = src.includes(".m3u8");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);
    let hls: Hls | null = null;

    if (isHlsSource && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: isLive });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => setIsPlaying(false));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error("HLS error:", data);
          setIsLoading(false);
          setHasError(true);
        }
      });
    } else {
      // Direct file playback — the path every uploaded video actually needs.
      video.src = src;
    }

    return () => {
      hls?.destroy();
    };
  }, [src, isLive, isHlsSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (!isLive && video.duration) setProgress((video.currentTime / video.duration) * 100);
    };
    const onLoaded = () => setDuration(video.duration);
    const onCanPlay = () => setIsLoading(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onError = () => { setIsLoading(false); setHasError(true); };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
    };
  }, [isLive]);

  const togglePlay = () => {
    if (!videoRef.current || hasError) return;
    isPlaying ? videoRef.current.pause() : videoRef.current.play().catch(() => {});
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
      setIsMuted(v === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current && !isLive && duration) {
      const time = (parseFloat(e.target.value) / 100) * duration;
      videoRef.current.currentTime = time;
      setProgress(parseFloat(e.target.value));
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    document.fullscreenElement ? document.exitFullscreen() : containerRef.current.requestFullscreen();
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => isPlaying && setShowControls(false), 3000);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || time < 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-2xl overflow-hidden group shadow-2xl shadow-black/40"
      style={{ aspectRatio: "16/9" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video ref={videoRef} className="w-full h-full object-contain" playsInline poster={poster} onClick={togglePlay} />

      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <Loader className="w-9 h-9 text-accent animate-spin" />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2 px-6 text-center">
          <AlertCircle className="w-8 h-8 text-danger" />
          <p className="text-sm text-text-muted">This video couldn't be played.</p>
        </div>
      )}

      {isBuffering && !isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader className="w-8 h-8 text-white/80 animate-spin" />
        </div>
      )}

      {!hasError && (
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          {!isPlaying && !isLoading && (
            <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center pointer-events-auto">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white/20 hover:scale-105 transition-all">
                <Play className="w-7 h-7 text-white ml-1" fill="currentColor" />
              </div>
            </button>
          )}

          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 pointer-events-auto">
            {!isLive && (
              <input
                type="range" min="0" max="100" value={progress} onChange={handleSeek}
                className="w-full h-1 mb-3 rounded-full appearance-none cursor-pointer accent-accent"
                style={{ background: `linear-gradient(to right, #00FF88 ${progress}%, rgba(255,255,255,0.2) ${progress}%)` }}
              />
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="text-white hover:text-accent transition-colors">
                  {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
                </button>

                <div
                  className="relative flex items-center"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button onClick={toggleMute} className="text-white hover:text-accent transition-colors">
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <div className={cn(
                    "overflow-hidden transition-all duration-200 flex items-center",
                    showVolumeSlider ? "w-16 ml-2 opacity-100" : "w-0 ml-0 opacity-0"
                  )}>
                    <input
                      type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange}
                      className="w-16 h-1 rounded-full appearance-none cursor-pointer accent-accent"
                    />
                  </div>
                </div>

                {!isLive && <span className="text-xs text-white/70 font-medium tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>}
                {isLive && (
                  <span className="flex items-center gap-1.5 text-xs text-white font-semibold bg-red-600 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                  </span>
                )}
              </div>
              <button onClick={handleFullscreen} className="text-white hover:text-accent transition-colors">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
