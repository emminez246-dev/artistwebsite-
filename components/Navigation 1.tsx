"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Music, Video, Radio, FileText, User, Home, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { subscribeToPush, unsubscribeFromPush, getExistingSubscription } from "@/lib/push-notifications";
import SocialLinks from "@/components/SocialLinks";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/songs", label: "Music", icon: Music },
  { href: "/videos", label: "Videos", icon: Video },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/posts", label: "Posts", icon: FileText },
  { href: "/bio", label: "Bio", icon: User },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const pathname = usePathname();
  
  useEffect(() => {
    checkSubscription();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  
  const checkSubscription = async () => {
    // Check for a real, active subscription rather than just browser
    // permission, so a failed/undone subscribe doesn't show as "Subscribed".
    const subscription = await getExistingSubscription();
    setIsSubscribed(!!subscription);
  };
  
  const handleSubscribe = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("Notifications not supported in this browser");
      return;
    }
    
    setIsSubscribing(true);
    try {
      const result = await subscribeToPush();
      if (!result.success) {
        const messages: Record<string, string> = {
          unsupported: "Notifications not supported in this browser",
          "no-vapid-key": "Notifications aren't configured yet — try again later",
          "permission-denied": "Notifications are blocked for this site. Tap the lock icon next to the address bar → Permissions → allow Notifications, then try again.",
          "permission-dismissed": "You'll need to allow notifications when prompted to subscribe",
          "server-error": "Couldn't save your subscription — try again in a moment",
        };
        toast.error(messages[result.reason] || "Subscribe failed", { duration: 6000 });
        return;
      }
      setIsSubscribed(true);
      toast.success("Subscribed to notifications!");
    } catch (error: any) {
      toast.error(error.message || "Subscribe failed");
    } finally {
      setIsSubscribing(false);
    }
  };
  
  const handleUnsubscribe = async () => {
    try {
      const ok = await unsubscribeFromPush();
      if (!ok) throw new Error();
      setIsSubscribed(false);
      toast.success("Unsubscribed");
    } catch {
      toast.error("Unsubscribe failed");
    }
  };
  
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 -ml-2 rounded-xl hover:bg-card-hover transition-colors">
              {isOpen ? <X className="w-5 h-5 text-text" /> : <Menu className="w-5 h-5 text-text" />}
            </button>
            <Link href="/" className="font-bold text-lg text-accent tracking-tight">Skarlee</Link>
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium uppercase tracking-wider">
                Independent Artist
              </span>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider",
                isOnline ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            {/* Desktop Social Links */}
            <div className="hidden md:flex items-center ml-1">
              <SocialLinks iconClassName="w-8 h-8" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSubscribed ? (
              <button onClick={handleSubscribe} disabled={isSubscribing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 text-accent border border-accent/20 text-xs font-medium hover:bg-accent/20 transition-colors disabled:opacity-50">
                <Bell className="w-3.5 h-3.5" /> {isSubscribing ? "..." : "Subscribe"}
              </button>
            ) : (
              <button onClick={handleUnsubscribe}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600/20 text-green-400 border border-green-500/30 text-xs font-medium hover:bg-green-600/30 transition-colors">
                <BellOff className="w-3.5 h-3.5" /> Subscribed
              </button>
            )}
          </div>
        </div>
      </header>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <nav className="fixed top-14 left-0 bottom-0 w-[280px] max-w-[80vw] z-50 bg-card border-r border-border/50 overflow-y-auto">
            <div className="p-4 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)}
                    className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isActive ? "bg-accent/10 text-accent" : "text-text-dim hover:text-text hover:bg-card-hover")}>
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
            {/* Mobile Social Links */}
            <div className="p-4 border-t border-border/50">
              <p className="text-xs text-text-dim mb-2 uppercase tracking-wider">Follow Skarlee</p>
              <SocialLinks />
            </div>
          </nav>
        </>
      )}
    </>
  );
}