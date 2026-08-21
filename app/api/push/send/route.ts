import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createServerSupabaseClient, getUser } from "@/lib/supabase-server";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
// A contact address VAPID requires so push services can reach you about issues.
const vapidContact = process.env.VAPID_CONTACT_EMAIL || "mailto:admin@example.com";

// A valid VAPID public key is a base64url-encoded uncompressed P-256 point:
// exactly 65 bytes, which base64url-encodes to 87 characters (no padding).
// Catching a malformed key here up front turns a confusing per-subscriber
// failure loop into one clear, immediate error message.
function isValidVapidPublicKey(key: string): boolean {
  return /^[A-Za-z0-9\-_]{87}$/.test(key);
}

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidContact, vapidPublicKey, vapidPrivateKey);
}

export async function POST(req: NextRequest) {
  try {
    // Broadcasting to every subscriber is an admin-only action.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: "VAPID keys not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)" },
        { status: 500 }
      );
    }

    if (!isValidVapidPublicKey(vapidPublicKey)) {
      return NextResponse.json(
        {
          error:
            "NEXT_PUBLIC_VAPID_PUBLIC_KEY doesn't look like a valid VAPID key (expected 87 base64url characters). " +
            "Public and private VAPID keys must be generated together as a matching pair — if you regenerated one without the other, this is why sends silently fail.",
        },
        { status: 500 }
      );
    }

    const { title, body, image, url } = await req.json();
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "Title and body required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: subs, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (subError) throw subError;
    if (!subs || subs.length === 0) {
      return NextResponse.json({ error: "No subscribers found" }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: title.trim(),
      body: body.trim(),
      image: image || undefined,
      url: url || "/",
    });

    let sent = 0;
    let failed = 0;
    const deadEndpoints: string[] = [];
    // Full detail per subscriber, so a failure is debuggable instead of a
    // black box — this is what actually gets returned to the admin UI now.
    const failures: { endpoint: string; statusCode?: number; message: string }[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        const shortEndpoint = sub.endpoint.replace(/^https?:\/\//, "").slice(0, 40) + "...";
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent++;
        } catch (err: any) {
          failed++;
          const statusCode = err?.statusCode;
          const message = err?.body || err?.message || "Unknown error";
          console.error(`Push failed for ${shortEndpoint}: [${statusCode}] ${message}`);
          failures.push({ endpoint: shortEndpoint, statusCode, message });

          // 404/410 = the subscription is gone (user cleared data, uninstalled, etc.)
          if (statusCode === 404 || statusCode === 410) {
            deadEndpoints.push(sub.endpoint);
          }
        }
      })
    );

    if (deadEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
    }

    return NextResponse.json({ success: true, sent, failed, total: subs.length, failures });
  } catch (error: any) {
    console.error("Push send route error:", error);
    return NextResponse.json({ error: error.message || "Failed to send notifications" }, { status: 500 });
  }
}
