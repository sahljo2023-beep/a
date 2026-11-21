import { NextRequest } from "next/server";
import { z } from "zod";
import argon2 from "argon2";
import prisma from "@/lib/prisma";
import { verifyKioskAccess } from "@/lib/kiosk-auth";
import { normalizeArabic } from "@/lib/normalize";
import { pinRateLimiter } from "@/lib/rate-limit";
import { ok, fail } from "@/lib/api-helpers";

const punchSchema = z.object({
  employee_name: z.string().min(2).max(100).trim(),
  pin: z.string().min(4).max(8).regex(/^\d+$/),
  hotel_id: z.string().min(1),
  type: z.enum(["IN", "OUT"]),
});

export async function POST(request: NextRequest) {
  // 1. التحقق من أمان الجهاز والشبكة
  const kioskCheck = await verifyKioskAccess(request);
  if (!kioskCheck.ok) {
    return fail(kioskCheck.error, 403, kioskCheck.code);
  }
  const { device, clientIp } = kioskCheck;

  // 2. التحقق من المدخلات
  const body = await request.json().catch(() => null);
  const parsed = punchSchema.safeParse(body);
  if (!parsed.success) {
    return fail("بيانات غير مكتملة", 400);
  }

  const { employee_name, pin, hotel_id, type } = parsed.data;

  // 3. تطبيع الاسم العربي والبحث عن الموظف
  const normalizedInputName = normalizeArabic(employee_name);
  const employee = await prisma.employee.findFirst({
    where: {
      name_normalized: normalizedInputName,
      active: true,
    },
  });

  if (!employee) {
    await prisma.errorCase.create({
      data: {
        type: "MISSING_CHECK_IN",
        description: `محاولة بصمة لموظف غير مسجل: "${employee_name}"`,
        reason: "موظف غير مسجل",
        original_data: { employee_name, hotel_id, type, ip: clientIp },
      },
    });
    return fail("الموظف غير مسجل", 404, "EMPLOYEE_NOT_FOUND");
  }

  // 4. Rate Limiting على PIN الموظف
  const rateLimitKey = `pin:${employee.id}`;
  const rateLimitResult = pinRateLimiter.check(5, rateLimitKey, 300_000);
  if (!rateLimitResult.success) {
    return fail("تم قفل الحساب مؤقتاً بسبب تكرار إدخال PIN الخاطئ. يرجى الانتظار 5 دقائق", 429, "PIN_LOCKED");
  }

  // 5. التحقق من PIN
  const isPinValid = await argon2.verify(employee.pin_hash, pin);
  if (!isPinValid) {
    await prisma.errorCase.create({
      data: {
        type: "MISSING_CHECK_IN",
        description: `إدخال PIN خاطئ للموظف ${employee.name}`,
        reason: "رمز PIN خاطئ",
        original_data: { employee_id: employee.id, ip: clientIp },
      },
    });
    return fail("رمز PIN غير صحيح", 401, "INVALID_PIN");
  }

  // تصفير عداد الأخطاء بعد النجاح
  pinRateLimiter.reset(rateLimitKey);

  // 6. التحقق من تاريخ اليوم وجدول الدوام
  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const scheduleEntry = await prisma.scheduleEntry.findUnique({
    where: {
      employee_id_date: {
        employee_id: employee.id,
        date: todayDateOnly,
      },
    },
    include: { shift: true, hotel: true },
  });

  if (scheduleEntry && scheduleEntry.hotel_id !== hotel_id) {
    await prisma.errorCase.create({
      data: {
        type: "WRONG_HOTEL",
        description: `الموظف ${employee.name} حاول التبصيم في فندق غير المحدد في جدوله (المجدول: ${scheduleEntry.hotel?.name})`,
        reason: "فندق غير مطابق للجدول",
        original_data: { employee_id: employee.id, scheduled_hotel: scheduleEntry.hotel_id, chosen_hotel: hotel_id },
      },
    });
    return fail(
      `تنبيه: أنت مجدول للعمل اليوم في (${scheduleEntry.hotel?.name}). لا يمكن قبول البصمة في فندق آخر دون إذن الأدمن`,
      400,
      "HOTEL_MISMATCH"
    );
  }

  // 7. قواعد منع تكرار البصمة والدخول/الخروج
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const recentDuplicate = await prisma.punch.findFirst({
    where: {
      employee_id: employee.id,
      type,
      server_timestamp: { gte: fiveMinutesAgo },
    },
  });

  if (recentDuplicate) {
    return fail("تم تسجيل بصمة مماثلة قبل قليل! الرجاء الانتظار منعاً للتكرار", 400, "DUPLICATE_PUNCH");
  }

  const lastPunch = await prisma.punch.findFirst({
    where: { employee_id: employee.id },
    orderBy: { server_timestamp: "desc" },
  });

  if (type === "OUT") {
    if (!lastPunch || lastPunch.type !== "IN") {
      return fail("لا يمكن تسجيل بصمة خروج دون وجود بصمة دخول مفتوحة مسبقاً", 400, "NO_OPEN_IN_PUNCH");
    }
  }

  // 8. تسجيل البصمة بنجاح
  const punch = await prisma.punch.create({
    data: {
      employee_id: employee.id,
      hotel_id,
      shift_id: scheduleEntry?.shift_id || null,
      type,
      server_timestamp: now,
      device_id: device.id,
      source: "DEVICE",
    },
    include: {
      employee: { select: { name: true } },
      hotel: { select: { name: true } },
    },
  });

  const timeAmman = now.toLocaleTimeString("ar-JO", {
    timeZone: "Asia/Amman",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return ok({
    message: `تم تسجيل ${type === "IN" ? "الدخول" : "الخروج"} بنجاح`,
    employee_name: employee.name,
    hotel_name: punch.hotel.name,
    type,
    time: timeAmman,
  });
}
