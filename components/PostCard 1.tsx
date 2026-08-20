"use client";

import { formatTimeAgo } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Heart, MessageCircle, X, Repeat2, Download, Loader } from "lucide-react";
import { createClient } from "@/lib/supabase";
import toast from "react-hot-toast";
import { fetchLikedSet, toggleLike as toggleLikeRemote, subscribeLikeSync } from "@/lib/likes";
import { getFontClassName } from "@/lib/fonts";
import CommentSection from "@/components/CommentSection";
import { downloadFile, sanitizeFilename } from "@/lib/download";

interface Post {
  id: string;
  content: string;
  bg_type: string;
  bg_value: string;
  font_family: string;
  text_color: string;
  created_at: string;
  likes?: number;
  shares?: number;
  image_url?: string;
  image_position?: string;
  image_fit?: string;
  image_pos_x?: number;
  image_pos_y?: number;
}

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export default function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [shareCount, setShareCount] = useState(post.shares || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const supabase = createClient();

  // Ask the server whether this device already liked this post, and keep
  // in sync if it's liked/unliked from another tab.
  useEffect(() => {
    setLikeCount(post.likes || 0);
    setShareCount(post.shares || 0);
    fetchLikedSet(supabase, "post", [post.id]).then((set) => setLiked(set.has(post.id)));

    return subscribeLikeSync("post", (targetId, newLiked, newCount) => {
      if (targetId !== post.id) return;
      setLiked(newLiked);
      setLikeCount(newCount);
    });
  }, [post.id, post.likes, post.shares]);

  // Get an initial comment count for the badge without opening a realtime
  // subscription — CommentSection owns the live subscription once opened.
  useEffect(() => {
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "post")
      .eq("target_id", post.id)
      .then(({ count }) => setCommentCount(count || 0));
  }, [post.id]);

  const handleLike = async () => {
    // Optimistic update, corrected below by the server's authoritative result.
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));

    const result = await toggleLikeRemote(supabase, "post", post.id);
    if (!result) {
      setLiked(wasLiked);
      setLikeCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
      return;
    }
    setLiked(result.liked);
    setLikeCount(result.likeCount);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Skarlee", text: post.content, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
      const newShares = shareCount + 1;
      setShareCount(newShares);
      await supabase.from("posts").update({ shares: newShares }).eq("id", post.id);
    } catch { /* user cancelled */ }
  };

  const handleCommentToggle = () => setShowComments((v) => !v);

  const handleDownload = async () => {
    if (!post.image_url) return;
    setIsDownloading(true);
    try {
      const ext = post.image_url.split(".").pop()?.split("?")[0] || "jpg";
      await downloadFile(post.image_url, `${sanitizeFilename(post.content || "post")}.${ext}`);
    } catch {
      toast.error("Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  const renderPostContent = () => {
    const isImageBackground = post.bg_type === "image" && post.image_url;
    const isImageAbove = post.image_position === "above" && post.image_url;
    const isImageBelow = post.image_position === "below" && post.image_url;
    const isWhatsappStatus = post.image_position === "fullscreen" && post.image_url;
    const isImageOnly = post.image_position === "only" && post.image_url;
    const fontClass = getFontClassName(post.font_family);

    if (isImageOnly) {
      return (
        <div className="w-full rounded-t-2xl overflow-hidden bg-card">
          <img src={post.image_url} alt="Post" loading="lazy" decoding="async" className="w-full h-auto block" />
        </div>
      );
    }

    if (isWhatsappStatus) {
      return (
        <div className="relative w-full flex items-center justify-center overflow-hidden rounded-t-2xl bg-card">
          <img src={post.image_url} alt="Status" loading="lazy" decoding="async" className="w-full h-auto block" />
          {post.content?.trim() && post.content !== " " && (
            <div className="absolute bottom-4 left-4 right-4 z-10 px-6 py-4 bg-black/50 rounded-xl backdrop-blur-sm">
              <p className={`text-center break-words font-medium ${fontClass}`} style={{
                color: post.text_color || "#E0E0E0",
                fontSize: "clamp(0.875rem, 2.5vw, 1.25rem)", lineHeight: 1.5,
              }}>{post.content}</p>
            </div>
          )}
        </div>
      );
    }

    if (isImageBackground) {
      return (
        <div className="relative w-full flex items-center justify-center rounded-t-2xl bg-card overflow-hidden">
          <img src={post.bg_value} alt="Background" loading="lazy" decoding="async" className="w-full h-auto block" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6 sm:p-10">
            <p className={`relative z-10 text-center break-words w-full font-medium ${fontClass}`} style={{
              color: post.text_color || "#E0E0E0",
              fontSize: "clamp(1rem, 3vw, 1.5rem)", lineHeight: 1.5,
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
            }}>{post.content}</p>
          </div>
        </div>
      );
    }

    if (isImageAbove) {
      return (
        <div className="w-full rounded-t-2xl overflow-hidden">
          <img src={post.image_url} alt="Post" loading="lazy" decoding="async" className="w-full h-auto block" />
          <div className="p-6" style={{ backgroundColor: post.bg_value || "#141414" }}>
            <p className={`text-center break-words font-medium ${fontClass}`} style={{
              color: post.text_color || "#E0E0E0",
              fontSize: "clamp(0.875rem, 2.5vw, 1.25rem)", lineHeight: 1.5,
            }}>{post.content}</p>
          </div>
        </div>
      );
    }

    if (isImageBelow) {
      return (
        <div className="w-full rounded-t-2xl overflow-hidden">
          <div className="p-6" style={{ backgroundColor: post.bg_value || "#141414" }}>
            <p className={`text-center break-words font-medium ${fontClass}`} style={{
              color: post.text_color || "#E0E0E0",
              fontSize: "clamp(0.875rem, 2.5vw, 1.25rem)", lineHeight: 1.5,
            }}>{post.content}</p>
          </div>
          <img src={post.image_url} alt="Post" loading="lazy" decoding="async" className="w-full h-auto block" />
        </div>
      );
    }

    // Default text-only
    const isLightBg = post.bg_type === "solid" && !post.bg_value?.startsWith("#0") && !post.bg_value?.startsWith("#1");
    const textColor = isLightBg ? "#000000" : (post.text_color || "#E0E0E0");

    return (
      <div className="relative w-full min-h-[280px] max-h-[80vh] flex items-center justify-center p-6 sm:p-10 overflow-y-auto rounded-t-2xl"
        style={post.bg_type === "gradient" ? { background: post.bg_value } : { backgroundColor: post.bg_value || "#141414" }}>
        <p className={`text-center break-words w-full font-medium ${fontClass}`} style={{
          color: textColor,
          fontSize: "clamp(0.875rem, 2.5vw, 1.25rem)", lineHeight: 1.5,
        }}>{post.content}</p>
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {renderPostContent()}

      <div className="px-4 py-3 flex items-center justify-between border-t border-border/50 bg-card">
        <div className="flex items-center gap-4">
          <button onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-accent" : "text-text-dim hover:text-text"}`}>
            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <button onClick={handleCommentToggle}
            className={`flex items-center gap-1.5 text-sm transition-colors ${showComments ? "text-accent" : "text-text-dim hover:text-text"}`}>
            <MessageCircle className="w-4 h-4" />
            {commentCount > 0 && <span>{commentCount}</span>}
          </button>
          <button onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-text-dim hover:text-text transition-colors">
            <Repeat2 className="w-4 h-4" />
            {shareCount > 0 && <span>{shareCount}</span>}
          </button>
          {post.image_url && (
            <button onClick={handleDownload} disabled={isDownloading}
              className="flex items-center gap-1.5 text-sm text-text-dim hover:text-text transition-colors disabled:opacity-50">
              {isDownloading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
          )}
        </div>
        <span className="text-xs text-text-dim">{formatTimeAgo(post.created_at)}</span>
      </div>

      {showComments && (
        <div className="px-4 py-3 border-t border-border/50 bg-surface/50">
          <div className="flex items-center justify-end mb-1">
            <button onClick={() => setShowComments(false)} className="p-1 rounded-lg hover:bg-surface text-text-dim">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <CommentSection targetType="post" targetId={post.id} onCountChange={setCommentCount} />
        </div>
      )}
    </div>
  );
}