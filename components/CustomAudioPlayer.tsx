"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Howl } from "howler";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ListMusic, X, Repeat, Shuffle } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

interface Song {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  album_art_url: string;
  duration: number;
}

interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  currentIndex: number;
  playSong: (song: Song, songs?: Song[]) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  currentTime: number;
  duration: number;
  volume: number;
  isLooping: boolean;
  isShuffling: boolean;
  setIsLooping: (v: boolean) => void;
  setIsShuffling: (v: boolean) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function useAudioPlayer() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  const howlRef = useRef<Howl | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null; }
  }, []);

  const getNextIndex = useCallback(() => {
    if (isShuffling && shuffledIndices.length > 0) {
      const currentShuffleIdx = shuffledIndices.indexOf(currentIndex);
      const nextShuffleIdx = (currentShuffleIdx + 1) % shuffledIndices.length;
      return shuffledIndices[nextShuffleIdx];
    }
    return (currentIndex + 1) % queue.length;
  }, [isShuffling, shuffledIndices, currentIndex, queue.length]);

  const playSong = useCallback((song: Song, songs?: Song[]) => {
    cleanup();
    setCurrentSong(song);
    setShowPlayer(true);
    setCurrentTime(0);

    if (songs) {
      const idx = songs.findIndex((s) => s.id === song.id);
      setQueue(songs);
      setCurrentIndex(idx >= 0 ? idx : 0);
      if (isShuffling) {
        const indices = songs.map((_, i) => i).filter(i => i !== idx);
        const shuffled = [idx, ...indices.sort(() => Math.random() - 0.5)];
        setShuffledIndices(shuffled);
      }
    } else {
      setQueue([song]);
      setCurrentIndex(0);
      setShuffledIndices([0]);
    }

    const howl = new Howl({
      src: [song.audio_url],
      html5: true,
      volume,
      loop: isLooping,
      onload: () => setDuration(howl.duration()),
      onplay: () => { setIsPlaying(true); intervalRef.current = setInterval(() => setCurrentTime(howl.seek()), 1000); },
      onpause: () => { setIsPlaying(false); if (intervalRef.current) clearInterval(intervalRef.current); },
      onend: () => {
        setIsPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (queue.length > 1) {
          const nextIdx = getNextIndex();
          const nextSong = queue[nextIdx];
          if (nextSong) {
            setCurrentIndex(nextIdx);
            setCurrentSong(nextSong);
            setCurrentTime(0);
            const nextHowl = new Howl({
              src: [nextSong.audio_url], html5: true, volume, loop: isLooping,
              onload: () => setDuration(nextHowl.duration()),
              onplay: () => { setIsPlaying(true); intervalRef.current = setInterval(() => setCurrentTime(nextHowl.seek()), 1000); },
              onpause: () => { setIsPlaying(false); if (intervalRef.current) clearInterval(intervalRef.current); },
              onend: () => { setIsPlaying(false); if (intervalRef.current) clearInterval(intervalRef.current); },
            });
            howlRef.current = nextHowl;
            nextHowl.play();
          }
        }
      },
    });

    howlRef.current = howl;
    howl.play();
  }, [cleanup, volume, queue, currentIndex, isLooping, isShuffling, shuffledIndices, getNextIndex]);

  const togglePlay = useCallback(() => { if (howlRef.current) isPlaying ? howlRef.current.pause() : howlRef.current.play(); }, [isPlaying]);
  const playNext = useCallback(() => { if (queue.length <= 1) return; const nextIdx = getNextIndex(); playSong(queue[nextIdx], queue); }, [queue, getNextIndex, playSong]);
  const playPrev = useCallback(() => { if (queue.length <= 1) return; const prevIdx = currentIndex === 0 ? queue.length - 1 : currentIndex - 1; playSong(queue[prevIdx], queue); }, [queue, currentIndex, playSong]);
  const seek = useCallback((time: number) => { if (howlRef.current) { howlRef.current.seek(time); setCurrentTime(time); } }, []);
  const setVolume = useCallback((vol: number) => { setVolumeState(vol); if (howlRef.current) howlRef.current.volume(vol); }, []);

  const handleSetIsLooping = useCallback((v: boolean) => {
    setIsLooping(v);
    if (howlRef.current) howlRef.current.loop(v);
  }, []);

  const handleSetIsShuffling = useCallback((v: boolean) => {
    setIsShuffling(v);
    if (v && queue.length > 1) {
      const indices = queue.map((_, i) => i).filter(i => i !== currentIndex);
      const shuffled = [currentIndex, ...indices.sort(() => Math.random() - 0.5)];
      setShuffledIndices(shuffled);
    } else {
      setShuffledIndices(queue.map((_, i) => i));
    }
  }, [queue, currentIndex]);

  useEffect(() => () => cleanup(), [cleanup]);

  return (
    <AudioContext.Provider value={{ currentSong, isPlaying, queue, currentIndex, playSong, togglePlay, playNext, playPrev, seek, setVolume, currentTime, duration, volume, isLooping, isShuffling, setIsLooping: handleSetIsLooping, setIsShuffling: handleSetIsShuffling }}>
      {children}
      {showPlayer && currentSong && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50">
          <div className="max-w-7xl mx-auto px-4 pt-2 pb-3">
            {/* Progress bar: full-width row of its own so it's visible on mobile too */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-text-dim w-8 text-right tabular-nums">{formatDuration(Math.floor(currentTime))}</span>
              <input type="range" min={0} max={duration || 1} value={currentTime} onChange={(e) => seek(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #00FF88 ${(currentTime / (duration || 1)) * 100}%, #1F1F1F ${(currentTime / (duration || 1)) * 100}%)` }} />
              <span className="text-[10px] text-text-dim w-8 tabular-nums">{formatDuration(Math.floor(duration))}</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-border/50">
                <img src={currentSong.album_art_url} alt={currentSong.title} className="w-full h-full object-cover" />
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="flex gap-0.5">
                      <div className="w-0.5 h-3 bg-accent animate-pulse" />
                      <div className="w-0.5 h-5 bg-accent animate-pulse delay-75" />
                      <div className="w-0.5 h-4 bg-accent animate-pulse delay-150" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-text truncate">{currentSong.title}</h4>
                <p className="text-xs text-text-dim">{currentSong.artist}</p>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={playPrev} className="p-2 rounded-full text-text-dim hover:text-text hover:bg-card-hover transition-colors"><SkipBack className="w-4 h-4" /></button>
                <button onClick={togglePlay} className="p-2.5 rounded-full bg-accent text-background hover:bg-accent-dim transition-colors">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <button onClick={playNext} className="p-2 rounded-full text-text-dim hover:text-text hover:bg-card-hover transition-colors"><SkipForward className="w-4 h-4" /></button>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => handleSetIsLooping(!isLooping)} className={cn("p-2 rounded-full transition-colors", isLooping ? "text-accent bg-accent/10" : "text-text-dim hover:text-text hover:bg-card-hover")}>
                  <Repeat className="w-4 h-4" />
                </button>
                <button onClick={() => handleSetIsShuffling(!isShuffling)} className={cn("p-2 rounded-full transition-colors", isShuffling ? "text-accent bg-accent/10" : "text-text-dim hover:text-text hover:bg-card-hover")}>
                  <Shuffle className="w-4 h-4" />
                </button>
                <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-text-dim hover:text-text transition-colors">
                  {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 h-1 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #00FF88 ${volume * 100}%, #1F1F1F ${volume * 100}%)` }} />
              </div>

              <button onClick={() => setShowQueue(!showQueue)} className={cn("p-2 rounded-full transition-colors", showQueue ? "text-accent bg-accent/10" : "text-text-dim hover:text-text hover:bg-card-hover")}>
                <ListMusic className="w-4 h-4" />
              </button>
              <button onClick={() => { cleanup(); setShowPlayer(false); setCurrentSong(null); setIsPlaying(false); setCurrentTime(0); setDuration(0); setShowQueue(false); }}
                className="p-2 rounded-full text-text-dim hover:text-text hover:bg-card-hover transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showQueue && (
            <div className="border-t border-border/50 bg-background/50 max-h-40 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 py-2">
                {queue.map((song, index) => (
                  <button key={song.id} onClick={() => playSong(song, queue)}
                    className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                      index === currentIndex ? "bg-accent/10 text-accent" : "text-text-dim hover:text-text hover:bg-card-hover")}>
                    <span className="text-xs w-4">{index + 1}</span>
                    <img src={song.album_art_url} alt={song.title} className="w-8 h-8 rounded object-cover" loading="lazy" decoding="async" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{song.title}</p>
                      <p className="text-xs opacity-60">{song.artist}</p>
                    </div>
                    <span className="text-xs opacity-40">{formatDuration(song.duration)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AudioContext.Provider>
  );
}

export function AudioPlayerButton({ song }: { song: Song }) {
  const { currentSong, isPlaying, playSong, togglePlay } = useAudioPlayer();
  const isCurrent = currentSong?.id === song.id;

  return (
    <button onClick={() => isCurrent ? togglePlay() : playSong(song)}
      className="w-12 h-12 rounded-full bg-accent text-background flex items-center justify-center hover:bg-accent-dim transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:scale-105 active:scale-95">
      {isCurrent && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
    </button>
  );
}