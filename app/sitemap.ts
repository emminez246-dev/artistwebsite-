import type { MetadataRoute } from "next";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600; // regenerate at most once an hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/songs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/videos`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/posts`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/live`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/bio`, changeFrequency: "monthly", priority: 0.8 },
  ];

  try {
    const supabase = await createServerSupabaseClient();
    const { data: videos } = await supabase
      .from("videos")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    const videoRoutes: MetadataRoute.Sitemap = (videos || []).map((v) => ({
      url: `${SITE_URL}/video/${v.id}`,
      lastModified: v.created_at ? new Date(v.created_at) : undefined,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...videoRoutes];
  } catch {
    // If Supabase is unreachable at build time, still ship the static routes
    // rather than failing the whole sitemap.
    return staticRoutes;
  }
}
