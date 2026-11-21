import { NextRequest } from "next/server";
import { z } from "zod";
import argon2 from "argon2";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";
import { normalizeArabic } from "@/lib/normalize";

const updateSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  pin: z.string().min(4).max(8).regex(/^\d+$/).optional(),
  hired_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  left_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  default_hotel_id: z.string().nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
  reason: z.string().min(3).max(500),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: {
      id: true, name: true, name_normalized: true, active: true,
      hired_at: true, left_at: true, notes: true, default_hotel_id: true,
      default_hotel: { select: { id: true, name: true, code: true } },
      _count: { select: { punches: true, schedule_entries: true } },
    },
  });
  if (!employee) return fail("الموظف غير موجود", 404);
  return ok(employee);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return fail("الموظف غير موجود", 404);

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { reason, pin, name, ...rest } = parsed.data;
  const updateData: any = { ...rest };

  if (name) {
    const name_normalized = normalizeArabic(name);
    const dup = await prisma.employee.findFirst({
      where: { name_normalized, active: true, id: { not: id } },
    });
    if (dup) return fail("يوجد موظف آخر بنفس الاسم", 409);
    updateData.name = name.trim();
    updateData.name_normalized = name_normalized;
  }

  if (pin) {
    updateData.pin_hash = await argon2.hash(pin, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
  }

  if (rest.hired_at) updateData.hired_at = new Date(rest.hired_at as string);
  if (rest.left_at !== undefined) updateData.left_at = rest.left_at ? new Date(rest.left_at as string) : null;

  const updated = await prisma.employee.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, active: true, hired_at: true, left_at: true },
  });

  await prisma.auditLog.create({
    data: {
      table_name: "employees", record_id: id, action: "UPDATE",
      original_data: { name: employee.name, active: employee.active },
      new_data: JSON.parse(JSON.stringify(updateData)),
      reason, performed_by: auth.user.username, user_id: auth.user.id,
    },
  });

  return ok(updated);
}
