"use client";

import { groupCampaigns } from "@/lib/campaign-groups";
import { useState } from "react";
import { Check, Copy, ExternalLink, Search } from "lucide-react";
import type { InternalCampaignSummary } from "@/lib/internal-campaign-report";
import { normalizeTransferText } from "@/lib/text";

const money = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;

export function InternalCampaignReport({ campaigns }: { campaigns: InternalCampaignSummary[] }) {
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [query, setQuery] = useState("");
  const { current: active, settled: completed } = groupCampaigns(campaigns);
  const selected = tab === "active" ? active : completed;
  const normalized = normalizeTransferText(query);
  const visible = selected.filter((campaign) => normalizeTransferText(`${campaign.code} ${campaign.name}`).includes(normalized));


  return (
    <section className="space-y-4">
      <div aria-label="Trạng thái thiện pháp" className="grid grid-cols-2 gap-2">
        {([
          ["active", "Đang hoạt động / còn số dư", active.length],
          ["completed", "Hoàn tất · hết số dư", completed.length],
        ] as const).map(([value, label, count]) => (
          <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold ${tab === value ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}>
            {label} <span className="ml-1 text-xs opacity-80">({count})</span>
          </button>
        ))}
      </div>
      <label className="relative block">
        <span className="sr-only">Tìm thiện pháp theo tên hoặc mã</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc mã thiện pháp…"
          className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
      </label>
      <p role="status" className="text-xs text-stone-500">Hiển thị {visible.length}/{selected.length} thiện pháp</p>
      <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white md:block">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">{tab === "active" ? "Thiện pháp đang hoạt động hoặc còn số dư" : "Thiện pháp hoàn tất và hết số dư"}</caption>
          <colgroup><col style={{ width: "45%" }} /><col style={{ width: "17%" }} /><col style={{ width: "17%" }} /><col style={{ width: "21%" }} /></colgroup>
          <thead className="bg-stone-100 text-xs text-stone-600"><tr><th scope="col" className="p-3">Thiện pháp</th><th scope="col" className="p-3 text-right">Tổng thu</th><th scope="col" className="p-3 text-right">Tổng chi</th><th scope="col" className="p-3 text-right">Còn lại</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {visible.map((campaign) => (
              <tr key={campaign.code} className="hover:bg-emerald-50/40">
                <td className="break-words p-3"><CampaignLink campaign={campaign} /></td>
                <td className="break-words p-3 text-right tabular-nums text-emerald-700">{money(campaign.income)}</td>
                <td className="break-words p-3 text-right tabular-nums text-amber-700">{money(campaign.expenses)}</td>
                <td className="break-words p-3 text-right font-semibold tabular-nums">{money(campaign.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 md:hidden">
        {visible.map((campaign) => (
          <article key={campaign.code} className="rounded-xl border border-stone-200 bg-white p-3">
            <CampaignLink campaign={campaign} />
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-100 pt-2 text-xs">
              {([ ["Thu", campaign.income], ["Chi", campaign.expenses], ["Còn lại", campaign.balance] ] as const).map(([label, amount]) => (
                <div key={label} className="min-w-0"><dt className="text-stone-500">{label}</dt><dd className="mt-1 break-words font-semibold tabular-nums">{money(amount)}</dd></div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      {visible.length === 0 && <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">Không tìm thấy thiện pháp phù hợp.</p>}
    </section>
  );
}

function CampaignLink({ campaign }: { campaign: InternalCampaignSummary }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const path = `/thien-phap/${encodeURIComponent(campaign.code)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div className="min-w-0">
      <a href={`/thien-phap/${encodeURIComponent(campaign.code)}`} target="_blank" rel="noreferrer" className="break-words font-medium leading-5 text-zinc-900 hover:text-emerald-700 hover:underline">
        {campaign.name} <ExternalLink aria-hidden="true" className="inline h-3 w-3" />
      </a>
      <div className="mt-1 flex items-center gap-2">
        <p className="min-w-0 break-all font-mono text-xs text-stone-500">{campaign.code}{campaign.status === "PAUSED" ? " · Tạm dừng" : campaign.status === "COMPLETED" ? " · Hoàn tất" : ""}</p>
        <button type="button" onClick={copyLink} aria-label={`Sao chép link thiện pháp ${campaign.code}`} title="Sao chép link"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700">
          {copyState === "copied" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
      <p role="status" className={`text-xs ${copyState === "error" ? "text-red-700" : "text-emerald-700"}`}>
        {copyState === "copied" ? "Đã sao chép link" : copyState === "error" ? "Không thể sao chép. Bạn có thể sao chép địa chỉ từ link thiện pháp ở trên." : ""}
      </p>
    </div>
  );
}
