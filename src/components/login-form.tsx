export function LoginForm({ authConfigured, nextPath, error }: {
  authConfigured: boolean;
  nextPath: string;
  error?: boolean;
}) {
  return (
    <div className="mt-5 space-y-4">
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Không đăng nhập được. Hãy thử lại bằng tài khoản Google được cấp quyền quản trị.</p>}
      {authConfigured ? (
        <a href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`} className="flex w-full items-center justify-center rounded-lg bg-indigo-700 px-3 py-3 text-sm font-medium text-white hover:bg-indigo-800">Đăng nhập bằng Google</a>
      ) : <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Đăng nhập Google chưa được cấu hình. Vui lòng liên hệ quản trị viên.</p>}
    </div>
  );
}
