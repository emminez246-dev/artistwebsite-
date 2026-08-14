"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getDeviceId } from "@/lib/device-id";

export type LikeTargetType = "song" | "post" | "video";

type LikeSyncMessage = {
  targetType: LikeTargetType;
  targetId: string;
  liked: boolean;
  likeCount: number;
};

// Lets other tabs/windows on the same device update instantly when a like is
// toggled here, without waiting on a network round trip.
const CHANNEL_NAME = "skarlee-likes";
function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  return new BroadcastChannel(CHANNEL_NAME);
}

/** Fetch which of the given target ids this device has already liked. */
export async function fetchLikedSet(
  supabase: SupabaseClient,
  targetType: LikeTargetType,
  targetIds: string[]
): Promise<Set<string>> {
  if (targetIds.length === 0) return new Set();
  const deviceId = getDeviceId();
  if (!deviceId) return new Set();

  const { data, error } = await supabase.rpc("get_liked", {
    p_target_type: targetType,
    p_target_ids: targetIds,
    p_device_id: deviceId,
  });

  if (error) {
    console.error("fetchLikedSet error:", error);
    return new Set();
  }
  return new Set((data ?? []).map((row: { target_id: string }) => row.target_id));
}

/** Toggle a like for one item. Returns the authoritative new state from the server. */
export async function toggleLike(
  supabase: SupabaseClient,
  targetType: LikeTargetType,
  targetId: string
): Promise<{ liked: boolean; likeCount: number } | null> {
  const deviceId = getDeviceId();
  if (!deviceId) return null;

  const { data, error } = await supabase
    .rpc("toggle_like", {
      p_target_type: targetType,
      p_target_id: targetId,
      p_device_id: deviceId,
    })
    .single();

  if (error || !data) {
    console.error("toggleLike error:", error);
    return null;
  }

  const result = data as { liked: boolean; like_count: number };
  const payload: LikeSyncMessage = {
    targetType,
    targetId,
    liked: result.liked,
    likeCount: result.like_count,
  };
  getChannel()?.postMessage(payload);
  getChannel()?.close();

  return { liked: result.liked, likeCount: result.like_count };
}

/**
 * Listen for like toggles made in other tabs/windows of this same browser
 * for a given target type. Returns an unsubscribe function.
 */
export function subscribeLikeSync(
  targetType: LikeTargetType,
  onChange: (targetId: string, liked: boolean, likeCount: number) => void
): () => void {
  const channel = getChannel();
  if (!channel) return () => {};

  const handler = (event: MessageEvent<LikeSyncMessage>) => {
    if (event.data.targetType !== targetType) return;
    onChange(event.data.targetId, event.data.liked, event.data.likeCount);
  };

  channel.addEventListener("message", handler);
  return () => {
    channel.removeEventListener("message", handler);
    channel.close();
  };
}
