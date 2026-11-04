"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Server-rendered with inline critical styles so it paints before app CSS/JS.
export function BootScreen() {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  if (ready) return null;
  return (
    <div role="status" aria-live="polite" style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#fffaf0", color: "#92400e", fontFamily: "system-ui, sans-serif" }}>
      <span style={{ fontSize: 24, fontWeight: 600 }}>Parami</span>
      <span style={{ fontSize: 14 }}>Đang tải ứng dụng…</span>
    </div>
  );
}
