"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import toast from "react-hot-toast";
import { subscribeToPush, getExistingSubscription } from "@/lib/push-notifications";

const DISMISS_KEY = "skarlee_notif_prompt_dismissed";

/**
 * A friendly banner asking to enable notifications — shown before the
 * browser's native permission dialog, the way most sites do it. Only
 * appears when permission hasn't been decided yet and the user hasn't
 * already dismissed it or subscribed.
 */
export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (Notification.permission !== "default") return; // already granted or denied

    getExistingSubscription().then((sub) => {
      if (!sub) {
        // Small delay so it doesn't compete with the initial page render.
        const timer = setTimeout(() => setVisible(true), 2500);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const handleAllow = async () => {
    setIsSubscribing(true);
    try {
      const result = await subscribeToPush();
      if (result.success) {
        toast.success("Subscribed to notifications!");
        setVisible(false);
      } else {
        // If they dismiss the native dialog, don't nag again this session.
        dismiss();
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-40 bg-card border border-border rounded-2xl shadow-xl p-4 notif-prompt-in">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Bell className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text">Get notified about new drops</p>
          <p className="text-xs text-text-dim mt-0.5">New music, videos, and live streams — right when they go up.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleAllow} disabled={isSubscribing} className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50">
              {isSubscribing ? "..." : "Allow"}
            </button>
            <button onClick={dismiss} className="text-xs px-4 py-1.5 rounded-xl text-text-dim hover:text-text transition-colors">
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="p-1 text-text-dim hover:text-text flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
