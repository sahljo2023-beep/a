import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";

const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

const createSchema = z.object({
  cidr: z.string().regex(cidrRegex, "CIDR غير صالح (مثال: 192.168.1.0/24)"),
  hotel_id: z.string().min(1),
  description: z.string().max(200).optional(),
});

// GET /api/admin/networks
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const networks = await prisma.allowedNetwork.findMany({
    orderBy: [{ active: "desc" }, { created_at: "desc" }],
    select: {
      id: true, cidr: true, description: true, active: true, created_at: true,
      hotel: { select: { id: true, name: true, code: true } },
    },
  });
  return ok(networks);
}

// POST /api/admin/networks
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { cidr, hotel_id, description } = parsed.data;

  const hotel = await prisma.hotel.findUnique({ where: { id: hotel_id } });
  if (!hotel) return fail("الفندق غير موجود", 404);

  const existing = await prisma.allowedNetwork.findFirst({ where: { cidr, hotel_id } });
  if (existing) return fail("هذا النطاق مسجّل مسبقاً لهذا الفندق", 409);

  const network = await prisma.allowedNetwork.create({
    data: { cidr, hotel_id, description },
    select: { id: true, cidr: true, description: true, active: true, hotel: { select: { name: true } } },
  });

  await prisma.auditLog.create({
    data: {
      table_name: "allowed_networks", record_id: network.id, action: "CREATE",
      new_data: { cidr, hotel_id, hotel_name: hotel.name },
      reason: "إضافة نطاق IP", performed_by: auth.user.username, user_id: auth.user.id,
    },
  });
  return ok(network, 201);
}
