"use client";

/**
 * Downloads a file from any origin with a filename we control. A plain
 * <a download> only respects the filename for same-origin URLs — for
 * cross-origin storage URLs (Supabase, etc.) the browser ignores it, so we
 * fetch the bytes ourselves and download from a local blob: URL instead.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Download failed");
  const blob = await response.blob();
  triggerBlobDownload(blob, filename);
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** Strips characters that are unsafe in filenames across OSes. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 150) || "download";
}
