import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { InternalCampaignReport } from "@/components/internal-campaign-report";
import { getInternalCampaignReport, INTERNAL_REPORT_KEY } from "@/lib/internal-campaign-report";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Tổng hợp thiện pháp | Parami",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function InternalReportPage({ params }: { params: Promise<{ accessKey: string }> }) {
  const { accessKey } = await params;
  if (accessKey !== INTERNAL_REPORT_KEY) notFound();
  const campaigns = await getInternalCampaignReport();
  return (
    <main className="min-h-screen bg-[#fffaf5] px-3 py-5 text-zinc-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex items-center gap-4 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:p-6">
          <Image src="/parami-logo.png" alt="Parami" width={72} height={72} priority className="h-16 w-16 shrink-0 rounded-full" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Pāramī Group</p>
            <h1 className="mt-1 text-xl font-semibold sm:text-2xl">Tổng hợp thiện pháp</h1>
            <p className="mt-1 text-sm text-stone-500">Theo dõi các thiện pháp của nhóm · Chỉ xem</p>
          </div>
        </header>
        <InternalCampaignReport campaigns={campaigns} />
        <p className="text-center text-xs text-stone-500">Số liệu cập nhật khi mở hoặc tải lại trang.</p>
      </div>
    </main>
  );
}
