import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import { AudioPlayerProvider } from "@/components/CustomAudioPlayer";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skarlee — Official Website",
  description: "Official website. Music, videos, live streams, and exclusive content.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Skarlee",
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
        <ServiceWorkerRegister />
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