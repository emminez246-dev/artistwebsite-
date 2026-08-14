import Navigation from "@/components/Navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import { Play } from "lucide-react";

export default async function VideosPage() {
  const supabase = await createServerSupabaseClient();
  const { data: videos } = await supabase.from("videos").select("*").order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-text mb-8">Video Library</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {videos?.map((video) => (
              <Link key={video.id} href={`/video/${video.id}`} className="group rounded-2xl bg-card border border-border overflow-hidden hover-lift">
                <div className="relative aspect-video">
                  <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-10 h-10 text-accent" />
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-lg bg-accent/20 text-accent text-xs font-medium border border-accent/30 backdrop-blur-sm">{video.type}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-text group-hover:text-accent transition-colors">{video.title}</h3>
                </div>
              </Link>
            ))}
          </div>
          {(!videos || videos.length === 0) && (
            <div className="text-center py-24">
              <p className="text-text-dim">No videos yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
