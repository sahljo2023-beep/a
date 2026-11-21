import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get("start_date");
  const endDateStr = searchParams.get("end_date");
  const hotelId = searchParams.get("hotel_id");
  const employeeId = searchParams.get("employee_id");

  const where: any = {};
  if (startDateStr && endDateStr) {
    where.date = {
      gte: new Date(startDateStr),
      lte: new Date(endDateStr),
    };
  }
  if (hotelId) where.hotel_id = hotelId;
  if (employeeId) where.employee_id = employeeId;

  const entries = await prisma.scheduleEntry.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true } },
      hotel: { select: { id: true, name: true, code: true } },
      shift: { select: { id: true, name: true, start_time: true, end_time: true, duration_minutes: true } },
    },
    orderBy: [{ date: "asc" }, { employee: { name: "asc" } }],
  });

  return ok(entries);
}

const batchEntrySchema = z.object({
  employee_id: z.string(),
  hotel_id: z.string(),
  shift_id: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_day_off: z.boolean().default(false),
});

const batchSaveSchema = z.object({
  entries: z.array(batchEntrySchema),
  reason: z.string().min(3),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = batchSaveSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { entries, reason } = parsed.data;

  await prisma.$transaction(async (tx) => {
    for (const item of entries) {
      const dateObj = new Date(item.date);

      await tx.scheduleEntry.upsert({
        where: {
          employee_id_date: {
            employee_id: item.employee_id,
            date: dateObj,
          },
        },
        create: {
          employee_id: item.employee_id,
          hotel_id: item.hotel_id,
          shift_id: item.shift_id || null,
          date: dateObj,
          is_day_off: item.is_day_off,
        },
        update: {
          hotel_id: item.hotel_id,
          shift_id: item.shift_id || null,
          is_day_off: item.is_day_off,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        table_name: "schedule_entries",
        record_id: "BATCH",
        action: "UPDATE",
        new_data: { count: entries.length },
        reason,
        performed_by: auth.user.username,
        user_id: auth.user.id,
      },
    });
  });

  return ok({ message: "تم حفظ جدول الدوام بنجاح", count: entries.length });
}
