import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  crosses_midnight: z.boolean().optional(),
  active: z.boolean().optional(),
  reason: z.string().min(3).max(500),
});

function calcDuration(start: string, end: string, crossesMidnight: boolean): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (crossesMidnight || endMin <= startMin) return endMin + 1440 - startMin;
  return endMin - startMin;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift) return fail("الوردية غير موجودة", 404);
  return ok(shift);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift) return fail("الوردية غير موجودة", 404);

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { reason, ...rest } = parsed.data;
  const updateData: any = { ...rest };

  const newStart = (rest.start_time ?? shift.start_time) as string;
  const newEnd = (rest.end_time ?? shift.end_time) as string;
  const newCrosses = rest.crosses_midnight ?? shift.crosses_midnight;
  updateData.duration_minutes = calcDuration(newStart, newEnd, newCrosses);

  const updated = await prisma.shift.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, start_time: true, end_time: true, duration_minutes: true, active: true },
  });

  await prisma.auditLog.create({
    data: {
      table_name: "shifts", record_id: id, action: "UPDATE",
      original_data: { name: shift.name, start_time: shift.start_time, end_time: shift.end_time },
      new_data: JSON.parse(JSON.stringify(updateData)),
      reason, performed_by: auth.user.username, user_id: auth.user.id,
    },
  });
  return ok(updated);
}
