"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Radio } from "lucide-react";
import Navigation from "@/components/Navigation";
import PostCard from "@/components/PostCard";

interface Post {
  id: string;
  content: string;
  bg_type: string;
  bg_value: string;
  font_family: string;
  text_color: string;
  created_at: string;
  likes ? : number;
  shares ? : number;
  image_url ? : string;
  image_position ? : string;
}

export default function PostsPage() {
  const [posts, setPosts] = useState < Post[] > ([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    fetchPosts();
  }, []);
  
  const fetchPosts = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    setPosts(data || []);
    setIsLoading(false);
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16 pb-12">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-text mb-8 flex items-center gap-2">
            <Radio className="w-6 h-6 text-accent" /> Updates
          </h1>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-24">
              <Radio className="w-12 h-12 text-text-dim mx-auto mb-4" />
              <p className="text-text-dim">No posts yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}