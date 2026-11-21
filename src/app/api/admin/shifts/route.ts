import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "الوقت بصيغة HH:MM"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "الوقت بصيغة HH:MM"),
  crosses_midnight: z.boolean().default(false),
});

function calcDuration(start: string, end: string, crossesMidnight: boolean): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (crossesMidnight || endMin <= startMin) return (endMin + 1440 - startMin);
  return endMin - startMin;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const shifts = await prisma.shift.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true, name: true, start_time: true, end_time: true,
      crosses_midnight: true, duration_minutes: true, active: true, created_at: true,
    },
  });
  return ok(shifts);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { name, start_time, end_time, crosses_midnight } = parsed.data;

  const existing = await prisma.shift.findFirst({ where: { name } });
  if (existing) return fail("وردية بنفس الاسم موجودة مسبقاً", 409);

  const duration_minutes = calcDuration(start_time, end_time, crosses_midnight);

  const shift = await prisma.shift.create({
    data: { name, start_time, end_time, crosses_midnight, duration_minutes },
    select: { id: true, name: true, start_time: true, end_time: true, crosses_midnight: true, duration_minutes: true, active: true },
  });

  await prisma.auditLog.create({
    data: {
      table_name: "shifts", record_id: shift.id, action: "CREATE",
      new_data: { name, start_time, end_time, crosses_midnight, duration_minutes },
      reason: "إضافة وردية", performed_by: auth.user.username, user_id: auth.user.id,
    },
  });
  return ok(shift, 201);
}
