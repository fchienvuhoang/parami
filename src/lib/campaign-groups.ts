type CampaignBalance = { status: "ACTIVE" | "PAUSED" | "COMPLETED"; balance: number };

// Compare in database currency precision, avoiding floating-point rounding noise.
export function isSettledCampaign(campaign: CampaignBalance) {
  return campaign.status === "COMPLETED" && Math.round(campaign.balance * 100) === 0;
}

export function groupCampaigns<T extends CampaignBalance>(campaigns: T[]) {
  return {
    current: campaigns.filter((campaign) => !isSettledCampaign(campaign)),
    settled: campaigns.filter(isSettledCampaign),
  };
}
