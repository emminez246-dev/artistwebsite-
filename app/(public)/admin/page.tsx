"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Upload, Radio, FileText, Trash2, LogOut, Video, Music,
  MessageSquare, Bell, ChevronRight, Loader, Disc3, ImageIcon,
  Palette, Type, X, Pencil, RotateCcw, Crop, Move,
  Check
} from "lucide-react";
import { cn, sanitizeInput, formatDuration } from "@/lib/utils";
import toast from "react-hot-toast";

// Each of these tabs is only needed once the admin actually opens it.
// CreatePostTab in particular pulls in 20 self-hosted Google Fonts (via
// lib/fonts) and the crop/perspective editors, so keeping it out of the
// main admin bundle noticeably speeds up the initial page load.
const CreatePostTab = dynamic(() => import("@/components/admin/CreatePostTab"), { ssr: false });

const tabs = [
  { id: "video", label: "Upload Video", icon: Video },
  { id: "song", label: "Upload Song", icon: Music },
  { id: "live", label: "Go Live", icon: Radio },
  { id: "post", label: "Create Post", icon: FileText },
  { id: "manage", label: "Manage Content", icon: Trash2 },
  { id: "push", label: "Push Notification", icon: Bell },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("video");
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
      else setUser(user);
      setIsLoading(false);
    });
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader className="w-8 h-8 text-accent animate-spin" />
    </div>
  );
  if (!user) return null;

  const ActiveIcon = tabs.find((t) => t.id === activeTab)?.icon || Video;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ActiveIcon className="w-5 h-5 text-accent" />
            <h1 className="font-semibold text-text">{tabs.find((t) => t.id === activeTab)?.label}</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-dim hover:text-text hover:bg-card-hover transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <div className="pt-16 flex min-h-screen">
        <aside className="w-64 fixed left-0 top-16 bottom-0 bg-card border-r border-border/50 overflow-y-auto hidden lg:block">
          <nav className="p-4 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    activeTab === tab.id ? "bg-accent/10 text-accent" : "text-text-dim hover:text-text hover:bg-card-hover")}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="lg:hidden fixed top-16 left-0 right-0 bg-card border-b border-border/50 z-40">
          <div className="flex overflow-x-auto p-2 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                    activeTab === tab.id ? "bg-accent/10 text-accent" : "text-text-dim hover:text-text hover:bg-card-hover")}>
                  <Icon className="w-4 h-4" /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <main className="flex-1 lg:ml-64 p-4 lg:p-8 mt-12 lg:mt-0">
          <div className="max-w-3xl mx-auto">
            {activeTab === "video" && <UploadVideoTab />}
            {activeTab === "song" && <UploadSongTab />}
            {activeTab === "live" && <GoLiveTab />}
            {activeTab === "post" && <CreatePostTab />}
            {activeTab === "manage" && <ManageContentTab />}
            {activeTab === "push" && <PushNotificationTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================= PROGRESS BAR ================= */
function ProgressBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="space-y-2">
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-text-dim text-center">{label} {progress}%</p>
    </div>
  );
}

/* ================= VIDEO UPLOAD (Supabase Storage) ================= */
function UploadVideoTab() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Music Video");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);

  const reset = () => {
    abortRef.current = true;
    setTitle("");
    setType("Music Video");
    setFile(null);
    setProgress(0);
    setIsUploading(false);
    toast("Upload cancelled");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) { toast.error("Please provide title and video file"); return; }
    setIsUploading(true);
    abortRef.current = false;
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      setProgress(30);
      if (abortRef.current) return;

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (abortRef.current) return;
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }
      setProgress(70);

      const { videoUrl, thumbnailUrl } = await response.json();
      const supabase = createClient();
      const { error } = await supabase.from("videos").insert({
        title: sanitizeInput(title), type, url: videoUrl, thumbnail_url: thumbnailUrl,
      });
      if (error) throw error;

      setProgress(100);
      toast.success("Video uploaded!");
      setTitle(""); setFile(null);
    } catch (error: any) {
      if (!abortRef.current) toast.error(error.message || "Upload failed");
    } finally {
      if (!abortRef.current) { setIsUploading(false); setProgress(0); }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">Video Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input-field">
          <option>Studio</option><option>BTS</option><option>Music Video</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">Video File (max 100MB)</label>
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/30 transition-colors">
          <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id="video-upload" />
          <label htmlFor="video-upload" className="cursor-pointer">
            <Upload className="w-8 h-8 text-text-dim mx-auto mb-2" />
            <p className="text-sm text-text-muted">{file ? file.name : "Click to upload video"}</p>
            <p className="text-xs text-text-dim mt-1">MP4, MOV, WebM up to 100MB</p>
          </label>
        </div>
      </div>
      {isUploading && <ProgressBar progress={progress} label="Uploading" />}
      <div className="flex gap-3">
        <button type="submit" disabled={isUploading} className="btn-primary flex-1">
          {isUploading ? "Uploading..." : "Upload Video"}
        </button>
        {isUploading && (
          <button type="button" onClick={reset} className="px-4 py-2 rounded-xl bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}

/* ================= SONG UPLOAD ================= */
function UploadSongTab() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [duration, setDuration] = useState(0);
  const [durationLabel, setDurationLabel] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artFile, setArtFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isReadingDuration, setIsReadingDuration] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);

  const reset = () => {
    abortRef.current = true;
    setTitle(""); setArtist(""); setDuration(0); setDurationLabel("");
    setAudioFile(null); setArtFile(null);
    setProgress(0); setIsUploading(false);
    toast("Upload cancelled");
  };

  // Reads the duration straight out of the audio file itself instead of
  // asking the admin to type it in — avoids typos and saves a step.
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAudioFile(file);
    setDuration(0);
    setDurationLabel("");
    if (!file) return;

    setIsReadingDuration(true);
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const seconds = Math.round(audio.duration);
      setDuration(seconds);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      setDurationLabel(`${mins}:${secs.toString().padStart(2, "0")}`);
      setIsReadingDuration(false);
      URL.revokeObjectURL(objectUrl);
    };
    audio.onerror = () => {
      setIsReadingDuration(false);
      toast.error("Couldn't read this audio file's duration");
      URL.revokeObjectURL(objectUrl);
    };
    audio.src = objectUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile || !artFile || !title || !artist || duration <= 0) {
      toast.error(isReadingDuration ? "Still reading the audio file, one sec..." : "Fill all fields and choose an audio file");
      return;
    }
    setIsUploading(true);
    abortRef.current = false;
    setProgress(5);

    try {
      const supabase = createClient();
      setProgress(15);
      if (abortRef.current) return;

      const audioPath = `songs/${Date.now()}_${audioFile.name}`;
      const { error: audioErr } = await supabase.storage.from("audio").upload(audioPath, audioFile);
      if (abortRef.current) return;
      if (audioErr) throw audioErr;
      setProgress(45);

      const artPath = `album-art/${Date.now()}_${artFile.name}`;
      const { error: artErr } = await supabase.storage.from("images").upload(artPath, artFile);
      if (abortRef.current) return;
      if (artErr) throw artErr;
      setProgress(75);

      const { data: { publicUrl: audioUrl } } = supabase.storage.from("audio").getPublicUrl(audioPath);
      const { data: { publicUrl: artUrl } } = supabase.storage.from("images").getPublicUrl(artPath);

      const { error } = await supabase.from("songs").insert({
        title: sanitizeInput(title),
        artist: sanitizeInput(artist),
        audio_url: audioUrl,
        album_art_url: artUrl,
        duration,
        streams: 0,
        likes: 0,
        release_date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;

      setProgress(100);
      toast.success("Song uploaded!");
      setTitle(""); setArtist(""); setDuration(0); setDurationLabel(""); setAudioFile(null); setArtFile(null);
    } catch (error: any) {
      if (!abortRef.current) toast.error(error.message || "Upload failed");
    } finally {
      if (!abortRef.current) { setIsUploading(false); setProgress(0); }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">Artist</label>
        <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} required className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">Audio (one file only)</label>
        <input type="file" accept="audio/*" onChange={handleAudioFileChange} required
          className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-accent/10 file:text-accent file:text-sm hover:file:bg-accent/20" />
        <p className="text-xs text-text-dim mt-1">
          {isReadingDuration ? "Reading duration..." : durationLabel ? `Duration: ${durationLabel} (detected automatically)` : "Duration is detected automatically from the file"}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">Album Art (one image only)</label>
        <input type="file" accept="image/*" onChange={(e) => setArtFile(e.target.files?.[0] || null)} required
          className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-accent/10 file:text-accent file:text-sm hover:file:bg-accent/20" />
      </div>
      {isUploading && <ProgressBar progress={progress} label="Uploading" />}
      <div className="flex gap-3">
        <button type="submit" disabled={isUploading || isReadingDuration} className="btn-primary flex-1">
          {isUploading ? "Uploading..." : "Upload Song"}
        </button>
        {isUploading && (
          <button type="button" onClick={reset} className="px-4 py-2 rounded-xl bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}

/* ================= GO LIVE ================= */
function GoLiveTab() {
  const [streamTitle, setStreamTitle] = useState("");
  const [twitchChannel, setTwitchChannel] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("live_streams").select("*").limit(1).single().then(({ data }) => {
      if (data) { setIsLive(data.is_live); setStreamTitle(data.title || ""); setTwitchChannel(data.twitch_channel || ""); }
    });
  }, []);

  const handleSaveChannel = async () => {
    if (!twitchChannel.trim()) { toast.error("Enter your Twitch channel name"); return; }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: existing } = await supabase.from("live_streams").select("id").limit(1).single();
      await supabase.from("live_streams").upsert({
        id: existing?.id || crypto.randomUUID(),
        twitch_channel: twitchChannel.trim(),
        title: streamTitle,
        is_live: existing ? undefined : false,
      });
      toast.success("Twitch channel saved!");
    } catch (error: any) { toast.error(error.message); }
    finally { setIsLoading(false); }
  };

  const toggleLive = async () => {
    const supabase = createClient();
    const { data: stream } = await supabase.from("live_streams").select("id").limit(1).single();
    const streamId = stream?.id;
    if (!streamId) { toast.error("Save your Twitch channel first"); return; }

    const { error } = await supabase.from("live_streams").update({
      is_live: !isLive, title: streamTitle, started_at: !isLive ? new Date().toISOString() : null,
    }).eq("id", streamId);
    if (error) toast.error("Failed to update");
    else { setIsLive(!isLive); toast.success(isLive ? "Stream ended" : "Stream is LIVE!"); }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">Stream Title</label>
        <input type="text" value={streamTitle} onChange={(e) => setStreamTitle(e.target.value)} placeholder="Enter stream title..." className="input-field" />
      </div>

      <div className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-text-muted whitespace-nowrap">Twitch Channel</span>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={twitchChannel}
              onChange={(e) => setTwitchChannel(e.target.value)}
              placeholder="your_twitch_username"
              className="input-field flex-1"
            />
            <button onClick={handleSaveChannel} disabled={isLoading} className="btn-ghost whitespace-nowrap disabled:opacity-50">
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
        <p className="text-xs text-text-dim">
          This is just your Twitch username (the part after twitch.tv/) — used to embed your stream on this site.
        </p>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="flex-1">
          <p className="font-medium text-text">Status</p>
          <p className="text-sm text-text-dim">{isLive ? "Broadcasting" : "Offline"}</p>
        </div>
        <button onClick={toggleLive} disabled={!twitchChannel}
          className={cn("px-6 py-2.5 rounded-xl font-medium transition-colors",
            isLive ? "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20" : "bg-accent text-background hover:bg-accent-dim")}>
          {isLive ? "End Stream" : "Go Live"}
        </button>
      </div>

      {twitchChannel && (
        <div className="rounded-xl bg-accent/5 border border-accent/20 p-4 space-y-2">
          <h4 className="text-sm font-medium text-accent flex items-center gap-2"><Radio className="w-4 h-4" /> OBS Settings</h4>
          <div className="space-y-1 text-sm text-text-dim font-mono">
            <p>Server: rtmp://live.twitch.tv/app</p>
            <p>Stream Key: get yours from dashboard.twitch.tv → Settings → Stream (keep it private)</p>
          </div>
          <p className="text-xs text-text-dim pt-1">
            Toggle "Go Live" here once you actually start broadcasting in OBS — it's what tells your site to show the embed.
          </p>
        </div>
      )}
    </div>
  );
}

/* ================= CREATE POST WITH ADVANCED IMAGE CROP ================= */

/* ================= MANAGE CONTENT ================= */
function ManageContentTab() {
  const [activeType, setActiveType] = useState<"songs" | "videos" | "posts">("songs");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const supabase = createClient();

  useEffect(() => {
    fetchItems();
  }, [activeType]);

  const fetchItems = async () => {
    setIsLoading(true);
    const { data } = await supabase.from(activeType).select("*").order("created_at", { ascending: false });
    setItems(data || []);
    setIsLoading(false);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete permanently?")) return;
    const { error } = await supabase.from(activeType).delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Deleted"); fetchItems(); }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const saveEdit = async () => {
    const { error } = await supabase.from(activeType).update(editData).eq("id", editingId);
    if (error) toast.error("Update failed");
    else { toast.success("Updated"); setEditingId(null); fetchItems(); }
  };

  const repostItem = async (item: any) => {
    const newItem = { ...item };
    delete newItem.id;
    delete newItem.created_at;
    newItem.title = newItem.title ? `${newItem.title} (Repost)` : "Repost";
    const { error } = await supabase.from(activeType).insert(newItem);
    if (error) toast.error("Repost failed");
    else { toast.success("Reposted"); fetchItems(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["songs", "videos", "posts"] as const).map((t) => (
          <button key={t} onClick={() => setActiveType(t)}
            className={cn("px-4 py-2 rounded-lg text-sm capitalize transition-all", activeType === t ? "bg-accent/10 text-accent" : "text-text-dim hover:bg-card-hover")}>
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader className="w-6 h-6 text-accent animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-text-dim text-center py-12">No {activeType} yet</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
              {editingId === item.id ? (
                <div className="space-y-2">
                  {activeType === "songs" && (
                    <>
                      <input value={editData.title || ""} onChange={(e) => setEditData({ ...editData, title: e.target.value })} className="input-field text-sm" placeholder="Title" />
                      <input value={editData.artist || ""} onChange={(e) => setEditData({ ...editData, artist: e.target.value })} className="input-field text-sm" placeholder="Artist" />
                    </>
                  )}
                  {activeType === "videos" && (
                    <input value={editData.title || ""} onChange={(e) => setEditData({ ...editData, title: e.target.value })} className="input-field text-sm" placeholder="Title" />
                  )}
                  {activeType === "posts" && (
                    <textarea value={editData.content || ""} onChange={(e) => setEditData({ ...editData, content: e.target.value })} className="input-field text-sm resize-none" rows={3} />
                  )}
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-sm">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg bg-surface text-text-dim text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-text text-sm truncate">
                      {item.title || item.content?.slice(0, 60) || "Untitled"}
                    </p>
                    <p className="text-xs text-text-dim mt-0.5">
                      {item.artist && `${item.artist} - `}
                      {new Date(item.created_at).toLocaleDateString()}
                      {item.duration && ` - ${formatDuration(item.duration)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-surface text-text-dim hover:text-text transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => repostItem(item)} className="p-1.5 rounded-lg hover:bg-surface text-text-dim hover:text-text transition-colors" title="Repost">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-text-dim hover:text-danger transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= WEB PUSH NOTIFICATION ================= */
function PushNotificationTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("push_subscriptions").select("*", { count: "exact", head: true }).then(({ count }) => setSubscriberCount(count || 0));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { toast.error("Fill title and body"); return; }

    setIsSending(true);
    try {
      let imageUrl = "";

      if (imageFile) {
        const supabase = createClient();
        const imgPath = `notifications/${Date.now()}_${imageFile.name}`;
        const { error: uploadErr } = await supabase.storage.from("images").upload(imgPath, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from("images").getPublicUrl(imgPath);
        imageUrl = publicUrl;
      }

      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, image: imageUrl || undefined, url: url || undefined }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send");
      }

      const result = await response.json();
      toast.success(`Notification sent to ${result.sent} of ${result.total} subscribers!`);
      setTitle(""); setBody(""); setUrl(""); setImageFile(null);
    } catch (error: any) { toast.error(error.message); }
    finally { setIsSending(false); }
  };

  return (
    <form onSubmit={handleSend} className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/5 border border-accent/20">
        <Bell className="w-4 h-4 text-accent" />
        <span className="text-sm text-accent">{subscriberCount} push subscribers</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="input-field" placeholder="Notification title..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">Body</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={3} className="input-field resize-none" placeholder="Notification message..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">Link URL (optional)</label>
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="input-field" placeholder="https://testingskarlee.netlify.app/songs" />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">Notification Image (optional, one image only)</label>
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-accent/10 file:text-accent file:text-sm hover:file:bg-accent/20" />
      </div>
      <button type="submit" disabled={isSending} className="btn-primary w-full">
        {isSending ? "Sending..." : "Send Push Notification"}
      </button>
    </form>
  );
}