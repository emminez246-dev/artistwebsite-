"use client";

const KEY = "skarlee_device_id";

/**
 * Returns a stable, random id for this browser. Generated once and stored in
 * localStorage, so it's shared across every tab/window on this device (no
 * account needed) and survives reloads. It's what stops a device from liking
 * the same item twice.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
