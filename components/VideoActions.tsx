"use client";

import { useState } from "react";
import { Download, Loader } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import { downloadFile, sanitizeFilename } from "@/lib/download";
import toast from "react-hot-toast";

export default function VideoActions({
  videoId,
  title,
  videoUrl,
  shareCount,
}: {
  videoId: string;
  title: string;
  videoUrl: string;
  shareCount: number;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const ext = videoUrl.split(".").pop()?.split("?")[0] || "mp4";
      await downloadFile(videoUrl, `${sanitizeFilename(title)}.${ext}`);
    } catch {
      toast.error("Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <ShareButton
        targetType="video"
        targetId={videoId}
        title={title}
        url={typeof window !== "undefined" ? window.location.href : "/"}
        shareCount={shareCount}
        className="px-3 py-2 rounded-xl bg-surface hover:bg-card-hover"
      />
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface text-text-dim hover:text-text transition-colors disabled:opacity-50"
      >
        {isDownloading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span className="text-sm">Download</span>
      </button>
    </div>
  );
}
