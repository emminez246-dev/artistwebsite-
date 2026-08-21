"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Music, Video, Radio, ChevronRight, Play, Pause, Heart, Clock, BarChart3, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import Navigation from "@/components/Navigation";
import PostCard from "@/components/PostCard";
import { useAudioPlayer } from "@/components/CustomAudioPlayer";
import toast from "react-hot-toast";
import { fetchLikedSet, toggleLike as toggleLikeRemote, subscribeLikeSync } from "@/lib/likes";
import VideoThumbnail from "@/components/VideoThumbnail";

interface Song {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  album_art_url: string;
  duration: number;
  likes: number;
  streams: number;
}

interface Post {
  id: string;
  content: string;
  bg_type: string;
  bg_value: string;
  font_family: string;
  text_color: string;
  created_at: string;
  likes: number;
  shares: number;
  image_url ? : string;
  image_position ? : string;
}

interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string;
  type: string;
}

export default function HomeClient() {
  const [songs, setSongs] = useState < Song[] > ([]);
  const [posts, setPosts] = useState < Post[] > ([]);
  const [videos, setVideos] = useState < VideoItem[] > ([]);
  const [likedSongs, setLikedSongs] = useState < string[] > ([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { currentSong, isPlaying, playSong, togglePlay, playNext, playPrev, currentTime, duration, volume, setVolume } = useAudioPlayer();
  
  const supabase = createClient();
  
  useEffect(() => {
    fetchContent();

    // Real-time subscription for live counts
    const channel = supabase
      .channel("songs-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "songs" }, (payload) => {
        setSongs(prev => prev.map(s => s.id === payload.new.id ? { ...s, likes: payload.new.likes, streams: payload.new.streams } : s));
      })
      .subscribe();

    const unsubscribeSync = subscribeLikeSync("song", (targetId, liked, likeCount) => {
      setLikedSongs((prev) => (liked ? [...new Set([...prev, targetId])] : prev.filter((id) => id !== targetId)));
      setSongs((prev) => prev.map((s) => (s.id === targetId ? { ...s, likes: likeCount } : s)));
    });

    return () => { supabase.removeChannel(channel); unsubscribeSync(); };
  }, []);

  // Restore this device's liked songs once songs are loaded.
  useEffect(() => {
    if (songs.length === 0) return;
    fetchLikedSet(supabase, "song", songs.map((s) => s.id)).then((set) => setLikedSongs(Array.from(set)));
  }, [songs.length]);
  
  const fetchContent = async () => {
    try {
      const [{ data: songsData }, { data: postsData }, { data: videosData }] = await Promise.all([
        supabase.from("songs").select("*").order("created_at", { ascending: false }).limit(6),
        supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(3),
        supabase.from("videos").select("*").order("created_at", { ascending: false }).limit(4),
      ]);
      setSongs(songsData || []);
      setPosts(postsData || []);
      setVideos(videosData || []);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePlay = (song: Song) => {
    playSong(song, songs);
    // Increment streams
    supabase.from("songs").update({ streams: (song.streams || 0) + 1 }).eq("id", song.id).then(() => {
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, streams: (s.streams || 0) + 1 } : s));
    });
  };
  
  const handleLike = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    const isLiked = likedSongs.includes(song.id);

    // Optimistic update, corrected below by the server's authoritative result.
    const newLiked = isLiked ? likedSongs.filter(id => id !== song.id) : [...likedSongs, song.id];
    setLikedSongs(newLiked);
    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, likes: Math.max(0, (s.likes || 0) + (isLiked ? -1 : 1)) } : s));

    const result = await toggleLikeRemote(supabase, "song", song.id);
    if (!result) {
      // Roll back on failure.
      setLikedSongs(likedSongs);
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, likes: song.likes } : s));
      return;
    }
    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, likes: result.likeCount } : s));
  };
  
  const handleSeek = (e: React.ChangeEvent < HTMLInputElement > ) => {
    // Seek handled by CustomAudioPlayer
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16 pb-32">
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-8 sm:px-6 lg:px-8 space-y-12">
          {/* Hero - GREEN SKARLEE with padding */}
          <section className="text-center py-4">
            <h1 className="text-5xl sm:text-6xl font-bold text-accent mb-2 neon-text">Skarlee</h1>
            <p className="text-lg text-text-dim max-w-xl mx-auto">Independent artist creating music, visuals, and experiences.</p>
          </section>

          {/* Latest Music */}
          {songs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text flex items-center gap-2">
                  <Music className="w-5 h-5 text-accent" /> Latest Music
                </h2>
                <Link href="/songs" className="flex items-center gap-1 text-sm text-accent hover:text-accent-dim transition-colors">
                  See all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {songs.map((song) => (
                  <div key={song.id} className="group rounded-xl bg-card border border-border overflow-hidden hover-lift">
                    <div className="relative aspect-square">
                      <img src={song.album_art_url} alt={song.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      <button onClick={() => handlePlay(song)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-background hover:scale-110 transition-transform">
                          {currentSong?.id === song.id && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </div>
                      </button>
                      <button onClick={(e) => handleLike(song, e)}
                        className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/50 backdrop-blur-sm transition-colors ${likedSongs.includes(song.id) ? "text-accent" : "text-white/70 hover:text-white"}`}>
                        <Heart className={`w-3.5 h-3.5 ${likedSongs.includes(song.id) ? "fill-current" : ""}`} />
                      </button>
                    </div>
                    <div className="p-2.5">
                      <h3 className="font-medium text-text text-xs truncate">{song.title}</h3>
                      <p className="text-[10px] text-text-dim">{song.artist}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-[9px] text-text-dim">
                        <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {formatDuration(song.duration)}</span>
                        <span className="flex items-center gap-0.5"><BarChart3 className="w-2.5 h-2.5" /> {song.streams || 0}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> {song.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Latest Videos */}
          {videos.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text flex items-center gap-2">
                  <Video className="w-5 h-5 text-accent" /> Videos
                </h2>
                <Link href="/videos" className="flex items-center gap-1 text-sm text-accent hover:text-accent-dim transition-colors">
                  See all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {videos.map((video) => (
                  <Link href={`/video/${video.id}`} key={video.id} className="rounded-xl bg-card border border-border overflow-hidden hover-lift block">
                    <div className="relative aspect-video">
                      <VideoThumbnail src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="p-2.5">
                      <h3 className="font-medium text-text text-xs truncate">{video.title}</h3>
                      <p className="text-[10px] text-text-dim">{video.type}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Latest Posts */}
          {posts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text flex items-center gap-2">
                  <Radio className="w-5 h-5 text-accent" /> Updates
                </h2>
                <Link href="/posts" className="flex items-center gap-1 text-sm text-accent hover:text-accent-dim transition-colors">
                  See all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}

          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}