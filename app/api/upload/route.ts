import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase-server";
import { sanitizeInput } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    // This route runs with the Supabase service-role key (bypasses RLS), so
    // it must never be reachable without an authenticated admin session —
    // middleware.ts only guards /admin pages, not /api routes.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const thumbnail = formData.get("thumbnail") as File | null;
    const title = formData.get("title") as string;
    const videoType = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("video/") && !file.type.startsWith("image/")) {
      return NextResponse.json({ message: "File must be a video or image" }, { status: 400 });
    }

    // Validate file size (100MB max for Supabase free tier)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ message: "File too large (max 100MB)" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Determine bucket based on file type
    const isVideo = file.type.startsWith("video/");
    const bucket = isVideo ? "videos" : "images";

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === bucket);

    if (!bucketExists) {
      await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 524288000, // 500MB
        allowedMimeTypes: isVideo
          ? ["video/mp4", "video/webm", "video/quicktime"]
          : ["image/png", "image/jpeg", "image/webp", "image/gif"],
      });
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
    const fileName = `${bucket}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    // Real video thumbnails require an actual frame image — Supabase has no
    // built-in video-to-image transform, so the browser captures one via
    // <canvas> at upload time (see lib/video-thumbnail.ts) and sends it here
    // as a second file. Appending resize query params to the video's own
    // URL (the previous approach) never worked: an <img> tag can't render
    // an .mp4 no matter what query string is attached to it.
    let thumbnailUrl: string | null = isVideo ? null : publicUrl;
    if (isVideo && thumbnail) {
      const thumbFileName = `thumbnails/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
      const { error: thumbError } = await supabase.storage
        .from("images")
        .upload(thumbFileName, thumbnail, { contentType: "image/jpeg", upsert: false });
      if (!thumbError) {
        const { data: { publicUrl: thumbPublicUrl } } = supabase.storage.from("images").getPublicUrl(thumbFileName);
        thumbnailUrl = thumbPublicUrl;
      } else {
        console.error("Thumbnail upload error:", thumbError);
      }
    }

    // For videos specifically, insert the database row here too — using the
    // same service-role client that just uploaded the file — instead of
    // leaving a second, separate insert for the browser to do afterward.
    // That second step was the actual source of the RLS error: it ran with
    // the browser's authenticated session, which Postgres RLS applies to,
    // unlike this server route.
    if (isVideo && title) {
      const { error: insertError } = await supabase.from("videos").insert({
        title: sanitizeInput(title),
        type: videoType || "Music Video",
        url: publicUrl,
        thumbnail_url: thumbnailUrl,
      });
      if (insertError) {
        console.error("Video row insert error:", insertError);
        throw new Error(`Video uploaded but saving its details failed: ${insertError.message}`);
      }
    }

    return NextResponse.json({
      videoUrl: publicUrl,
      thumbnailUrl: thumbnailUrl,
      fileName: fileName,
      size: file.size,
      title: title || "Untitled",
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { message: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}