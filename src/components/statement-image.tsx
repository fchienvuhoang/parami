"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Copy, Download, Loader2 } from "lucide-react";
import { copyElementAsPng, downloadElementAsPng } from "@/lib/download-image";

export function StatementImage({ text, code }: { text: string; code: string }) {
  const imageRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"copy" | "download" | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function exportImage(action: "copy" | "download") {
    if (!imageRef.current || busy) return;
    setBusy(action);
    setMessage("");
    setCopied(false);
    try {
      if (action === "copy") {
        await copyElementAsPng(imageRef.current);
        setCopied(true);
        setMessage("Đã copy hình ảnh. Bạn có thể dán vào ứng dụng nhắn tin.");
      } else {
        await downloadElementAsPng(imageRef.current, `sao-ke-${code}`);
        setMessage("Đã tải hình ảnh sao kê.");
      }
    } catch {
      setMessage(action === "copy"
        ? "Không thể copy hình ảnh trên trình duyệt này. Bạn hãy dùng nút Tải PNG."
        : "Không thể tải hình ảnh. Vui lòng thử lại.");
    } finally {
      setBusy(null);
    }
  }

  const [title, date, ...body] = text.split("\n");

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-900">Mẫu hình ảnh sao kê</h4>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy !== null} onClick={() => exportImage("copy")} className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60">
            {busy === "copy" ? <Loader2 className="h-4 w-4 animate-spin" /> : copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Đã copy" : "Copy hình ảnh"}
          </button>
          <button type="button" disabled={busy !== null} onClick={() => exportImage("download")} className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-60">
            {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Tải PNG
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-zinc-500">Bản hình ảnh dùng nội dung mẫu Việt hóa, sẵn để chia sẻ.</p>
      <div className="mt-2 max-h-96 overflow-auto rounded-md border border-amber-200">
        <div ref={imageRef} style={{ width: 560, padding: 32, background: "#fff7dc", color: "#422b16", fontFamily: "Arial, sans-serif", boxSizing: "border-box" }}>
          <div style={{ border: "1px solid #b58a44", padding: 24 }}>
            <h5 style={{ margin: 0, fontSize: 24, lineHeight: 1.4, fontWeight: 700, overflowWrap: "anywhere" }}>{title}</h5>
            <p style={{ margin: "8px 0 20px", fontSize: 14, color: "#795526" }}>{date}</p>
            <div style={{ height: 1, background: "#b58a44", marginBottom: 20 }} />
            <p style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 16, lineHeight: 1.75 }}>{body.join("\n").trim()}</p>
          </div>
        </div>
      </div>
      <p role="status" className="mt-2 text-xs text-zinc-600">{message}</p>
    </div>
  );
}
