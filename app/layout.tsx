import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import { AudioPlayerProvider } from "@/components/CustomAudioPlayer";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import NotificationPrompt from "@/components/NotificationPrompt";
import JsonLd from "@/components/JsonLd";
import { SITE_URL, SITE_NAME, SITE_KEYWORDS, SITE_DESCRIPTION } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Official Website`,
    // Lets every page set its own <title>, e.g. "Song Name — Skarlee",
    // while still ending in the brand name for consistent search results.
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Official Website`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Official Website`,
    description: SITE_DESCRIPTION,
    images: ["/icons/icon-512.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google AdSense - Replace ca-pub-PLACEHOLDER with your actual ID */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-PLACEHOLDER"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.variable} font-inter bg-background text-text min-h-screen`}>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "MusicGroup",
            name: SITE_NAME,
            url: SITE_URL,
            genre: "Afro-fusion",
            description: SITE_DESCRIPTION,
            foundingLocation: { "@type": "Place", name: "Uganda" },
            sameAs: [
              "https://www.tiktok.com/@thee_skarlee",
              "https://x.com/thee_skarlee",
              "https://www.instagram.com/thee_skarlee",
              "https://www.youtube.com/@thee_skarlee",
            ],
          }}
        />
        <ServiceWorkerRegister />
        <NotificationPrompt />
        <AudioPlayerProvider>
          {/* Top Ad Banner */}
          <div className="w-full flex justify-center py-2 bg-background">
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "320px", height: "50px" }}
              data-ad-client="ca-pub-PLACEHOLDER"
              data-ad-slot="PLACEHOLDER"
            />
          </div>

          {children}

          {/* Bottom Ad Banner */}
          <div className="w-full flex justify-center py-2 pb-20 bg-background">
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "320px", height: "50px" }}
              data-ad-client="ca-pub-PLACEHOLDER"
              data-ad-slot="PLACEHOLDER"
            />
          </div>

          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "#141414",
                color: "#E0E0E0",
                border: "1px solid #1F1F1F",
                borderRadius: "12px",
                padding: "12px 16px",
              },
              success: { iconTheme: { primary: "#00FF88", secondary: "#0A0A0A" } },
              error: { iconTheme: { primary: "#FF4444", secondary: "#0A0A0A" } },
            }}
          />
        </AudioPlayerProvider>
      </body>
    </html>
  );
}