import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");

  const employees = await prisma.employee.findMany({
    where: employeeId ? { id: employeeId } : { active: true },
    select: {
      id: true,
      name: true,
      financial_transactions: {
        select: {
          id: true,
          type: true,
          amount: true,
          transaction_date: true,
          created_at: true,
          description: true,
        },
      },
    },
  });

  const summary = employees.map((emp) => {
    let doubleDue = 0;
    let lateClaimDue = 0;
    let paidOut = 0;
    let received = 0;

    for (const tx of emp.financial_transactions) {
      const amt = Number(tx.amount);
      if (tx.type === "DOUBLE_DUE") doubleDue += amt;
      else if (tx.type === "LATE_CLAIM") lateClaimDue += amt;
      else if (tx.type === "PAYMENT_MADE") paidOut += amt;
      else if (tx.type === "PAYMENT_RECEIVED") received += amt;
    }

    const netBalance = doubleDue + lateClaimDue - paidOut;

    return {
      id: emp.id,
      name: emp.name,
      doubleDue: doubleDue.toFixed(3),
      lateClaimDue: lateClaimDue.toFixed(3),
      paidOut: paidOut.toFixed(3),
      received: received.toFixed(3),
      netBalance: netBalance.toFixed(3),
      transactions: emp.financial_transactions,
    };
  });

  return ok(summary);
}

const paymentSchema = z.object({
  employee_id: z.string(),
  hotel_id: z.string(),
  amount: z.number().positive(),
  payment_type: z.enum(["PAYMENT_MADE", "PAYMENT_RECEIVED"]),
  notes: z.string().min(3),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { employee_id, hotel_id, amount, payment_type, notes } = parsed.data;

  const tx = await prisma.$transaction(async (prismaTx) => {
    const payment = await prismaTx.financialTransaction.create({
      data: {
        employee_id,
        hotel_id,
        type: payment_type,
        amount,
        transaction_date: new Date(),
        description: notes,
      },
    });

    await prismaTx.auditLog.create({
      data: {
        table_name: "financial_transactions",
        record_id: payment.id,
        action: "CREATE",
        new_data: { amount, type: payment_type, employee_id },
        reason: `تسجيل دفعة: ${notes}`,
        performed_by: auth.user.username,
        user_id: auth.user.id,
      },
    });

    return payment;
  });

  return ok(tx, 201);
}
