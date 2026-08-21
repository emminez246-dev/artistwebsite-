import Navigation from "@/components/Navigation";
import VideoPlayer from "@/components/VideoPlayer";
import CommentSection from "@/components/CommentSection";
import VideoLikeButton from "@/components/VideoLikeButton";
import VideoActions from "@/components/VideoActions";
import JsonLd from "@/components/JsonLd";
import { createServerSupabaseClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { MessageSquare } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";

interface Props { params: { id: string } }

// Deduped so generateMetadata and the page component below share one
// database round trip instead of fetching the same video twice.
const getVideo = cache(async (id: string) => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("videos").select("*").eq("id", id).single();
  return data;
});

const getCommentCount = cache(async (id: string) => {
  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("target_type", "video")
    .eq("target_id", id);
  return count || 0;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const video = await getVideo(params.id);
  if (!video) return {};

  const title = video.title;
  const description = `Watch "${video.title}" by ${SITE_NAME} — ${video.type || "video"}. Stream now.`;
  const url = `${SITE_URL}/video/${video.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "video.other",
      title,
      description,
      url,
      images: video.thumbnail_url ? [{ url: video.thumbnail_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: video.thumbnail_url ? [video.thumbnail_url] : undefined,
    },
  };
}

export default async function VideoDetailPage({ params }: Props) {
  const video = await getVideo(params.id);
  if (!video) notFound();
  const commentCount = await getCommentCount(params.id);

  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: video.title,
          description: `${video.title} by ${SITE_NAME}`,
          thumbnailUrl: video.thumbnail_url ? [video.thumbnail_url] : undefined,
          uploadDate: video.created_at,
          contentUrl: video.url,
          embedUrl: `${SITE_URL}/video/${video.id}`,
          author: { "@type": "MusicGroup", name: SITE_NAME },
        }}
      />
      <Navigation />
      <main className="pt-16">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-8 sm:px-6 lg:px-8">
          <div className="mb-5"><VideoPlayer src={video.url} poster={video.thumbnail_url} /></div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[11px] font-medium border border-accent/20 uppercase tracking-wide">{video.type}</span>
            </div>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <h1 className="text-lg sm:text-xl font-semibold text-text leading-snug">{video.title}</h1>
              <div className="flex items-center gap-1.5">
                <VideoLikeButton videoId={video.id} initialLikes={video.likes || 0} />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-text-dim text-sm">
                  <MessageSquare className="w-4 h-4" />
                  {commentCount > 0 && <span>{commentCount}</span>}
                </div>
                <VideoActions videoId={video.id} title={video.title} videoUrl={video.url} shareCount={video.shares || 0} />
              </div>
            </div>
          </div>

          <CommentSection targetType="video" targetId={video.id} />
        </div>
      </main>
    </div>
  );
}
