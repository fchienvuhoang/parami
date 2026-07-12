type PositionedText = { text: string; x: number; y: number };

export type ParsedBidvPdfStatement = {
  meta: {
    sourceBank: "BIDV";
    currency: string;
    accountNumber: string;
    accountName: string | null;
    fromDate: Date;
    toDate: Date;
    openingBalance: number | null;
    closingBalance: number;
  };
  rows: Array<{
    transactionDate: Date;
    statementRow: number;
    description: string;
    transactionCode: string;
    debitAmount: number;
    creditAmount: number;
    balanceAfter: number;
    raw: Record<string, unknown>;
  }>;
};

export async function parseBidvPdfStatement(buffer: Buffer, password = "20021991"): Promise<ParsedBidvPdfStatement> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  let document;
  try {
    document = await getDocument({
      data: new Uint8Array(buffer),
      password,
      useWorkerFetch: false,
    }).promise;
  } catch (error) {
    if (error instanceof Error && /password/i.test(error.message)) {
      throw new Error("Không mở được PDF BIDV. Hãy kiểm tra mật khẩu file sao kê.");
    }
    throw new Error("Không đọc được file PDF BIDV.");
  }

  const pages: PositionedText[][] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.flatMap((item) => {
      if (!("str" in item) || !item.str.trim()) return [];
      return [{ text: item.str.trim(), x: item.transform[4], y: item.transform[5] }];
    }));
  }

  const firstPage = pages[0] ?? [];
  const accountNumber = valueAtLabel(firstPage, "Account No:");
  const accountName = valueAtLabel(firstPage, "Account name:") || null;
  const currency = valueAtLabel(firstPage, "Currency:") || "VND";
  const periodDates = firstPage
    .filter((item) => near(item.y, 695) && /^\d{2}\/\d{2}\/\d{4}$/.test(item.text))
    .sort((a, b) => a.x - b.x);
  if (!accountNumber || periodDates.length < 2) {
    throw new Error("File không đúng định dạng sao kê tài khoản BIDV.");
  }

  const rows: ParsedBidvPdfStatement["rows"] = [];
  for (const [pageIndex, items] of pages.entries()) {
    const anchors = items
      .filter((item) => item.x >= 18 && item.x <= 28 && /^\d{1,4}$/.test(item.text))
      .map((item) => ({ ...item, number: Number(item.text) }))
      .filter((item) => item.number >= 1 && item.number <= 10000)
      .sort((a, b) => b.y - a.y);

    for (let index = 0; index < anchors.length; index += 1) {
      const anchor = anchors[index];
      const top = index === 0 ? (pageIndex === 0 ? 540 : 780) : (anchors[index - 1].y + anchor.y) / 2;
      const bottom = index === anchors.length - 1 ? anchor.y - 28 : (anchor.y + anchors[index + 1].y) / 2;
      const band = items.filter((item) => item.y < top && item.y >= bottom);
      const dateParts = band.filter((item) => item.x >= 40 && item.x < 85).sort((a, b) => b.y - a.y);
      const dateText = dateParts.find((item) => /^\d{2}\/\d{2}\/\d{4}$/.test(item.text))?.text;
      const timeText = dateParts.find((item) => /^\d{2}:\d{2}:\d{2}$/.test(item.text))?.text;
      if (!dateText || !timeText) continue;

      const debitAmount = columnAmount(band, 160, 230, anchor.y);
      const creditAmount = columnAmount(band, 230, 300, anchor.y);
      const balanceAfter = columnAmount(band, 300, 360, anchor.y);
      const sequence = band.find((item) => item.x >= 360 && item.x < 388 && near(item.y, anchor.y, 5))?.text;
      const description = band
        .filter((item) => item.x >= 448)
        .sort((a, b) => b.y - a.y || a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const transactionDate = parseDateTime(dateText, timeText);
      if (!transactionDate || balanceAfter == null || (!debitAmount && !creditAmount)) continue;

      rows.push({
        transactionDate,
        statementRow: anchor.number,
        description: description || `Giao dịch BIDV số ${sequence ?? anchor.number}`,
        transactionCode: `BIDV_${accountNumber}_${dateText.replaceAll("/", "")}_${sequence ?? anchor.number}`,
        debitAmount: debitAmount ?? 0,
        creditAmount: creditAmount ?? 0,
        balanceAfter,
        raw: { STT: anchor.number, NGAY_GIAO_DICH: `${dateText} ${timeText}`, SO_CHUNG_TU: sequence, DIEN_GIAI: description },
      });
    }
  }

  if (!rows.length) throw new Error("Không tìm thấy giao dịch trong sao kê BIDV.");
  rows.sort((a, b) => a.statementRow - b.statementRow);
  const openingBalance = amountNearLabel(firstPage, "Opening balance");
  const lastPage = pages.at(-1) ?? [];
  const closingBalance = amountNearLabel(lastPage, "Closing balance") ?? rows.at(-1)!.balanceAfter;

  return {
    meta: {
      sourceBank: "BIDV",
      currency,
      accountNumber,
      accountName,
      fromDate: parseDateTime(periodDates[0].text, "00:00:00")!,
      toDate: parseDateTime(periodDates[1].text, "23:59:59")!,
      openingBalance,
      closingBalance,
    },
    rows,
  };
}

function valueAtLabel(items: PositionedText[], label: string) {
  const item = items.find((candidate) => candidate.text === label);
  if (!item) return "";
  return items
    .filter((candidate) => near(candidate.y, item.y) && candidate.x > item.x + 20)
    .sort((a, b) => a.x - b.x)
    .at(0)?.text ?? "";
}

function amountNearLabel(items: PositionedText[], label: string) {
  const item = items.find((candidate) => candidate.text.includes(label));
  if (!item) return null;
  const candidates = items.filter((candidate) => Math.abs(candidate.y - item.y) <= 18 && /^-?[\d,]+\.\d{2}$/.test(candidate.text));
  return candidates.length ? parseMoney(candidates[0].text) : null;
}

function columnAmount(items: PositionedText[], minX: number, maxX: number, y: number) {
  const item = items.find((candidate) => candidate.x >= minX && candidate.x < maxX && near(candidate.y, y, 5) && /^-?[\d,]+\.\d{2}$/.test(candidate.text));
  return item ? parseMoney(item.text) : null;
}

function parseMoney(value: string) {
  return Number(value.replaceAll(",", ""));
}

function parseDateTime(date: string, time: string) {
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const result = new Date(`${year}-${month}-${day}T${time}+07:00`);
  return Number.isNaN(result.getTime()) ? null : result;
}

function near(left: number, right: number, tolerance = 1) {
  return Math.abs(left - right) <= tolerance;
}
