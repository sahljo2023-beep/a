import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  hotel_id: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const devices = await prisma.device.findMany({
    orderBy: [{ active: "desc" }, { registered_at: "desc" }],
    select: {
      id: true, name: true, active: true, registered_at: true, last_seen_at: true, deactivated_at: true,
      hotel: { select: { id: true, name: true, code: true } },
    },
  });
  return ok(devices);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { name, hotel_id } = parsed.data;

  const hotel = await prisma.hotel.findUnique({ where: { id: hotel_id } });
  if (!hotel) return fail("الفندق غير موجود", 404);

  const rawToken = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const device = await prisma.device.create({
    data: { name, hotel_id, token_hash: tokenHash },
    select: { id: true, name: true, active: true, registered_at: true, hotel: { select: { name: true, code: true } } },
  });

  await prisma.auditLog.create({
    data: {
      table_name: "devices", record_id: device.id, action: "CREATE",
      new_data: { name, hotel_id, hotel_name: hotel.name },
      reason: "تسجيل جهاز جديد", performed_by: auth.user.username, user_id: auth.user.id,
    },
  });

  return ok({ ...device, token: rawToken, warning: "احفظ هذا التوكن الآن، لن يُعرض مجدداً!" }, 201);
}
