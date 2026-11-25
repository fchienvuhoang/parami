import { getPrisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/money";

export async function getFundTransfers() {
  return getPrisma().campaignFundTransfer.findMany({
    where: { sourceCampaign: { workspace: "VIB" }, destinationCampaign: { workspace: "VIB" } },
    include: {
      sourceCampaign: { select: { code: true, name: true } },
      destinationCampaign: { select: { code: true, name: true } },
    },
    orderBy: [{ transferredAt: "desc" }, { id: "desc" }],
  });
}

export function fundTransferBalance(transfers: { sourceCampaignId: string; destinationCampaignId: string; amount: Parameters<typeof decimalToNumber>[0] }[], campaignId: string) {
  return transfers.reduce((balance, transfer) => balance
    + (transfer.destinationCampaignId === campaignId ? decimalToNumber(transfer.amount) : 0)
    - (transfer.sourceCampaignId === campaignId ? decimalToNumber(transfer.amount) : 0), 0);
}
