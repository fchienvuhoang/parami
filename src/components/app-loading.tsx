import Image from "next/image";

export function AppLoading() {
  return (
    <main className="app-loading" role="status" aria-live="polite" aria-busy="true">
      <Image src="/icons/icon-192.png" alt="" width={88} height={88} priority className="app-loading-logo" />
      <h1>Parami</h1>
      <span className="app-loading-spinner" aria-hidden="true" />
      <p>Đang tải ứng dụng…</p>
    </main>
  );
}
