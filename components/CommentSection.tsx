"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { formatTimeAgo, sanitizeInput } from "@/lib/utils";
import { Send, User, MessageSquare } from "lucide-react";
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
}

export default function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchComments();
    const channel = supabase
      .channel(`comments-${targetType}-${targetId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `target_type=eq.${targetType}&target_id=eq.${targetId}` },
        (payload) => setComments((prev) => [payload.new as Comment, ...prev]))
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
      <h2 className="text-base font-semibold text-text mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-accent" />
        Comments <span className="text-text-dim text-sm">({comments.length})</span>
      </h2>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 mb-5">
        {isLoading ? (
          <p className="text-text-dim text-center py-6 text-sm">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-text-dim text-center py-6 text-sm">No comments yet. Be the first!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-3 rounded-xl bg-surface border border-border/30">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 border border-accent/20">
                <User className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-text text-sm">{comment.author_name}</span>
                  <span className="text-xs text-text-dim">{formatTimeAgo(comment.created_at)}</span>
                </div>
                <p className="text-text-muted text-sm break-words">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text" placeholder="Your name" value={authorName} onChange={(e) => setAuthorName(e.target.value)}
          maxLength={50} className="input-field text-sm"
        />
        <div className="flex gap-2">
          <input
            type="text" placeholder="Write a comment..." value={content} onChange={(e) => setContent(e.target.value)}
            maxLength={500} className="input-field text-sm flex-1"
          />
          <button type="submit" disabled={isSubmitting} className="btn-primary px-4">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
