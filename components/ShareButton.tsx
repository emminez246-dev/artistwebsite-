"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ShareButton({
  targetType,
  targetId,
  title,
  text,
  url,
  shareCount,
  onShared,
  className,
}: {
  targetType: "song" | "post" | "video";
  targetId: string;
  title: string;
  text?: string;
  url: string;
  shareCount: number;
  onShared?: (newCount: number) => void;
  className?: string;
}) {
  const [count, setCount] = useState(shareCount);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }

      const newCount = count + 1;
      setCount(newCount);
      onShared?.(newCount);

      const supabase = createClient();
      const table = `${targetType}s`;
      await supabase.from(table).update({ shares: newCount }).eq("id", targetId);
    } catch {
      // User cancelled the native share sheet — not an error.
    }
  };

  return (
    <button
      onClick={handleShare}
      className={cn("flex items-center gap-1.5 text-sm text-text-dim hover:text-text transition-colors", className)}
    >
      <Share2 className="w-4 h-4" />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
