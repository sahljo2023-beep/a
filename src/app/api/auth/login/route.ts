import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { IronSessionData } from "iron-session";
import { z } from "zod";
import argon2 from "argon2";
import prisma from "@/lib/prisma";
import { sessionOptions } from "@/lib/auth";
import {
  loginRateLimiter,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCK_DURATION_MS,
} from "@/lib/rate-limit";

// ============================================================
// Zod schema للتحقق من المدخلات
// ============================================================
const loginSchema = z.object({
  username: z.string().min(1).max(100).trim(),
  password: z.string().min(1).max(200),
  role: z.enum(["ADMIN", "VIEWER"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // 1. Rate Limiting — بناءً على IP
    // ============================================================
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const rateLimitResult = loginRateLimiter.check(
      LOGIN_MAX_ATTEMPTS,
      `login:${clientIp}`,
      LOGIN_LOCK_DURATION_MS
    );

    if (!rateLimitResult.success) {
      const lockedUntil = rateLimitResult.lockedUntil
        ? Math.ceil((rateLimitResult.lockedUntil - Date.now()) / 60000)
        : 15;

      return NextResponse.json(
        {
          success: false,
          error: `تجاوزت عدد المحاولات المسموحة. حاول مجدداً بعد ${lockedUntil} دقيقة.`,
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    // ============================================================
    // 2. التحقق من المدخلات
    // ============================================================
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "بيانات غير صالحة", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    const { username, password, role } = parsed.data;

    // ============================================================
    // 3. البحث عن المستخدم
    // ============================================================
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password_hash: true,
        role: true,
        display_name: true,
        active: true,
      },
    });

    // وقت موحد لمنع Timing attacks
    const dummyHash =
      "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    if (!user) {
      await argon2.verify(dummyHash, password).catch(() => {});
      return NextResponse.json(
        { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    // ============================================================
    // 4. التحقق من كلمة المرور
    // ============================================================
    const passwordValid = await argon2.verify(user.password_hash, password);

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    // ============================================================
    // 5. التحقق من الحساب نشط والدور
    // ============================================================
    if (!user.active) {
      return NextResponse.json(
        { success: false, error: "هذا الحساب موقوف. تواصل مع المدير." },
        { status: 403 }
      );
    }

    if (role && user.role !== role && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "ليس لديك صلاحية الدخول لهذه اللوحة." },
        { status: 403 }
      );
    }

    // ============================================================
    // 6. إنشاء الجلسة
    // ============================================================
    const response = NextResponse.json({
      success: true,
      data: {
        username: user.username,
        role: user.role,
        display_name: user.display_name,
      },
    });

    const session = await getIronSession<IronSessionData>(
      request,
      response,
      sessionOptions
    );

    session.user = {
      id: user.id,
      username: user.username,
      role: user.role as "ADMIN" | "VIEWER" | "EMPLOYEE_KIOSK",
      display_name: user.display_name,
    };

    await session.save();

    // إعادة ضبط rate limiter عند النجاح
    loginRateLimiter.reset(`login:${clientIp}`);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ داخلي. حاول مجدداً." },
      { status: 500 }
    );
  }
}
