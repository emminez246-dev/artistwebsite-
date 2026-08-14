"use client";

const KEY = "skarlee_display_name";

export function getDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, name.trim().slice(0, 24));
}
