# Quản lý thiện pháp và sao kê VIB

Ứng dụng Next.js tiếp nhận file sao kê Excel từ VIB, chống trùng giao dịch và phân loại nội dung theo bộ từ khóa của từng thiện pháp.

## Định dạng sao kê

Dán bảng gồm 5 cột, phân cách bằng tab. Dòng tiêu đề có thể có hoặc không:

```text
Ngày giao dịch\tNội dung giao dịch\tSố tiền\tSố dư\tMã giao dịch
10/07/2026 07:43:11\tTHU PHI BSMS T06/2026 CIF 26152572\t-11000 VND\t37007 VND\t0792HcJq-8AU3U9ma4
```

- Ngày giao dịch: `dd/MM/yyyy HH:mm:ss` (múi giờ Việt Nam).
- Số tiền bắt buộc có dấu `+` hoặc `-` và có thể kết thúc bằng `VND`.
- Số dư có thể kết thúc bằng `VND`.
- Mã giao dịch là khóa unique dùng để bỏ qua giao dịch đã import.

Số tài khoản, số dư và giao dịch được đọc trực tiếp từ file sao kê VIB.

## Chạy dự án

```bash
pnpm install
pnpm db:deploy
pnpm db:seed
pnpm dev
```

Các biến môi trường chính: `DATABASE_URL`, `ADMIN_PASSWORD`, và `AUTH_SECRET`.

## Google SSO quản trị

Chỉ tài khoản Google có email đã xác minh `fchienvuhoang@gmail.com` được đăng nhập.
Đăng nhập mật khẩu đã được thay bằng Google; phiên cũ cần đăng nhập lại.

- Tạo OAuth client loại Web application trong Google Cloud.
- Thêm redirect URI chính xác: `https://parami-group.danasangha.org/api/auth/google/callback`
  (dùng domain thực tế nơi ứng dụng được triển khai).
- Cấu hình `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`
  (`openssl rand -base64 32`) và `NEXT_PUBLIC_APP_URL=https://parami-group.danasangha.org`.
- Local: dùng `NEXT_PUBLIC_APP_URL=http://localhost:3000` và thêm redirect URI
  `http://localhost:3000/api/auth/google/callback` vào cùng client.
- Redeploy sau khi cập nhật biến môi trường. Đăng nhập chỉ yêu cầu `openid email`,
  không yêu cầu quyền đọc Gmail. Các biến `GMAIL_*` vẫn phục vụ nhập sao kê riêng.
- Cookie phiên HttpOnly có hạn 7 ngày; OAuth dùng state, nonce và PKCE.
