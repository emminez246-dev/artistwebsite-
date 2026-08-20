"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useAudioPlayer } from "@/components/CustomAudioPlayer";
import { Play, Pause, Heart, Clock, Music, Repeat, Shuffle, SkipBack, SkipForward, Volume2, MessageSquare, Download, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import Navigation from "@/components/Navigation";
import CommentSection from "@/components/CommentSection";
import ShareButton from "@/components/ShareButton";
import { fetchLikedSet, toggleLike as toggleLikeRemote, subscribeLikeSync } from "@/lib/likes";
import { downloadSongWithTags } from "@/lib/download-song";
import toast from "react-hot-toast";

interface Song {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  album_art_url: string;
  duration: number;
  likes: number;
  shares?: number;
}

export default function SongsPage() {
  const [songs, setSongs] = useState < Song[] > ([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likedSongs, setLikedSongs] = useState < Set < string >> (new Set());
  const [expandedComments, setExpandedComments] = useState < Set < string >> (new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    playNext,
    playPrev,
    currentTime,
    duration,
    volume,
    setVolume,
    isLooping,
    isShuffling,
    setIsLooping,
    setIsShuffling
  } = useAudioPlayer();
  
  const supabase = createClient();
  
  useEffect(() => {
    fetchSongs();
  }, []);

  // Once songs are loaded, ask the server which ones this device already liked.
  useEffect(() => {
    if (songs.length === 0) return;
    fetchLikedSet(supabase, "song", songs.map((s) => s.id)).then(setLikedSongs);
  }, [songs.length]);

  // Keep in sync if the user likes/unlikes the same song from another tab.
  useEffect(() => {
    return subscribeLikeSync("song", (targetId, liked, likeCount) => {
      setLikedSongs((prev) => {
        const next = new Set(prev);
        if (liked) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
      setSongs((prev) =>
        prev.map((s) => (s.id === targetId ? { ...s, likes: likeCount } : s))
      );
    });
  }, []);
  
  const fetchSongs = async () => {
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSongs(data || []);
    } catch (err) {
      console.error("Failed to fetch songs:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleLike = async (songId: string) => {
    // Optimistic update, corrected below by the server's authoritative result.
    const wasLiked = likedSongs.has(songId);
    setLikedSongs((prev) => {
      const next = new Set(prev);
      wasLiked ? next.delete(songId) : next.add(songId);
      return next;
    });
    setSongs((prev) =>
      prev.map((s) =>
        s.id === songId ? { ...s, likes: Math.max(0, (s.likes || 0) + (wasLiked ? -1 : 1)) } : s
      )
    );

    const result = await toggleLikeRemote(supabase, "song", songId);
    if (!result) {
      // Roll back on failure.
      setLikedSongs((prev) => {
        const next = new Set(prev);
        wasLiked ? next.add(songId) : next.delete(songId);
        return next;
      });
      setSongs((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, likes: Math.max(0, (s.likes || 0) + (wasLiked ? 1 : -1)) } : s))
      );
      return;
    }
    setSongs((prev) => prev.map((s) => (s.id === songId ? { ...s, likes: result.likeCount } : s)));
  };
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleComments = (songId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      next.has(songId) ? next.delete(songId) : next.add(songId);
      return next;
    });
  };

  const handleDownload = async (song: Song) => {
    setDownloadingId(song.id);
    try {
      await downloadSongWithTags(song);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloadingId(null);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Music className="w-8 h-8 text-accent" />
          All Songs
        </h1>

        {songs.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <Music className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No songs available yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map((song, index) => {
              const isCurrent = currentSong?.id === song.id;
              const isLiked = likedSongs.has(song.id);

              return (
                <div key={song.id}>
                  <div
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg transition-all group",
                      isCurrent ? "bg-accent/10 border border-accent/30" : "bg-gray-900/50 hover:bg-gray-800"
                    )}
                  >
                    <span className="text-sm text-gray-500 w-6 text-center">
                      {isCurrent && isPlaying ? (
                        <div className="flex gap-0.5 justify-center">
                          <div className="w-0.5 h-3 bg-accent animate-pulse" />
                          <div className="w-0.5 h-5 bg-accent animate-pulse delay-75" />
                          <div className="w-0.5 h-4 bg-accent animate-pulse delay-150" />
                        </div>
                      ) : (
                        index + 1
                      )}
                    </span>

                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={song.album_art_url} alt={song.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      {isCurrent && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className={cn("font-medium truncate", isCurrent ? "text-accent" : "text-white")}>
                        {song.title}
                      </h3>
                      <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => toggleLike(song.id)}
                        className={cn(
                          "p-2 rounded-full transition-colors",
                          isLiked ? "text-red-500" : "text-gray-500 hover:text-red-400"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                      </button>

                      <button
                        onClick={() => toggleComments(song.id)}
                        className={cn("p-2 rounded-full transition-colors", expandedComments.has(song.id) ? "text-accent" : "text-gray-500 hover:text-gray-300")}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      <ShareButton
                        targetType="song"
                        targetId={song.id}
                        title={song.title}
                        text={`${song.title} by ${song.artist}`}
                        url={typeof window !== "undefined" ? `${window.location.origin}/songs` : "/songs"}
                        shareCount={song.shares || 0}
                        className="p-2 rounded-full hover:bg-white/5"
                      />

                      <button
                        onClick={() => handleDownload(song)}
                        disabled={downloadingId === song.id}
                        className="p-2 rounded-full text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
                      >
                        {downloadingId === song.id ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      </button>

                      <span className="text-sm text-gray-500 w-12 text-right hidden sm:inline">
                        {formatDuration(song.duration)}
                      </span>

                      <button
                        onClick={() => isCurrent ? togglePlay() : playSong(song, songs)}
                        className="w-10 h-10 rounded-full bg-accent text-black flex items-center justify-center hover:bg-accent-dim transition-colors"
                      >
                        {isCurrent && isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {expandedComments.has(song.id) && (
                    <div className="mt-2 mb-2">
                      <CommentSection targetType="song" targetId={song.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Now Playing Bar */}
      {currentSong && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img src={currentSong.album_art_url} alt={currentSong.title} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{currentSong.title}</h4>
                <p className="text-xs text-gray-400">{currentSong.artist}</p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={playPrev} className="p-2 text-gray-400 hover:text-white transition-colors">
                  <SkipBack className="w-4 h-4" />
                </button>
                <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-accent text-black flex items-center justify-center hover:bg-accent-dim transition-colors">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button onClick={playNext} className="p-2 text-gray-400 hover:text-white transition-colors">
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-3">
                <button
                  onClick={() => setIsLooping(!isLooping)}
                  className={cn("p-2 rounded-full transition-colors", isLooping ? "text-accent" : "text-gray-400 hover:text-white")}
                >
                  <Repeat className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsShuffling(!isShuffling)}
                  className={cn("p-2 rounded-full transition-colors", isShuffling ? "text-accent" : "text-gray-400 hover:text-white")}
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #00FF88 ${volume * 100}%, #333 ${volume * 100}%)` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}