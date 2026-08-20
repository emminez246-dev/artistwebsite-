import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/site";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Official Website | Music, Videos & Live Streams`,
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `${SITE_NAME} — Official Website`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESCRIPTION,
        }}
      />
      <HomeClient />
    </>
  );
}
