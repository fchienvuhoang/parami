"use client";

import { HeartHandshake, Search, Sparkles } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { PublicCampaignData, PublicCampaignTransaction } from "@/lib/public-campaign";
import { normalizeTransferText } from "@/lib/text";

const statusLabels = {
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn tất",
};

const statusClassNames = {
  ACTIVE: "border-rose-200 bg-rose-50 text-rose-700",
  PAUSED: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

export function PublicCampaignView({ data }: { data: PublicCampaignData }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeTransferText(query);

  const filteredTransactions = useMemo(() => {
    if (!normalizedQuery) {
      return [...data.transactions].sort(compareTransactionNewestFirst);
    }

    return data.transactions.filter((transaction) => {
      return normalizeTransferText(transaction.description).includes(normalizedQuery);
    }).sort(compareTransactionNewestFirst);
  }, [data.transactions, normalizedQuery]);

  return (
    <div className="min-h-screen bg-[#fff8f3] text-zinc-950">
      <header className="relative overflow-hidden border-b border-rose-100 bg-[#fff1ea]">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />

        <div className="relative mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-12 lg:py-14">
          <div>
            <div className="flex items-center gap-4 sm:gap-5">
              <Image
                src="/parami-logo.png"
                alt="Logo Pāramī Group"
                width={112}
                height={112}
                priority
                className="h-20 w-20 shrink-0 rounded-full border-2 border-white object-cover shadow-lg shadow-rose-950/10 sm:h-28 sm:w-28"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-rose-950 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-rose-200" />
                  Thiện pháp <span className="font-mono text-rose-100">{data.code}</span>
                </span>
                <span className={`rounded-full border bg-white/70 px-3 py-1.5 text-xs font-medium backdrop-blur ${statusClassNames[data.status]}`}>
                  {statusLabels[data.status]}
                </span>
              </div>
            </div>

            <div className="mt-7 flex items-start gap-4">
              <span className="hidden rounded-2xl bg-white/70 p-3 text-rose-700 shadow-sm ring-1 ring-rose-100 backdrop-blur sm:block">
                <HeartHandshake className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">Cùng gieo duyên lành</p>
                <h1 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-rose-950 sm:text-4xl">
                  {data.name}
                </h1>
                {data.description ? (
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">{data.description}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-xl shadow-rose-950/5 backdrop-blur">
            <div className="border-b border-rose-100 bg-rose-950 px-5 py-5 text-white">
              <p className="text-xs font-medium uppercase tracking-wider text-rose-200">Tịnh tài hiện còn</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{money(data.balance)}</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-rose-100">
              <HeroStat label="Đã hùn phước" value={money(data.income)} tone="rose" />
              <HeroStat label="Đã cúng dường" value={money(data.expenses)} tone="amber" />
            </div>
            <div className="flex items-center justify-between border-t border-rose-100 px-5 py-3 text-xs text-stone-500">
              <span>Số lượt hùn phước</span>
              <span className="font-semibold text-rose-950">{data.transactionCount.toLocaleString("vi-VN")}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:px-6">
        <section className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">Danh sách giao dịch</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {filteredTransactions.length.toLocaleString("vi-VN")} / {data.transactions.length.toLocaleString("vi-VN")} giao dịch
              </p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên hoặc nội dung"
                className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2 md:hidden">
            {filteredTransactions.map((transaction) => (
              <PublicTransactionCard key={transaction.id} transaction={transaction} />
            ))}
            {filteredTransactions.length === 0 ? <EmptyState /> : null}
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-md border border-zinc-200 md:block">
            <div className="max-h-[680px] overflow-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Ngày</th>
                    <th className="px-3 py-2">Nội dung chuyển khoản</th>
                    <th className="px-3 py-2">Loại</th>
                    <th className="px-3 py-2 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {filteredTransactions.map((transaction) => (
                    <PublicTransactionRow key={transaction.id} transaction={transaction} />
                  ))}
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <EmptyState />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function PublicTransactionCard({ transaction }: { transaction: PublicCampaignTransaction }) {
  const meta = transactionMeta(transaction);

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs tabular-nums text-zinc-500">{transactionDateTime(transaction.transactionDate)}</div>
          <div className={`mt-1 inline-flex rounded-md border px-2 py-1 text-xs font-medium ${meta.className}`}>
            {meta.label}
          </div>
        </div>
        <div className={`whitespace-nowrap text-right text-sm font-semibold ${meta.amountClassName}`}>
          {money(meta.amount)}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
        {transaction.description}
      </p>
    </article>
  );
}

function PublicTransactionRow({ transaction }: { transaction: PublicCampaignTransaction }) {
  const meta = transactionMeta(transaction);

  return (
    <tr className="hover:bg-zinc-50">
      <td className="whitespace-nowrap px-3 py-2 align-top tabular-nums text-zinc-600">{transactionDateTime(transaction.transactionDate)}</td>
      <td className="max-w-2xl px-3 py-2 align-top">
        <div className="whitespace-pre-wrap break-words font-medium text-zinc-900">{transaction.description}</div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-top">
        <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${meta.className}`}>
          {meta.label}
        </span>
      </td>
      <td className={`whitespace-nowrap px-3 py-2 text-right align-top font-semibold ${meta.amountClassName}`}>
        {money(meta.amount)}
      </td>
    </tr>
  );
}

function EmptyState() {
  return <div className="px-3 py-10 text-center text-sm text-zinc-500">Không có giao dịch phù hợp.</div>;
}

function HeroStat({ label, value, tone }: { label: string; value: string; tone: "rose" | "amber" }) {
  const color = tone === "rose" ? "text-rose-700" : "text-amber-700";

  return (
    <div className="px-5 py-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`mt-1 text-sm font-semibold sm:text-base ${color}`}>{value}</div>
    </div>
  );
}

function transactionMeta(transaction: PublicCampaignTransaction) {
  if (transaction.creditAmount > 0) {
    return {
      label: "Hùn phước",
      amount: transaction.creditAmount,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      amountClassName: "text-zinc-950",
    };
  }

  return {
    label: "Cúng dường",
    amount: transaction.debitAmount,
    className: "border-red-200 bg-red-50 text-red-700",
    amountClassName: "text-red-700",
  };
}

function compareTransactionNewestFirst(left: PublicCampaignTransaction, right: PublicCampaignTransaction) {
  const dateDifference = new Date(right.transactionDate).getTime() - new Date(left.transactionDate).getTime();
  if (dateDifference !== 0) {
    return dateDifference;
  }

  const createdAtDifference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  if (createdAtDifference !== 0) {
    return createdAtDifference;
  }

  return (right.statementRow ?? 0) - (left.statementRow ?? 0);
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function transactionDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
