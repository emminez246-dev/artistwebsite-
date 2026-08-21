"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { formatTimeAgo, sanitizeInput } from "@/lib/utils";
import { Send, MessageSquare, Pencil } from "lucide-react";
import toast from "react-hot-toast";

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface CommentSectionProps {
  targetType: string;
  targetId: string;
  onCountChange?: (count: number) => void;
}

const NAME_KEY = "skarlee_commenter_name";

// A stable, pleasant color per name so the same person's initials always
// look the same, without needing real avatars.
const AVATAR_COLORS = ["#00FF88", "#4ECDC4", "#45B7D1", "#DDA0DD", "#F7DC6F", "#FF7675", "#74B9FF", "#FDCB6E"];
function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initialsForName(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}

export default function CommentSection({ targetType, targetId, onCountChange }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [isEditingName, setIsEditingName] = useState(true);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) {
      setAuthorName(saved);
      setIsEditingName(false);
    }
  }, []);

  useEffect(() => {
    fetchComments();
    // Channel name is unique to this component instance so it can never
    // collide with another subscription elsewhere on the same target.
    const channel = supabase
      .channel(`comments-${targetType}-${targetId}-section`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `target_type=eq.${targetType}&target_id=eq.${targetId}` },
        (payload) => setComments((prev) => {
          const next = [payload.new as Comment, ...prev];
          onCountChange?.(next.length);
          return next;
        }))
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [targetType, targetId]);

  const fetchComments = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("comments").select("*")
      .eq("target_type", targetType).eq("target_id", targetId)
      .order("created_at", { ascending: false });
    setComments(data || []);
    onCountChange?.((data || []).length);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeInput(authorName).trim();
    const cleanContent = sanitizeInput(content).trim();

    if (!cleanName) { toast.error("Please enter your name"); return; }
    if (!cleanContent) { toast.error("Please enter a comment"); return; }
    if (cleanName.length > 50) { toast.error("Name too long"); return; }
    if (cleanContent.length > 500) { toast.error("Comment too long"); return; }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, author_name: cleanName, content: cleanContent }),
      });
      if (!response.ok) throw new Error("Failed to post");
      localStorage.setItem(NAME_KEY, cleanName);
      setIsEditingName(false);
      setContent("");
      toast.success("Comment posted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-accent" />
        Comments
        <span className="text-text-dim font-normal">{comments.length > 0 ? `· ${comments.length}` : ""}</span>
      </h2>

      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 mb-5">
        {isLoading ? (
          <p className="text-text-dim text-center py-8 text-sm">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-text-dim text-center py-8 text-sm">No comments yet — be the first to say something.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold text-background"
                style={{ backgroundColor: colorForName(comment.author_name) }}
              >
                {initialsForName(comment.author_name)}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-medium text-text text-sm">{comment.author_name}</span>
                  <span className="text-xs text-text-dim">{formatTimeAgo(comment.created_at)}</span>
                </div>
                <p className="text-text-muted text-sm break-words leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 border-t border-border/50 pt-4">
        {isEditingName ? (
          <input
            type="text" placeholder="Your name" value={authorName} onChange={(e) => setAuthorName(e.target.value)}
            maxLength={50} className="input-field text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingName(true)}
            className="flex items-center gap-1.5 text-xs text-text-dim hover:text-text transition-colors"
          >
            Commenting as <span className="font-medium text-text">{authorName}</span>
            <Pencil className="w-3 h-3" />
          </button>
        )}
        <div className="flex gap-2">
          <input
            type="text" placeholder="Write a comment..." value={content} onChange={(e) => setContent(e.target.value)}
            maxLength={500} className="input-field text-sm flex-1"
          />
          <button type="submit" disabled={isSubmitting} className="btn-primary px-4 disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
