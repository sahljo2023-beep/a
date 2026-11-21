import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";
import { calculateLateClaimAmount } from "@/lib/decimal";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const claims = await prisma.lateClaim.findMany({
    include: {
      late_employee: { select: { id: true, name: true } },
      waiting_employee: { select: { id: true, name: true } },
      hotel: { select: { id: true, name: true, code: true } },
      shift: { select: { id: true, name: true, start_time: true } },
    },
    orderBy: { date: "desc" },
  });

  return ok(claims);
}

const createClaimSchema = z.object({
  late_employee_id: z.string(),
  waiting_employee_id: z.string(),
  hotel_id: z.string(),
  shift_id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift_start: z.string(),
  arrival_time: z.string(),
  minutes_late: z.number().int().positive(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = createClaimSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const {
    late_employee_id,
    waiting_employee_id,
    hotel_id,
    shift_id,
    date,
    shift_start,
    arrival_time,
    minutes_late,
    notes,
  } = parsed.data;

  if (late_employee_id === waiting_employee_id) {
    return fail("لا يمكن أن يكون الموظف المتأخر هو نفسه الموظف المنتظِر", 400);
  }

  const financialValue = calculateLateClaimAmount(minutes_late);
  const dateObj = new Date(date);

  const claim = await prisma.$transaction(async (tx) => {
    const newClaim = await tx.lateClaim.create({
      data: {
        late_employee_id,
        waiting_employee_id,
        hotel_id,
        shift_id: shift_id || null,
        date: dateObj,
        shift_start: new Date(shift_start),
        actual_arrival: new Date(arrival_time),
        late_minutes: minutes_late,
        remaining_minutes: minutes_late,
        amount: financialValue.toNumber(),
      },
    });

    await tx.financialTransaction.create({
      data: {
        employee_id: waiting_employee_id,
        hotel_id,
        type: "LATE_CLAIM",
        amount: financialValue.toNumber(),
        transaction_date: dateObj,
        description: `مطالبة تأخير لمدة ${minutes_late} دقيقة`,
        late_claim_id: newClaim.id,
      },
    });

    await tx.auditLog.create({
      data: {
        table_name: "late_claims",
        record_id: newClaim.id,
        action: "CREATE",
        new_data: { minutes_late, amount: financialValue.toNumber() },
        reason: "تسجيل مطالبة تأخير جديدة",
        performed_by: auth.user.username,
        user_id: auth.user.id,
      },
    });

    return newClaim;
  });

  return ok(claim, 201);
}
