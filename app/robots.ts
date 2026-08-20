import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The custom admin path (see middleware.ts / NEXT_PUBLIC_ADMIN_PATH)
        // is deliberately left out of this list — listing it here would be
        // the same mistake as putting it in a public sitemap.
        disallow: ["/admin", "/api/", "/login"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
