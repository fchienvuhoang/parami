"use client";

import {
  AlertCircle,
  ArrowUpFromLine,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  LogOut,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type React from "react";
import type {
  CampaignSummary,
  DashboardData,
  DashboardState,
  TransactionSummary,
} from "@/lib/dashboard";
import { normalizeTransferText, splitKeywords } from "@/lib/text";

type Props = {
  state: DashboardState;
};

type ImportResponse = {
  sourceLabel: string;
  totalRows: number;
  insertedRows: number;
  duplicateRows: number;
  unmatchedRows: number;
  accountNumber: string | null;
  closingBalance: number | null;
};

type CampaignModalState =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      campaign: CampaignSummary;
    };

const statusLabels = {
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn tất",
};

const statusClassNames = {
  ACTIVE: "border-indigo-200 bg-indigo-50 text-indigo-700",
  PAUSED: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

export function DashboardShell({ state }: Props) {
  if (!state.ok) {
    return <SetupScreen state={state} />;
  }

  return <Dashboard data={state.data} />;
}

function Dashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<"overview" | "transactions">("overview");
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [isReclassifying, setIsReclassifying] = useState(false);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);
  const [campaignModal, setCampaignModal] = useState<CampaignModalState | null>(null);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [isSavingOpeningBalance, setIsSavingOpeningBalance] = useState(false);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = normalizeTransferText(query);

    return data.transactions.filter((transaction) => {
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "unmatched" && !transaction.campaign) ||
        transaction.campaign?.id === activeTab;

      if (!matchesTab) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return normalizeTransferText(
        `${transaction.description} ${transaction.transactionCode} ${transaction.campaign?.name ?? ""}`,
      ).includes(normalizedQuery);
    }).sort(compareTransactionNewestFirst);
  }, [activeTab, data.transactions, query]);

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setImportResult(null);
    setIsImporting(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const json = await readJson<ImportResponse>(response);
      setImportResult(json);
      setMessage(`Đã import ${json.insertedRows}/${json.totalRows} giao dịch mới.`);
      form.reset();
      router.refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsImporting(false);
    }
  }

  async function handleCampaignCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSavingCampaign(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const payload = campaignPayloadFromForm(formData);
      await readJson(
        await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );
      setMessage(`Đã tạo thiện pháp ${payload.code}.`);
      form.reset();
      setCampaignModal(null);
      router.refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsSavingCampaign(false);
    }
  }

  async function handleCampaignUpdate(event: FormEvent<HTMLFormElement>, campaignId: string) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSavingCampaign(true);

    try {
      const formData = new FormData(event.currentTarget);
      const payload = campaignPayloadFromForm(formData);
      await readJson(
        await fetch(`/api/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );
      setMessage(`Đã cập nhật thiện pháp ${payload.code}.`);
      setCampaignModal(null);
      router.refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsSavingCampaign(false);
    }
  }

  async function handleCampaignDelete(campaign: CampaignSummary) {
    if (campaign.transactionCount > 0) {
      setError("Chỉ có thể xóa thiện pháp chưa có giao dịch sao kê.");
      setMessage(null);
      return;
    }

    const confirmed = window.confirm(`Xóa thiện pháp "${campaign.code}"? Hành động này sẽ xóa cả bộ từ khóa.`);
    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);
    setDeletingCampaignId(campaign.id);

    try {
      await readJson(
        await fetch(`/api/campaigns/${campaign.id}`, {
          method: "DELETE",
        }),
      );
      setMessage(`Đã xóa thiện pháp ${campaign.code}.`);
      setCampaignModal(null);
      router.refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setDeletingCampaignId(null);
    }
  }

  async function handleReclassify() {
    setError(null);
    setMessage(null);
    setIsReclassifying(true);

    try {
      const result = await readJson<{ totalRows: number; matchedRows: number; unmatchedRows: number }>(
        await fetch("/api/reclassify", { method: "POST" }),
      );
      setMessage(
        `Đã phân loại lại ${result.totalRows} giao dịch: ${result.matchedRows} khớp, ${result.unmatchedRows} chưa khớp.`,
      );
      router.refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsReclassifying(false);
    }
  }

  async function assignTransaction(transactionId: string, campaignId: string | null) {
    setError(null);
    setMessage(null);
    setPendingTransactionId(transactionId);

    try {
      await readJson(
        await fetch(`/api/transactions/${transactionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId }),
        }),
      );
      router.refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPendingTransactionId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/dang-nhap");
    router.refresh();
  }

  async function handleOpeningBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSavingOpeningBalance(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const allocations = data.campaigns.map((campaign) => ({
        campaignId: campaign.id,
        amount: parseMoneyInput(formData.get(`campaign-${campaign.id}`)),
      }));
      await readJson(
        await fetch("/api/settings/opening-balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cutoffDate: String(formData.get("cutoffDate") ?? ""),
            bankBalance: parseMoneyInput(formData.get("bankBalance")),
            note: String(formData.get("note") ?? ""),
            confirmation: String(formData.get("confirmation") ?? ""),
            allocations,
          }),
        }),
      );
      setMessage("Đã chốt số dư đầu kỳ. Mốc này đã được khóa.");
      setShowSystemSettings(false);
      router.refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsSavingOpeningBalance(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6ff] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              {data.workspace} statement classifier
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950">
              Quản lý thiện pháp và sao kê
            </h1>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <HeaderStat label="Giao dịch" value={data.overview.transactionCount.toLocaleString("vi-VN")} />
              <HeaderStat label="Chưa phân loại" value={data.overview.unmatchedCount.toLocaleString("vi-VN")} />
              <HeaderStat
                label="TK ngân hàng"
                value={money(data.overview.bankBalance)}
                tone="indigo"
              />
              <HeaderStat
                label="Quỹ theo thiện pháp"
                value={money(data.overview.trackedFundBalance)}
                tone="amber"
              />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 self-start rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 lg:self-end"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <StatusMessages message={message} error={error} />

        <Panel>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <PanelTitle icon={Upload} title="Import sao kê" />
              <form className="mt-4 grid gap-3" onSubmit={handleImport}>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center hover:border-indigo-400 hover:bg-indigo-50/40">
                  <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
                  <span className="text-sm font-medium text-zinc-800">Chọn file sao kê {data.workspace}</span>
                  <span className="text-xs text-zinc-500">
                    {data.workspace === "VIB" ? "File Excel .xlsx" : "File PDF BIDV"}, tối đa 10 MB
                  </span>
                  <input
                    name="statementFile"
                    type="file"
                    accept={data.workspace === "VIB"
                      ? ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      : ".pdf,application/pdf"}
                    required
                    className="mt-1 block max-w-full text-xs text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:font-medium file:text-indigo-700"
                  />
                </label>
                <button
                  disabled={isImporting}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Import file {data.workspace === "VIB" ? "Excel" : "PDF"}
                </button>
              </form>
              {data.latestImport ? (
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Lần import gần nhất: {data.latestImport.sourceLabel}, {dateTime(data.latestImport.importedAt)}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 xl:w-80">
              <button
                type="button"
                onClick={() => setCampaignModal({ mode: "create" })}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
              >
                <Plus className="h-4 w-4" />
                Thêm thiện pháp
              </button>
              {importResult ? (
                <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    {importResult.sourceLabel}
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-2">
                    <StatLine label="Mới" value={importResult.insertedRows} />
                    <StatLine label="Trùng" value={importResult.duplicateRows} />
                    <StatLine label="Tổng dòng" value={importResult.totalRows} />
                    <StatLine label="Chưa khớp" value={importResult.unmatchedRows} />
                  </dl>
                </div>
              ) : null}
            </div>
          </div>
        </Panel>

        <section className="space-y-5">
          <div className="flex gap-2 rounded-md border border-zinc-200 bg-white p-1">
            <MainTabButton
              active={mainTab === "overview"}
              count={data.campaigns.length}
              onClick={() => setMainTab("overview")}
            >
              Tổng quan thiện pháp
            </MainTabButton>
            <MainTabButton
              active={mainTab === "transactions"}
              count={data.overview.transactionCount}
              onClick={() => setMainTab("transactions")}
            >
              Giao dịch sao kê
            </MainTabButton>
          </div>

          {mainTab === "overview" ? (
            <>
              <Panel>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <PanelTitle icon={Settings} title="Danh sách thiện pháp" />
                  <button
                    onClick={handleReclassify}
                    disabled={isReclassifying}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isReclassifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Phân loại lại
                  </button>
                </div>
                <CampaignTable
                  campaigns={data.campaigns}
                  onSelect={(campaign) => setCampaignModal({ mode: "edit", campaign })}
                />
              </Panel>

              <Panel>
                <PanelTitle icon={Wallet} title="Tổng hợp thu chi" />
                <FundSummaryTable data={data} />
              </Panel>

              <Panel>
                <PanelTitle icon={ArrowUpFromLine} title="Danh sách khoản chi từ sao kê" />
                <DebitTransactionTable
                  transactions={data.debitTransactions}
                  campaigns={data.campaigns}
                  pendingTransactionId={pendingTransactionId}
                  onAssign={assignTransaction}
                />
              </Panel>
            </>
          ) : (
            <Panel>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <PanelTitle icon={FileSpreadsheet} title="Giao dịch sao kê" />
                <div className="relative w-full lg:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm nội dung, mã giao dịch..."
                    className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                <TabButton
                  active={activeTab === "all"}
                  count={data.overview.transactionCount}
                  onClick={() => setActiveTab("all")}
                >
                  Tất cả
                </TabButton>
                <TabButton
                  active={activeTab === "unmatched"}
                  count={data.overview.unmatchedCount}
                  onClick={() => setActiveTab("unmatched")}
                >
                  Chưa phân loại
                </TabButton>
                {data.campaigns.map((campaign) => (
                  <TabButton
                    key={campaign.id}
                    active={activeTab === campaign.id}
                    count={campaign.transactionCount}
                    onClick={() => setActiveTab(campaign.id)}
                  >
                    {campaign.code}
                  </TabButton>
                ))}
              </div>

              <TransactionTable
                transactions={filteredTransactions}
                campaigns={data.campaigns}
                pendingTransactionId={pendingTransactionId}
                onAssign={assignTransaction}
              />
            </Panel>
          )}
        </section>
        {campaignModal ? (
          <CampaignModal
            state={campaignModal}
            isSaving={isSavingCampaign}
            isDeleting={campaignModal.mode === "edit" && deletingCampaignId === campaignModal.campaign.id}
            onClose={() => setCampaignModal(null)}
            onCreate={handleCampaignCreate}
            onUpdate={handleCampaignUpdate}
            onDelete={handleCampaignDelete}
          />
        ) : null}
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => setShowSystemSettings(true)}
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-indigo-700"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Cài đặt hệ thống
          </button>
        </div>
        {showSystemSettings ? (
          <OpeningBalanceModal
            data={data}
            isSaving={isSavingOpeningBalance}
            onClose={() => setShowSystemSettings(false)}
            onSubmit={handleOpeningBalance}
          />
        ) : null}
      </main>
    </div>
  );
}

function TransactionTable({
  transactions,
  campaigns,
  pendingTransactionId,
  onAssign,
}: {
  transactions: TransactionSummary[];
  campaigns: CampaignSummary[];
  pendingTransactionId: string | null;
  onAssign: (transactionId: string, campaignId: string | null) => void;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-zinc-200">
      <div className="max-h-[620px] overflow-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Ngày</th>
              <th className="px-3 py-2">Diễn giải</th>
              <th className="px-3 py-2">Chi tiết</th>
              <th className="px-3 py-2 text-right">Có</th>
              <th className="px-3 py-2 text-right">Nợ</th>
              <th className="px-3 py-2">Thiện pháp</th>
              <th className="px-3 py-2">Gán</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className={transaction.campaign ? "hover:bg-zinc-50" : "bg-rose-50/50 hover:bg-rose-50"}
              >
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-zinc-600">{transactionDateTime(transaction.transactionDate)}</td>
                <td className="max-w-md px-3 py-2 align-top">
                  <div className="whitespace-pre-wrap break-words font-medium text-zinc-900">
                    {transaction.description}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {transaction.matchedKeyword ?? "Chưa có keyword khớp"}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-zinc-600">
                  {transaction.transactionCode}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-indigo-700">
                  {transaction.creditAmount > 0 ? money(transaction.creditAmount) : "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-amber-700">
                  {transaction.debitAmount > 0 ? money(transaction.debitAmount) : "-"}
                </td>
                <td className="px-3 py-2">
                  {transaction.campaign ? (
                    <span className="inline-flex rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      {transaction.campaign.code}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                      Chưa phân loại
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={transaction.campaign?.id ?? ""}
                    disabled={pendingTransactionId === transaction.id}
                    onChange={(event) => onAssign(transaction.id, event.target.value || null)}
                    className="w-44 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Chưa phân loại</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.code}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-zinc-500">
                  Không có giao dịch phù hợp.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CampaignTable({
  campaigns,
  onSelect,
}: {
  campaigns: CampaignSummary[];
  onSelect: (campaign: CampaignSummary) => void;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-zinc-200">
      <div className="overflow-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Mã</th>
              <th className="px-3 py-2">Thiện pháp</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2">Từ khóa</th>
              <th className="px-3 py-2 text-right">Tổng thu</th>
              <th className="px-3 py-2 text-right">Tổng chi</th>
              <th className="px-3 py-2 text-right">Còn lại</th>
              <th className="px-3 py-2 text-right">GD</th>
              <th className="px-3 py-2 text-right">Link công khai</th>
              <th className="px-3 py-2 text-right">Sửa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {campaigns.map((campaign) => (
              <tr
                key={campaign.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(campaign)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(campaign);
                  }
                }}
                className="cursor-pointer hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none"
              >
                <td className="whitespace-nowrap px-3 py-2">
                  <span className="rounded-md bg-zinc-950 px-2 py-1 font-mono text-xs font-medium text-white">
                    {campaign.code}
                  </span>
                </td>
                <td className="max-w-xs px-3 py-2">
                  <div className="font-medium text-zinc-900">{campaign.name}</div>
                  {campaign.description ? (
                    <div className="mt-1 line-clamp-1 text-xs text-zinc-500">{campaign.description}</div>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className={`rounded-md border px-2 py-1 text-xs font-medium ${statusClassNames[campaign.status]}`}>
                    {statusLabels[campaign.status]}
                  </span>
                </td>
                <td className="max-w-xs px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {campaign.keywords.slice(0, 4).map((keyword) => (
                      <span key={keyword.id} className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                        {keyword.keyword}
                      </span>
                    ))}
                    {campaign.keywords.length > 4 ? (
                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-500">
                        +{campaign.keywords.length - 4}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-indigo-700">
                  {money(campaign.income)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-amber-700">
                  {money(campaign.expenses)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-zinc-950">
                  {money(campaign.balance)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-zinc-600">
                  {campaign.transactionCount.toLocaleString("vi-VN")}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <a
                    href={publicCampaignPath(campaign.code)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Thí chủ xem
                  </a>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-zinc-500">
                  <Settings className="ml-auto h-4 w-4" />
                </td>
              </tr>
            ))}
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-zinc-500">
                  Chưa có thiện pháp nào.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DebitTransactionTable({
  transactions,
  campaigns,
  pendingTransactionId,
  onAssign,
}: {
  transactions: TransactionSummary[];
  campaigns: CampaignSummary[];
  pendingTransactionId: string | null;
  onAssign: (transactionId: string, campaignId: string | null) => void;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-zinc-200">
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Ngày</th>
              <th className="px-3 py-2">Diễn giải</th>
              <th className="px-3 py-2">Chi tiết</th>
              <th className="px-3 py-2 text-right">Nợ</th>
              <th className="px-3 py-2">Thiện pháp</th>
              <th className="px-3 py-2">Gán</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className={transaction.campaign ? "hover:bg-zinc-50" : "bg-amber-50/60 hover:bg-amber-50"}
              >
                <td className="whitespace-nowrap px-3 py-2 align-top text-zinc-600">
                  {dateOnly(transaction.transactionDate)}
                </td>
                <td className="max-w-md px-3 py-2 align-top">
                  <div className="whitespace-pre-wrap break-words font-medium text-zinc-900">
                    {transaction.description}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-xs text-zinc-600">
                  {transaction.transactionCode}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right align-top font-medium text-amber-700">
                  {money(transaction.debitAmount)}
                </td>
                <td className="px-3 py-2 align-top">
                  {transaction.campaign ? (
                    <span className="inline-flex rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      {transaction.campaign.code}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                      Chưa gán
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  <select
                    value={transaction.campaign?.id ?? ""}
                    disabled={pendingTransactionId === transaction.id}
                    onChange={(event) => onAssign(transaction.id, event.target.value || null)}
                    className="w-44 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Chưa gán</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.code}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-zinc-500">
                  Chưa có khoản chi nào từ cột NỢ trong sao kê.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function compareTransactionNewestFirst(left: TransactionSummary, right: TransactionSummary) {
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

function FundSummaryTable({ data }: { data: DashboardData }) {
  const totalCampaignIncome = data.campaigns.reduce((sum, campaign) => sum + campaign.income, 0);
  const allocatedOpeningBalance = data.campaigns.reduce((sum, campaign) => sum + campaign.openingBalance, 0);
  const totalExpenses = data.overview.totalExpenses;
  const currentAmount = (data.openingBalance?.bankBalance ?? 0) + data.overview.totalIncome - totalExpenses;
  const bankDifference = data.overview.bankBalance - currentAmount;

  const rows = [
    ...(data.openingBalance ? [{
      label: "Số dư đầu kỳ",
      value: data.openingBalance.bankBalance,
      note: `Chốt ngày ${dateOnly(data.openingBalance.cutoffDate)}; đã phân bổ ${money(allocatedOpeningBalance)}, chưa phân bổ ${money(data.openingBalance.unallocatedBalance)}.`,
      className: "text-indigo-700",
    }] : []),
    {
      label: "Tổng thu các thiện pháp",
      value: totalCampaignIncome,
      note: "Cộng tổng thu của toàn bộ thiện pháp trong bảng 1.",
      className: "text-indigo-700",
    },
    {
      label: "Tổng chi đã ghi nhận",
      value: totalExpenses,
      note: "Cộng cột NỢ trong sao kê.",
      className: "text-amber-700",
    },
    {
      label: "Số tiền hiện tại",
      value: currentAmount,
      note: "Tổng thu các thiện pháp trừ tổng chi.",
      className: "text-zinc-950",
    },
    {
      label: "Số dư tài khoản ngân hàng",
      value: data.overview.bankBalance,
      note: data.bankAccount
        ? `${data.bankAccount.bankName} ${data.bankAccount.accountNumber}`
        : "Chưa có thông tin tài khoản từ sao kê.",
      className: "text-zinc-950",
    },
    {
      label: "Chênh lệch tài khoản và sổ theo dõi",
      value: bankDifference,
      note: "Số dư ngân hàng trừ số tiền hiện tại theo thu chi.",
      className: bankDifference === 0 ? "text-zinc-700" : "text-rose-700",
    },
    {
      label: "Thu chưa phân loại",
      value: data.overview.unmatchedIncome,
      note: "Khoản thu chưa nằm trong tổng thu thiện pháp.",
      className: "text-rose-700",
    },
    {
      label: "Chi từ sao kê chưa gán",
      value: data.overview.unmatchedDebit,
      note: "Dòng NỢ chưa được gán vào thiện pháp nào.",
      className: "text-amber-700",
    },
  ];

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-zinc-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-3 py-2">Khoản mục</th>
            <th className="px-3 py-2">Cách tính / ghi chú</th>
            <th className="px-3 py-2 text-right">Số tiền</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="px-3 py-2 font-medium text-zinc-900">{row.label}</td>
              <td className="px-3 py-2 text-zinc-500">{row.note}</td>
              <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${row.className}`}>
                {money(row.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OpeningBalanceModal({
  data,
  isSaving,
  onClose,
  onSubmit,
}: {
  data: DashboardData;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8">
      <div className="w-full max-w-2xl rounded-xl border border-indigo-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-indigo-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Cài đặt hệ thống</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Số dư đầu kỳ</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        {data.openingBalance ? (
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
              <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Mốc đã được khóa</div>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <MiniStat label="Ngày chốt" value={dateOnly(data.openingBalance.cutoffDate)} />
                <MiniStat label="Số dư ngân hàng" value={money(data.openingBalance.bankBalance)} />
                <MiniStat label="Chưa phân bổ" value={money(data.openingBalance.unallocatedBalance)} />
                <MiniStat label="Ngày tạo" value={dateTime(data.openingBalance.createdAt)} />
              </dl>
            </div>
            <p className="text-sm leading-6 text-slate-600">Không có nút sửa hoặc reset tại giao diện. Nếu cần điều chỉnh, phải thực hiện bằng migration có lưu vết để tránh làm sai số liệu.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5 px-5 py-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              Chỉ thực hiện một lần. Sau khi chốt, hệ thống không cho khởi tạo lại qua giao diện hoặc API.
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="cutoffDate" type="date" label="Ngày bắt đầu quản lý" required />
              <Input name="bankBalance" inputMode="numeric" label="Số dư ngân hàng tại ngày chốt" placeholder="125000000" required />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">Phân bổ cho từng thiện pháp</div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                {data.campaigns.map((campaign) => (
                  <label key={campaign.id} className="grid grid-cols-[1fr_180px] items-center gap-3 text-sm">
                    <span className="min-w-0 truncate text-slate-700">{campaign.code} — {campaign.name}</span>
                    <input name={`campaign-${campaign.id}`} inputMode="numeric" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-right outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Phần còn lại tự động được ghi nhận là “Chưa phân bổ”.</p>
            </div>
            <Textarea name="note" label="Ghi chú / căn cứ đối soát" placeholder="Sao kê chốt số dư, người xác nhận..." />
            <Input name="confirmation" label={'Nhập chính xác “CHỐT SỐ DƯ” để xác nhận'} autoComplete="off" required />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
              <button disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Chốt và khóa số dư
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function CampaignModal({
  state,
  isSaving,
  isDeleting,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: {
  state: CampaignModalState;
  isSaving: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (event: FormEvent<HTMLFormElement>, campaignId: string) => void;
  onDelete: (campaign: CampaignSummary) => void;
}) {
  const campaign = state.mode === "edit" ? state.campaign : null;
  const canDelete = campaign ? campaign.transactionCount === 0 : false;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 px-4 py-8">
      <div className="w-full max-w-2xl rounded-md border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-zinc-100 p-2 text-zinc-700">
                <Tags className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-zinc-950">
                {campaign ? "Sửa thiện pháp" : "Thêm thiện pháp"}
              </h2>
            </div>
            {campaign ? (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <MiniStat label="Hùn phước" value={money(campaign.income)} />
                  <MiniStat label="Chi" value={money(campaign.expenses)} />
                  <MiniStat label="GD" value={campaign.transactionCount.toLocaleString("vi-VN")} />
                </div>
                <a
                  href={publicCampaignPath(campaign.code)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Mở link public
                </a>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          key={campaign?.id ?? "create"}
          className="space-y-4 px-5 py-4"
          onSubmit={(event) => (campaign ? onUpdate(event, campaign.id) : onCreate(event))}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="code" label="Mã" defaultValue={campaign?.code ?? ""} placeholder="cntt10" required />
            <Select name="status" label="Trạng thái" defaultValue={campaign?.status ?? "ACTIVE"}>
              <option value="ACTIVE">Đang chạy</option>
              <option value="PAUSED">Tạm dừng</option>
              <option value="COMPLETED">Hoàn tất</option>
            </Select>
          </div>
          <Input
            name="name"
            label="Tên thiện pháp"
            defaultValue={campaign?.name ?? ""}
            placeholder="Cúng dường y áo..."
            required
          />
          <Textarea
            name="keywords"
            label="Từ khóa"
            rows={5}
            defaultValue={campaign?.keywords.map((keyword) => keyword.keyword).join("\n") ?? ""}
            placeholder={"cntt10\nchùa tam tạng 10\ncung duong y ao"}
          />
          <Textarea name="description" label="Ghi chú" rows={3} defaultValue={campaign?.description ?? ""} />

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {campaign ? (
              <div>
                <button
                  type="button"
                  disabled={!canDelete || isDeleting}
                  onClick={() => onDelete(campaign)}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-400"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Xóa
                </button>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {canDelete ? "Có thể xóa vì chưa có giao dịch sao kê." : "Không thể xóa khi đã có giao dịch sao kê."}
                </p>
              </div>
            ) : (
              <span />
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Hủy
              </button>
              <button
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tags className="h-4 w-4" />}
                {campaign ? "Cập nhật" : "Tạo thiện pháp"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function SetupScreen({ state }: { state: Exclude<DashboardState, { ok: true }> }) {
  const isMissingConfiguration = state.reason === "DATABASE_NOT_CONFIGURED";

  return (
    <div className="min-h-screen bg-[#f4f6ff] px-4 py-8 text-zinc-950">
      <div className="mx-auto max-w-3xl rounded-md border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 h-5 w-5 text-amber-600" />
          <div>
            <h1 className="text-xl font-semibold">
              {isMissingConfiguration ? "Cần cấu hình PostgreSQL" : "Không kết nối được cơ sở dữ liệu"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{state.message}</p>
          </div>
        </div>
        {isMissingConfiguration ? (
          <div className="mt-5 space-y-3 text-sm">
            <pre className="overflow-x-auto rounded-md bg-zinc-950 p-4 text-zinc-50">
              <code>{'DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"'}</code>
            </pre>
            <pre className="overflow-x-auto rounded-md bg-zinc-100 p-4 text-zinc-800">
              <code>{"pnpm db:generate\npnpm db:push\npnpm db:seed\npnpm dev"}</code>
            </pre>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}

function HeaderStat({ label, value, tone = "zinc" }: { label: string; value: string; tone?: "zinc" | "indigo" | "amber" }) {
  const color = tone === "indigo" ? "text-indigo-700" : tone === "amber" ? "text-amber-700" : "text-zinc-950";
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">{children}</div>;
}

function PanelTitle({ icon: Icon, title }: { icon: typeof Upload; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-md bg-zinc-100 p-2 text-zinc-700">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
    </div>
  );
}

function TabButton({
  active,
  children,
  count,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium ${
        active
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      {children}
      {typeof count === "number" ? <TabCountBadge active={active} count={count} /> : null}
    </button>
  );
}

function MainTabButton({
  active,
  children,
  count,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
        active ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
      }`}
    >
      {children}
      {typeof count === "number" ? <TabCountBadge active={active} count={count} /> : null}
    </button>
  );
}

function TabCountBadge({ active, count }: { active: boolean; count: number }) {
  return (
    <span
      className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
        active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-600"
      }`}
    >
      {count.toLocaleString("vi-VN")}
    </span>
  );
}

function Input({
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        {...props}
        className={`mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 ${className}`}
      />
    </label>
  );
}

function Textarea({
  label,
  className = "",
  rows = 3,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <textarea
        rows={rows}
        {...props}
        className={`mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 ${className}`}
      />
    </label>
  );
}

function Select({
  label,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <select
        {...props}
        className={`mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 ${className}`}
      >
        {children}
      </select>
    </label>
  );
}

function StatusMessages({ message, error }: { message: string | null; error: string | null }) {
  if (!message && !error) {
    return null;
  }

  return (
    <div
      className={`rounded-md border p-3 text-sm ${
        error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-indigo-200 bg-indigo-50 text-indigo-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {error ? <AlertCircle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
        <span>{error ?? message}</span>
      </div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-indigo-700/70">{label}</dt>
      <dd className="font-semibold">{value.toLocaleString("vi-VN")}</dd>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 p-2">
      <div className="text-zinc-500">{label}</div>
      <div className="mt-1 font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function campaignPayloadFromForm(formData: FormData) {
  return {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    status: String(formData.get("status") ?? "ACTIVE"),
    keywords: splitKeywords(String(formData.get("keywords") ?? "")),
  };
}

function publicCampaignPath(code: string) {
  return `/thien-phap/${encodeURIComponent(code)}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof json.error === "string" ? json.error : "Request failed.");
  }

  return json as T;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Có lỗi không xác định.";
}

function parseMoneyInput(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateOnly(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function transactionDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
