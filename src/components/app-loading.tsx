import Image from "next/image";

export function AppLoading() {
  return (
    <main style={{ minHeight: "100dvh", background: "#fffaf0", color: "#92400e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }} className="app-loading" role="status" aria-live="polite" aria-busy="true">
      <Image src="/icons/icon-192.png" alt="" width={88} height={88} priority className="app-loading-logo" />
      <h1>Parami</h1>
      <span className="app-loading-spinner" aria-hidden="true" />
      <p>Đang tải ứng dụng…</p>
    </main>
  );
}
