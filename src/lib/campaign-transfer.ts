import { normalizeTransferText } from "@/lib/text";

const TRANSFER_CONTENT_MAX_LENGTH = 60;

export function campaignTransferContent(name: string, code: string) {
  // Keep the full code first, even when the bank truncates the description.
  const prefix = `${code.trim()} Parami group cd`;
  const transferName = normalizeTransferText(name).replace(/^(?:(?:cung duong|cd)\s+)+/, "");
  const availableLength = TRANSFER_CONTENT_MAX_LENGTH - prefix.length - 1;

  if (!transferName || availableLength <= 0) return prefix;
  if (transferName.length <= availableLength) return `${prefix} ${transferName}`;

  // Shorten at word boundaries instead of turning the name into unreadable initials.
  const words: string[] = [];
  for (const word of transferName.split(" ")) {
    if ([...words, word].join(" ").length > availableLength) break;
    words.push(word);
  }
  return words.length ? `${prefix} ${words.join(" ")}` : prefix;
}
