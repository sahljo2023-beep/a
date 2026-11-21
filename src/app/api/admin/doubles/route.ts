import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";
import { calculateDoubleAmount } from "@/lib/decimal";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const events = await prisma.doubleEvent.findMany({
    include: {
      original_employee: { select: { id: true, name: true } },
      hotel: { select: { id: true, name: true, code: true } },
      shift: { select: { id: true, name: true } },
      allocations: {
        include: {
          employee: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  return ok(events);
}

const allocationSchema = z.object({
  covering_employee_id: z.string(),
  hours: z.number().positive(),
});

const createDoubleSchema = z.object({
  original_employee_id: z.string(),
  hotel_id: z.string(),
  shift_id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_shift_hours: z.number().positive(),
  allocations: z.array(allocationSchema).min(1),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = createDoubleSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { original_employee_id, hotel_id, shift_id, date, total_shift_hours, allocations, notes } = parsed.data;

  const sumHours = allocations.reduce((acc, curr) => acc + curr.hours, 0);
  if (Math.abs(sumHours - total_shift_hours) > 0.01) {
    return fail(`مجموع ساعات التغطية (${sumHours}) لا يساوي ساعات الوردية (${total_shift_hours})`, 400);
  }

  const totalFinancial = calculateDoubleAmount(sumHours).toNumber();
  const dateObj = new Date(date);

  const doubleEvent = await prisma.$transaction(async (tx) => {
    const event = await tx.doubleEvent.create({
      data: {
        original_employee_id,
        hotel_id,
        shift_id,
        date: dateObj,
        total_hours: sumHours,
        total_amount: totalFinancial,
        notes,
      },
    });

    for (const alloc of allocations) {
      const shareAmount = calculateDoubleAmount(alloc.hours).toNumber();

      await tx.doubleAllocation.create({
        data: {
          double_event_id: event.id,
          employee_id: alloc.covering_employee_id,
          hours: alloc.hours,
          amount: shareAmount,
        },
      });

      await tx.financialTransaction.create({
        data: {
          employee_id: alloc.covering_employee_id,
          hotel_id,
          type: "DOUBLE_DUE",
          amount: shareAmount,
          transaction_date: dateObj,
          description: `مستحقات دبل ${alloc.hours} ساعات`,
          double_event_id: event.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        table_name: "double_events",
        record_id: event.id,
        action: "CREATE",
        new_data: { total_hours: sumHours, total_amount: totalFinancial },
        reason: "تسجيل دبل وتوزيعه",
        performed_by: auth.user.username,
        user_id: auth.user.id,
      },
    });

    return event;
  });

  return ok(doubleEvent, 201);
}
