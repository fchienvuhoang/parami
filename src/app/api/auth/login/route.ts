import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Vui lòng đăng nhập bằng Google." }, { status: 410 });
}
