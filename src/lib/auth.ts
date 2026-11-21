import { getIronSession, IronSession, IronSessionData } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// ============================================================
// إعدادات الجلسة
// ============================================================
export const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "hotel_attendance_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 8, // 8 ساعات
  },
};

// إعدادات كوكي جهاز الـ Kiosk
export const deviceCookieOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "hotel_device_token",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict" as const,
    maxAge: 60 * 60 * 24 * 365, // سنة كاملة
  },
};

// ============================================================
// الحصول على الجلسة (Server Components)
// ============================================================
export async function getSession(): Promise<IronSession<IronSessionData>> {
  const cookieStore = await cookies();
  return getIronSession<IronSessionData>(cookieStore, sessionOptions);
}

// ============================================================
// الحصول على الجلسة (Route Handlers / API)
// ============================================================
export async function getSessionFromRequest(
  req: NextRequest,
  res: NextResponse
): Promise<IronSession<IronSessionData>> {
  return getIronSession<IronSessionData>(req, res, sessionOptions);
}

// ============================================================
// التحقق من صلاحية المستخدم
// ============================================================
export async function requireAuth(
  requiredRole?: "ADMIN" | "VIEWER" | "EMPLOYEE_KIOSK"
) {
  const session = await getSession();

  if (!session.user) {
    return { authenticated: false, user: null } as const;
  }

  if (requiredRole && session.user.role !== requiredRole) {
    // الأدمن يستطيع الوصول لأي شيء
    if (session.user.role !== "ADMIN") {
      return { authenticated: false, user: null } as const;
    }
  }

  return { authenticated: true, user: session.user } as const;
}

// ============================================================
// حذف الجلسة (logout)
// ============================================================
export async function destroySession() {
  const session = await getSession();
  session.destroy();
}
