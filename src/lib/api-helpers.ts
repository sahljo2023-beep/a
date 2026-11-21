import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/auth";

// Helper: التحقق من جلسة الأدمن في API routes
export async function requireAdmin(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<IronSessionData>(request, response, sessionOptions);
  if (!session.user || session.user.role !== "ADMIN") {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 }) };
  }
  return { ok: true as const, user: session.user };
}

// Helper: التحقق من جلسة الـ VIEWER أو ADMIN
export async function requireViewer(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<IronSessionData>(request, response, sessionOptions);
  if (!session.user || (session.user.role !== "VIEWER" && session.user.role !== "ADMIN")) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 }) };
  }
  return { ok: true as const, user: session.user };
}

// Helper: بناء ApiResponse ناجح
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

// Helper: بناء ApiResponse فاشل
export function fail(error: string, status = 400, code?: string) {
  return NextResponse.json({ success: false, error, code }, { status });
}
