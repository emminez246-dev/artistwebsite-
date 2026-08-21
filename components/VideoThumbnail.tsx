"use client";

import { useState } from "react";
import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VideoThumbnail({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center bg-surface", className)}>
        <Film className="w-8 h-8 text-text-dim" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
