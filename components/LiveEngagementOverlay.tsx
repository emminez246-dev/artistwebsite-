"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Send } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type CommentBubble = { id: string; name: string; message: string };
type HeartPop = { id: string; xOffset: number; emoji: string };

const HEART_EMOJIS = ["❤️", "💛", "💚", "💙", "💜"];
const MAX_VISIBLE_COMMENTS = 5;
const COMMENT_LIFETIME_MS = 6000;
const HEART_LIFETIME_MS = 2200;

/**
 * Ephemeral, real-time engagement overlay for a live stream: floating
 * comments (max 5 on screen at once) and TikTok-style popping hearts.
 * Nothing here is persisted — it's a pure broadcast between whoever is
 * watching right now, via a Supabase Realtime channel.
 */
export default function LiveEngagementOverlay({ liveId, displayName }: { liveId: string; displayName: string }) {
  const [comments, setComments] = useState<CommentBubble[]>([]);
  const [hearts, setHearts] = useState<HeartPop[]>([]);
  const [message, setMessage] = useState("");
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`live-engagement-${liveId}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "comment" }, ({ payload }) => {
        const bubble: CommentBubble = payload;
        setComments((prev) => [...prev, bubble].slice(-MAX_VISIBLE_COMMENTS));
        setTimeout(() => {
          setComments((prev) => prev.filter((c) => c.id !== bubble.id));
        }, COMMENT_LIFETIME_MS);
      })
      .on("broadcast", { event: "like" }, ({ payload }) => {
        const heart: HeartPop = payload;
        setHearts((prev) => [...prev, heart]);
        setTimeout(() => {
          setHearts((prev) => prev.filter((h) => h.id !== heart.id));
        }, HEART_LIFETIME_MS);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId]);

  const sendComment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !channelRef.current) return;

    channelRef.current.send({
      type: "broadcast",
      event: "comment",
      payload: { id: crypto.randomUUID(), name: displayName, message: trimmed.slice(0, 200) },
    });
    setMessage("");
  };

  const sendLike = () => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "like",
      payload: {
        id: crypto.randomUUID(),
        xOffset: Math.round(Math.random() * 60 - 30),
        emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
      },
    });
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Floating comment bubbles, bottom-left */}
      <div className="absolute left-3 bottom-16 w-[70%] max-w-sm flex flex-col-reverse gap-2">
        {comments.map((c) => (
          <div key={c.id} className="live-comment-float bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white w-fit max-w-full">
            <span className="font-semibold text-accent">{c.name}: </span>
            <span className="break-words">{c.message}</span>
          </div>
        ))}
      </div>

      {/* Floating hearts, bottom-right */}
      <div className="absolute right-4 bottom-16 w-16 h-64 pointer-events-none">
        {hearts.map((h) => (
          <span
            key={h.id}
            className="live-heart-float absolute bottom-0 right-4 text-2xl"
            style={{ ["--x-offset" as any]: `${h.xOffset}px` }}
          >
            {h.emoji}
          </span>
        ))}
      </div>

      {/* Comment input + like button */}
      <div className="absolute left-0 right-0 bottom-0 p-3 flex items-center gap-2 pointer-events-auto bg-gradient-to-t from-black/60 to-transparent">
        <form onSubmit={sendComment} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say something..."
            maxLength={200}
            className="flex-1 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white placeholder:text-white/50 border border-white/10 focus:outline-none focus:border-accent/50"
          />
          <button type="submit" disabled={!message.trim()} className="p-2 rounded-full bg-accent text-background disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </form>
        <button onClick={sendLike} className="p-2.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 active:scale-90 transition-transform">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
        </button>
      </div>
    </div>
  );
}
