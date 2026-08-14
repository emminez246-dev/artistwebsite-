export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      videos: {
        Row: { id: string; title: string; type: string; url: string; thumbnail_url: string; created_at: string; };
        Insert: { id?: string; title: string; type: string; url: string; thumbnail_url: string; created_at?: string; };
      };
      songs: {
        Row: { id: string; title: string; artist: string; audio_url: string; album_art_url: string; duration: number; created_at: string; };
        Insert: { id?: string; title: string; artist: string; audio_url: string; album_art_url: string; duration: number; created_at?: string; };
      };
      posts: {
        Row: { id: string; content: string; bg_type: string; bg_value: string; font_family: string; text_color: string; created_at: string; };
        Insert: { id?: string; content: string; bg_type: string; bg_value: string; font_family: string; text_color: string; created_at?: string; };
      };
      comments: {
        Row: { id: string; target_type: string; target_id: string; author_name: string; content: string; created_at: string; };
        Insert: { id?: string; target_type: string; target_id: string; author_name: string; content: string; created_at?: string; };
      };
      live_streams: {
        Row: { id: string; is_live: boolean; stream_key: string | null; title: string | null; started_at: string | null; };
        Insert: { id?: string; is_live?: boolean; stream_key?: string; title?: string; started_at?: string | null; };
      };
      push_subscribers: {
        Row: { id: string; endpoint: string; p256dh: string; auth: string; };
        Insert: { id?: string; endpoint: string; p256dh: string; auth: string; };
      };
    };
  };
}
