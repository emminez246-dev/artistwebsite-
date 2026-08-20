// Set NEXT_PUBLIC_SITE_URL in your hosting provider's environment variables
// once you're on your real domain (e.g. https://skarlee.com). Search
// engines use this for canonical URLs, sitemaps, and Open Graph tags — an
// inconsistent or wrong URL here actively hurts indexing, so keep it
// pointed at whatever domain you actually want ranked.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://testingskarlee.netlify.app").replace(/\/+$/, "");

export const SITE_NAME = "Skarlee";

export const SITE_KEYWORDS = [
  "Skarlee",
  "Skarlee music",
  "Skarlee songs",
  "Skarlee artist",
  "Skarlee Uganda",
  "Ugandan musician",
  "Ugandan artist",
  "independent artist Uganda",
  "Uganda music",
  "African music",
  "new music 2026",
  "Skarlee live",
  "Skarlee videos",
  "Skarlee official",
];

export const SITE_DESCRIPTION =
  "Skarlee — independent musician, producer, and visual artist from Uganda. Stream new songs and music videos, watch live streams, and follow the latest drops.";
