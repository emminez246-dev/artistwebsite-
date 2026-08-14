import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createServerSupabaseClient, getUser } from "@/lib/supabase-server";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
// A contact address VAPID requires so push services can reach you about issues.
const vapidContact = process.env.VAPID_CONTACT_EMAIL || "mailto:admin@example.com";

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

    await Promise.all(
      subs.map(async (sub) => {
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
          // 404/410 = the subscription is gone (user cleared data, uninstalled, etc.)
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            deadEndpoints.push(sub.endpoint);
          }
        }
      })
    );

    if (deadEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
    }

    return NextResponse.json({ success: true, sent, failed, total: subs.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to send notifications" }, { status: 500 });
  }
}
