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
import { SITE_NAME, SITE_URL } from "@/lib/site";

interface Props { params: { id: string } }

// Deduped so generateMetadata and the page component below share one
// database round trip instead of fetching the same video twice.
const getVideo = cache(async (id: string) => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("videos").select("*").eq("id", id).single();
  return data;
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
          <div className="mb-6"><VideoPlayer src={video.url} poster={video.thumbnail_url} /></div>
          <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 mb-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium border border-accent/20">{video.type}</span>
                </div>
                <h1 className="text-2xl font-bold text-text">{video.title}</h1>
              </div>
              <div className="flex items-center gap-2">
                <VideoLikeButton videoId={video.id} initialLikes={video.likes || 0} />
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
