"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLoading } from "@/components/app-loading";

export function PwaLaunch() {
  const router = useRouter();
  useEffect(() => {
    const candidate = new URLSearchParams(window.location.search).get("next") ?? "/";
    const target = new URL(candidate, window.location.origin);
    const next = target.origin === window.location.origin ? target.pathname + target.search : "/";
    router.replace(next.startsWith("/khoi-dong") ? "/" : next);
  }, [router]);
  return <AppLoading />;
}
