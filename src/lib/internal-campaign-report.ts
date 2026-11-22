import { getPrisma, retryTransientDatabaseRead } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/money";

// Keep this value server-side; rotate it to replace the shared link.
export const INTERNAL_REPORT_KEY = "3324c9899378833b5739c086c63a35779acd52895a8b31de";

export type InternalCampaignSummary = {
  code: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  income: number;
  expenses: number;
  balance: number;
};

export async function getInternalCampaignReport(): Promise<InternalCampaignSummary[]> {
  const prisma = getPrisma();
  return retryTransientDatabaseRead(async () => {
    const campaigns = await prisma.campaign.findMany({
      where: { workspace: "VIB", NOT: { code: { equals: "KHOANBUTRU111", mode: "insensitive" } } },
      orderBy: { createdAt: "desc" },
      select: { id: true, code: true, name: true, status: true, openingBalanceAllocation: { select: { amount: true } } },
    });
    const campaignIds = campaigns.map((campaign) => campaign.id);
    const [direct, allocations] = await Promise.all([
      prisma.bankTransaction.groupBy({
        by: ["campaignId"],
        where: { workspace: "VIB", campaignId: { in: campaignIds } },
        _sum: { creditAmount: true, debitAmount: true },
      }),
      prisma.transactionAllocation.findMany({
        where: { campaignId: { in: campaignIds }, transaction: { workspace: "VIB" } },
        select: { campaignId: true, amount: true, transaction: { select: { creditAmount: true, debitAmount: true } } },
      }),
    ]);
    const directByCampaign = new Map(direct.map((item) => [item.campaignId, item._sum]));
    const allocated = new Map<string, { income: number; expenses: number }>();
    for (const item of allocations) {
      const totals = allocated.get(item.campaignId) ?? { income: 0, expenses: 0 };
      if (decimalToNumber(item.transaction.creditAmount) > 0) totals.income += decimalToNumber(item.amount);
      if (decimalToNumber(item.transaction.debitAmount) > 0) totals.expenses += decimalToNumber(item.amount);
      allocated.set(item.campaignId, totals);
    }
    return campaigns.map((campaign) => {
      const sums = directByCampaign.get(campaign.id);
      const income = decimalToNumber(sums?.creditAmount) + (allocated.get(campaign.id)?.income ?? 0);
      const expenses = decimalToNumber(sums?.debitAmount) + (allocated.get(campaign.id)?.expenses ?? 0);
      return { code: campaign.code, name: campaign.name, status: campaign.status, income, expenses,
        balance: decimalToNumber(campaign.openingBalanceAllocation?.amount) + income - expenses };
    });
  });
}
