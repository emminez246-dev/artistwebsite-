import Navigation from "@/components/Navigation";
import VideoPlayer from "@/components/VideoPlayer";
import CommentSection from "@/components/CommentSection";
import VideoLikeButton from "@/components/VideoLikeButton";
import VideoActions from "@/components/VideoActions";
import { createServerSupabaseClient } from "@/lib/supabase";
import { notFound } from "next/navigation";

interface Props { params: { id: string } }

export default async function VideoDetailPage({ params }: Props) {
  const supabase = await createServerSupabaseClient();
  const { data: video } = await supabase.from("videos").select("*").eq("id", params.id).single();
  if (!video) notFound();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
