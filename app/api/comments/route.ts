import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { target_type, target_id, author_name, content } = await req.json();

    if (!target_type || !target_id || !author_name?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    if (author_name.length > 50 || content.length > 500) {
      return NextResponse.json({ error: "Name or content too long" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.from("comments").insert({
      target_type,
      target_id,
      author_name: author_name.trim(),
      content: content.trim(),
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, comment: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to post comment" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const target_type = searchParams.get("target_type");
    const target_id = searchParams.get("target_id");

    if (!target_type || !target_id) {
      return NextResponse.json({ error: "target_type and target_id required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("target_type", target_type)
      .eq("target_id", target_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ comments: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}