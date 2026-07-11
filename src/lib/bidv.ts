import { parseAmount } from "@/lib/money";
import { normalizeTransferText } from "@/lib/text";

export type BidvTransactionRow = {
  transactionDate: Date;
  statementRow: number;
  description: string;
  transactionCode: string;
  debitAmount: number;
  creditAmount: number;
  balanceAfter: number;
  raw: Record<string, unknown>;
};

export type ParsedBidvStatement = {
  meta: {
    sourceBank: "BIDV";
    currency: "VND";
    fromDate: Date;
    toDate: Date;
    closingBalance: number;
  };
  rows: BidvTransactionRow[];
};

const EXPECTED_HEADER = ["ngay giao dich", "noi dung giao dich", "so tien", "so du", "ma giao dich"];

export function parseBidvStatement(text: string): ParsedBidvStatement {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const rows: BidvTransactionRow[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    const cells = line.split("\t").map((cell) => cell.trim());
    if (cells.length >= 5 && EXPECTED_HEADER.every((header, column) => normalizeTransferText(cells[column]) === header)) {
      continue;
    }
    if (cells.length < 5) {
      throw new Error(`Dòng ${index + 1} không đủ 5 cột. Hãy copy trực tiếp bảng sao kê BIDV và dán lại.`);
    }

    const [dateText, description, amountText, balanceText, transactionCode] = cells;
    const transactionDate = parseBidvDate(dateText);
    if (!transactionDate) throw new Error(`Ngày giao dịch không hợp lệ ở dòng ${index + 1}: ${dateText}`);
    if (!description) throw new Error(`Thiếu nội dung giao dịch ở dòng ${index + 1}.`);
    if (!transactionCode) throw new Error(`Thiếu mã giao dịch ở dòng ${index + 1}.`);

    const signedAmount = parseSignedVnd(amountText, index + 1);
    const balanceAfter = parseVnd(balanceText, index + 1, "số dư");
    rows.push({
      transactionDate,
      statementRow: index + 1,
      description,
      transactionCode,
      debitAmount: signedAmount < 0 ? Math.abs(signedAmount) : 0,
      creditAmount: signedAmount > 0 ? signedAmount : 0,
      balanceAfter,
      raw: {
        NGAY_GIAO_DICH: dateText,
        NOI_DUNG_GIAO_DICH: description,
        SO_TIEN: amountText,
        SO_DU: balanceText,
        MA_GIAO_DICH: transactionCode,
      },
    });
  }

  if (!rows.length) throw new Error("Không tìm thấy giao dịch BIDV hợp lệ trong nội dung đã dán.");

  const dates = rows.map((row) => row.transactionDate.getTime());
  return {
    meta: {
      sourceBank: "BIDV",
      currency: "VND",
      fromDate: new Date(Math.min(...dates)),
      toDate: new Date(Math.max(...dates)),
      closingBalance: rows.reduce((latest, row) => row.transactionDate > latest.transactionDate ? row : latest).balanceAfter,
    },
    rows,
  };
}

function parseBidvDate(value: string) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:${second}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseSignedVnd(value: string, row: number) {
  const normalized = value.replace(/\s*VND\s*$/i, "").replace(/[.,\s]/g, "");
  if (!/^[+-]\d+$/.test(normalized)) throw new Error(`Số tiền không hợp lệ ở dòng ${row}: ${value}`);
  return Number(normalized);
}

function parseVnd(value: string, row: number, field: string) {
  const normalized = value.replace(/\s*VND\s*$/i, "").replace(/[.,\s]/g, "");
  if (!/^\d+$/.test(normalized)) throw new Error(`${field} không hợp lệ ở dòng ${row}: ${value}`);
  return parseAmount(normalized);
}
