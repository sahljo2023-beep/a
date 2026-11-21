import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  name_en: z.string().max(100).nullable().optional(),
  code: z.string().min(1).max(10).toUpperCase().trim().optional(),
  active: z.boolean().optional(),
  reason: z.string().min(3).max(500),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const hotel = await prisma.hotel.findUnique({ where: { id } });
  if (!hotel) return fail("الفندق غير موجود", 404);

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { reason, ...updateData } = parsed.data;

  const updated = await prisma.hotel.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, code: true, active: true },
  });

  await prisma.auditLog.create({
    data: {
      table_name: "hotels", record_id: id, action: "UPDATE",
      original_data: { name: hotel.name, active: hotel.active },
      new_data: JSON.parse(JSON.stringify(updateData)),
      reason, performed_by: auth.user.username, user_id: auth.user.id,
    },
  });
  return ok(updated);
}
