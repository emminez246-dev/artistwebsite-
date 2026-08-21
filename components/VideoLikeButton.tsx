"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import { fetchLikedSet, toggleLike, subscribeLikeSync } from "@/lib/likes";

export default function VideoLikeButton({
  videoId,
  initialLikes,
}: {
  videoId: string;
  initialLikes: number;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikes || 0);
  const supabase = createClient();

  useEffect(() => {
    fetchLikedSet(supabase, "video", [videoId]).then((set) => setLiked(set.has(videoId)));
    return subscribeLikeSync("video", (targetId, newLiked, newCount) => {
      if (targetId !== videoId) return;
      setLiked(newLiked);
      setLikeCount(newCount);
    });
  }, [videoId]);

  const handleClick = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));

    const result = await toggleLike(supabase, "video", videoId);
    if (!result) {
      setLiked(wasLiked);
      setLikeCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
      return;
    }
    setLiked(result.liked);
    setLikeCount(result.likeCount);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors",
        liked
          ? "bg-accent/10 text-accent border-accent/30"
          : "bg-surface text-text-dim border-border hover:text-text"
      )}
    >
      <Heart className={cn("w-4 h-4", liked && "fill-current")} />
      {likeCount > 0 && <span>{likeCount}</span>}
    </button>
  );
}
