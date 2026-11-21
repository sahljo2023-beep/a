import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, deviceCookieOptions } from "@/lib/auth";
import { IronSessionData } from "iron-session";

// ============================================================
// حماية المسارات في الـ Proxy (Next.js 16)
// ============================================================

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================================
  // 1. حماية /admin — يتطلب دور ADMIN
  // ============================================================
  if (pathname.startsWith("/admin")) {
    // استثناء صفحة الدخول
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const response = NextResponse.next();
    const session = await getIronSession<IronSessionData>(
      request,
      response,
      sessionOptions
    );

    if (!session.user || session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return response;
  }

  // ============================================================
  // 2. حماية /viewer — يتطلب دور VIEWER أو ADMIN
  // ============================================================
  if (pathname.startsWith("/viewer")) {
    if (pathname === "/viewer/login") {
      return NextResponse.next();
    }

    const response = NextResponse.next();
    const session = await getIronSession<IronSessionData>(
      request,
      response,
      sessionOptions
    );

    if (
      !session.user ||
      (session.user.role !== "VIEWER" && session.user.role !== "ADMIN")
    ) {
      return NextResponse.redirect(new URL("/viewer/login", request.url));
    }

    return response;
  }

  // ============================================================
  // 3. حماية /kiosk — يتطلب device token صالح
  // يُكمل التحقق من IP في route handlers (proxy لا يصل لـ DB)
  // ============================================================
  if (pathname.startsWith("/kiosk")) {
    // صفحة الخطأ والـ API مستثناة
    if (
      pathname === "/kiosk/unauthorized" ||
      pathname.startsWith("/api/")
    ) {
      return NextResponse.next();
    }

    // فحص وجود كوكي الجهاز
    const deviceCookie = request.cookies.get(deviceCookieOptions.cookieName);

    if (!deviceCookie?.value) {
      // فحص User-Agent لعرض رسالة ودية فقط (ليس حماية حقيقية)
      const userAgent = request.headers.get("user-agent") ?? "";
      const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);

      const redirectUrl = new URL("/kiosk/unauthorized", request.url);
      redirectUrl.searchParams.set("reason", isMobile ? "mobile" : "no_token");
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  // ============================================================
  // 4. الصفحة الرئيسية — إعادة توجيه للأدمن
  // ============================================================
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/viewer/:path*",
    "/kiosk/:path*",
  ],
};
