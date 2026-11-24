import { normalizeTransferText } from "@/lib/text";

export function campaignTransferContent(name: string, code: string) {
  if (code.trim().toLowerCase() === "tp149") return "Parami group cd TP149";
  const normalizedName = normalizeTransferText(name);
  const transferName = normalizedName.replace(/^(?:cung duong|cd)\s+/, "");
  return `Parami group cd ${transferName || code.trim()} - ${code.trim()}`;
}
