"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Radio, AlertCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import JoinLiveGate from "@/components/JoinLiveGate";
import LiveEngagementOverlay from "@/components/LiveEngagementOverlay";

export default function LivePage() {
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    setHostname(window.location.hostname);
    fetchLiveStream();
    const interval = setInterval(fetchLiveStream, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveStream = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("live_streams")
        .select("*")
        .eq("is_live", true)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setStream(data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-16 flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </main>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-16 flex flex-col items-center justify-center min-h-[80vh]">
          <Radio size={48} className="text-text-dim mb-4" />
          <h1 className="text-2xl font-bold text-text mb-2">Currently Offline</h1>
          <p className="text-text-dim text-center px-4">No live stream is active right now. Check back later!</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16 pb-12">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <span className="text-sm font-bold text-white">LIVE</span>
            </div>
            <h1 className="text-xl font-bold text-text truncate">{stream.title || "Live Stream"}</h1>
          </div>

          <JoinLiveGate>
            {(name) =>
              stream.twitch_channel && hostname ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-border">
                  <iframe
                    src={`https://player.twitch.tv/?channel=${encodeURIComponent(stream.twitch_channel)}&parent=${hostname}&muted=false`}
                    className="w-full h-full"
                    allowFullScreen
                  />
                  <LiveEngagementOverlay liveId={stream.id} displayName={name} />
                </div>
              ) : (
                <div className="aspect-video bg-card rounded-2xl flex items-center justify-center border border-border">
                  <div className="text-center">
                    <AlertCircle size={32} className="mx-auto mb-2 text-yellow-500" />
                    <p className="text-text-dim">Stream is starting...</p>
                  </div>
                </div>
              )
            }
          </JoinLiveGate>

          <div className="mt-4 text-sm text-text-dim">
            Started: {stream.started_at ? new Date(stream.started_at).toLocaleString() : "Just now"}
          </div>
        </div>
      </main>
    </div>
  );
}
