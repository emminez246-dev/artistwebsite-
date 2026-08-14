"use client";

import { triggerBlobDownload, sanitizeFilename } from "@/lib/download";

type Song = {
  title: string;
  artist: string;
  audio_url: string;
  album_art_url?: string;
};

/**
 * Downloads a song with ID3v2 tags (title, artist, album art) written into
 * the file, so whatever plays it — phone music app, car stereo, desktop
 * player — shows the right title/artist/art instead of just a filename.
 * Falls back to a plain, untagged download if tagging fails for any reason
 * (e.g. the file isn't actually an MP3), so downloading never breaks.
 */
export async function downloadSongWithTags(song: Song): Promise<void> {
  const filename = `${sanitizeFilename(song.artist)} - ${sanitizeFilename(song.title)}.mp3`;

  const audioResponse = await fetch(song.audio_url);
  if (!audioResponse.ok) throw new Error("Couldn't fetch the song file");
  const audioBuffer = await audioResponse.arrayBuffer();

  try {
    const isMp3 =
      audioResponse.headers.get("content-type")?.includes("mpeg") ||
      song.audio_url.toLowerCase().endsWith(".mp3");
    if (!isMp3) throw new Error("Not an MP3 — skipping tag embedding");

    // @ts-ignore — see types/browser-id3-writer.d.ts for the fallback shape
    const { default: ID3Writer } = await import("browser-id3-writer");
    const writer = new ID3Writer(audioBuffer);
    writer.setFrame("TIT2", song.title).setFrame("TPE1", [song.artist]).setFrame("TALB", song.artist);

    if (song.album_art_url) {
      const artResponse = await fetch(song.album_art_url);
      if (artResponse.ok) {
        const artBuffer = await artResponse.arrayBuffer();
        const artType = artResponse.headers.get("content-type") || "image/jpeg";
        writer.setFrame("APIC", {
          type: 3, // front cover
          data: artBuffer,
          description: "Cover",
          useUnicodeEncoding: false,
        } as any);
        void artType;
      }
    }

    writer.addTag();
    const taggedBlob = writer.getBlob();
    triggerBlobDownload(taggedBlob, filename);
  } catch (err) {
    // Tagging failed (not an MP3, format issue, etc.) — still give the user
    // their download, just without embedded metadata.
    console.warn("ID3 tagging skipped:", err);
    triggerBlobDownload(new Blob([audioBuffer]), filename);
  }
}
