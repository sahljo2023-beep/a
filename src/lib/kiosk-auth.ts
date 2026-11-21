import { NextRequest } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

// فحص عنوان IP هل يقع ضمن نطاق CIDR
function isIpInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bits = "32"] = cidr.split("/");
    const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

    const ipToLong = (ipAddr: string) =>
      ipAddr.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;

    const ipLong = ipToLong(ip);
    const rangeLong = ipToLong(range);

    return (ipLong & mask) === (rangeLong & mask);
  } catch {
    return false;
  }
}

export async function verifyKioskAccess(request: NextRequest, hotelId?: string) {
  // 1. استخراج التوكن من الكوكي
  const rawToken = request.cookies.get("hotel_device_token")?.value;
  if (!rawToken) {
    return { ok: false as const, error: "جهاز غير معتمد: لا يوجد رمز تعريف للجهاز", code: "NO_TOKEN" };
  }

  // 2. فحص هاش التوكن في قاعدة البيانات
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const device = await prisma.device.findUnique({
    where: { token_hash: tokenHash },
    include: { hotel: true },
  });

  if (!device || !device.active) {
    return { ok: false as const, error: "تم إيقاف اعتماد هذا الجهاز أو لم يعد صالحاً", code: "DEVICE_DEACTIVATED" };
  }

  // 3. استخراج عنوان IP
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  // 4. فحص الـ IP ضمن الشبكات المسموحة لهذا الفندق
  const allowedNetworks = await prisma.allowedNetwork.findMany({
    where: { hotel_id: device.hotel_id, active: true },
  });

  // إذا كانت هناك نطاقات محددة، نتحقق أن الـ IP يطابق واحداً منها (مع استثناء localhost للتطوير المحلي)
  const isLocalhost = clientIp === "127.0.0.1" || clientIp === "::1" || clientIp === "localhost";
  if (allowedNetworks.length > 0 && !isLocalhost) {
    const isAllowed = allowedNetworks.some((net) => isIpInCidr(clientIp, net.cidr));
    if (!isAllowed) {
      return {
        ok: false as const,
        error: `عنوان IP الخاص بالجهاز (${clientIp}) غير مصرح به لشبكة فندق ${device.hotel.name}`,
        code: "IP_NOT_ALLOWED",
      };
    }
  }

  // إذا تم طلب التحقق من فندق محدد ومطابقته مع الجهاز
  if (hotelId && device.hotel_id !== hotelId) {
    return {
      ok: false as const,
      error: `هذا الجهاز معتمد لفندق (${device.hotel.name}) ولا يمكن تسجيل بصمة لفندق آخر من خلاله`,
      code: "HOTEL_MISMATCH",
      device,
    };
  }

  // تحديث last_seen_at للجهاز
  await prisma.device.update({
    where: { id: device.id },
    data: { last_seen_at: new Date() },
  });

  return { ok: true as const, device, clientIp };
}
