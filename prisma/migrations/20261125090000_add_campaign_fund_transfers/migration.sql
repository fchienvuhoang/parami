CREATE TABLE "CampaignFundTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceCampaignId" TEXT NOT NULL REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "destinationCampaignId" TEXT NOT NULL REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "amount" DECIMAL(18,2) NOT NULL CHECK ("amount" > 0),
    "transferredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ("sourceCampaignId" <> "destinationCampaignId")
);
CREATE INDEX "CampaignFundTransfer_sourceCampaignId_transferredAt_idx" ON "CampaignFundTransfer"("sourceCampaignId", "transferredAt");
CREATE INDEX "CampaignFundTransfer_destinationCampaignId_transferredAt_idx" ON "CampaignFundTransfer"("destinationCampaignId", "transferredAt");
