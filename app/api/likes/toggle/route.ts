import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// A pseudonymous, non-reversible-in-practice stand-in for the visitor's IP.
// We never store the raw IP — just enough to rate-limit repeat likes from
// the same network without identifying anyone.
const IP_SALT = process.env.IP_HASH_SALT || "skarlee-like-rate-limit";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`${IP_SALT}:${ip}`).digest("hex");
}

function getClientIp(req: NextRequest): string | null {
  // Netlify/most proxies set one of these; take the first hop.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-nf-client-connection-ip") || null;
}

export async function POST(req: NextRequest) {
  try {
    const { targetType, targetId, deviceId } = await req.json();

    if (!targetType || !targetId || !deviceId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!["song", "post", "video"].includes(targetType)) {
      return NextResponse.json({ error: "Invalid target type" }, { status: 400 });
    }

    const ip = getClientIp(req);
    const ipHash = ip ? hashIp(ip) : null;

    // Uses the anon key deliberately, not the service-role key — the
    // toggle_like function is SECURITY DEFINER and already grants exactly
    // the access this needs, nothing more.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .rpc("toggle_like", {
        p_target_type: targetType,
        p_target_id: targetId,
        p_device_id: deviceId,
        p_ip_hash: ipHash,
      })
      .single();

    if (error) {
      if (error.message?.includes("rate_limited")) {
        return NextResponse.json(
          { error: "Too many likes from this network — try again later" },
          { status: 429 }
        );
      }
      throw error;
    }

    const result = data as { liked: boolean; like_count: number };
    return NextResponse.json({ liked: result.liked, likeCount: result.like_count });
  } catch (error: any) {
    console.error("Like toggle error:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle like" }, { status: 500 });
  }
}
