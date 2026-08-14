import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to unsubscribe" }, { status: 500 });
  }
}
