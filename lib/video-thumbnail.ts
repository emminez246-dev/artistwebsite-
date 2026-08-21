"use client";

/**
 * Captures a frame from a video file as a JPEG blob, for use as a
 * thumbnail. There's no server-side video processing in this stack
 * (no ffmpeg available in the Netlify functions runtime), so the frame is
 * grabbed client-side, in the browser, at upload time.
 */
export function captureVideoThumbnail(file: File, atSeconds = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    video.onloadedmetadata = () => {
      // Don't seek past the end of very short clips.
      video.currentTime = Math.min(atSeconds, Math.max(0, video.duration - 0.1));
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) resolve(blob);
          else reject(new Error("Failed to capture thumbnail"));
        },
        "image/jpeg",
        0.85
      );
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video for thumbnail capture"));
    };
  });
}
