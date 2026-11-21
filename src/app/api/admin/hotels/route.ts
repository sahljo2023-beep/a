import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  name_en: z.string().max(100).optional(),
  code: z.string().min(1).max(10).toUpperCase().trim(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const hotels = await prisma.hotel.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true, name: true, name_en: true, code: true, active: true, created_at: true,
      _count: { select: { employees: true, devices: true, allowed_networks: true } },
    },
  });
  return ok(hotels);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { name, name_en, code } = parsed.data;

  const existing = await prisma.hotel.findFirst({ where: { OR: [{ name }, { code }] } });
  if (existing) return fail("فندق بنفس الاسم أو الرمز موجود مسبقاً", 409);

  const hotel = await prisma.hotel.create({
    data: { name, name_en, code },
    select: { id: true, name: true, code: true, active: true },
  });

  await prisma.auditLog.create({
    data: {
      table_name: "hotels", record_id: hotel.id, action: "CREATE",
      new_data: { name, code }, reason: "إضافة فندق",
      performed_by: auth.user.username, user_id: auth.user.id,
    },
  });
  return ok(hotel, 201);
}
