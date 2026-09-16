import { toBlob, toPng } from "html-to-image";

export async function copyElementAsPng(element: HTMLElement) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Trình duyệt chưa hỗ trợ copy hình ảnh. Bạn hãy dùng nút Tải PNG.");
  }

  // Start the clipboard write during the click, before rendering awaits (Safari).
  const image = (async () => {
    await document.fonts.ready;
    const blob = await toBlob(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#fff7dc",
    });
    if (!blob) throw new Error("Không thể tạo hình ảnh sao kê.");
    return blob;
  })();
  await Promise.all([
    navigator.clipboard.write([new ClipboardItem({ "image/png": image })]),
    image,
  ]);
}

export async function downloadElementAsPng(element: HTMLElement, fileName: string) {
  await document.fonts.ready;
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: Math.max(2, Math.min(window.devicePixelRatio, 3)),
    backgroundColor: "#fff7dc",
    filter: (node) =>
      !(node instanceof HTMLElement && node.dataset.exportExclude === "true"),
  });
  const link = document.createElement("a");
  link.download = `${safeFileName(fileName)}.png`;
  link.href = dataUrl;
  link.click();
}

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "chi-tiet-giao-dich";
}
