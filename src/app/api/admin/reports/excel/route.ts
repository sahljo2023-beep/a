import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

// GET /api/admin/reports/excel
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "نظام إدارة دوام الفنادق";
  workbook.created = new Date();

  // 1. ورقة الحضور والبصمات
  const sheetAttendance = workbook.addWorksheet("الحضور والبصمة", {
    views: [{ rightToLeft: true }],
  });

  sheetAttendance.columns = [
    { header: "الموظف", key: "employee", width: 25 },
    { header: "الفندق", key: "hotel", width: 20 },
    { header: "النوع", key: "type", width: 15 },
    { header: "الوقت والتاريخ", key: "time", width: 25 },
    { header: "المصدر", key: "source", width: 15 },
  ];

  const punches = await prisma.punch.findMany({
    include: {
      employee: { select: { name: true } },
      hotel: { select: { name: true } },
    },
    orderBy: { server_timestamp: "desc" },
    take: 500,
  });

  punches.forEach((p) => {
    sheetAttendance.addRow({
      employee: p.employee.name,
      hotel: p.hotel.name,
      type: p.type === "IN" ? "دخول" : "خروج",
      time: new Date(p.server_timestamp).toLocaleString("ar-JO", { timeZone: "Asia/Amman" }),
      source: p.source,
    });
  });

  // 2. ورقة الحسابات المالية ومستحقات الدبل والتأخير
  const sheetFinancial = workbook.addWorksheet("الحسابات والأرصدة", {
    views: [{ rightToLeft: true }],
  });

  sheetFinancial.columns = [
    { header: "الموظف", key: "employee", width: 25 },
    { header: "مستحقات الدبل (د.أ)", key: "double", width: 20 },
    { header: "مطالبات التأخير (د.أ)", key: "late", width: 20 },
    { header: "المدفوع (د.أ)", key: "paid", width: 20 },
    { header: "صافي الرصيد المتبقي (د.أ)", key: "balance", width: 25 },
  ];

  const employees = await prisma.employee.findMany({
    where: { active: true },
    include: { financial_transactions: true },
  });

  employees.forEach((emp) => {
    let doubleDue = 0;
    let lateClaimDue = 0;
    let paidOut = 0;

    for (const tx of emp.financial_transactions) {
      const amt = Number(tx.amount);
      if (tx.type === "DOUBLE_DUE") doubleDue += amt;
      else if (tx.type === "LATE_CLAIM") lateClaimDue += amt;
      else if (tx.type === "PAYMENT_MADE") paidOut += amt;
    }

    sheetFinancial.addRow({
      employee: emp.name,
      double: doubleDue.toFixed(3),
      late: lateClaimDue.toFixed(3),
      paid: paidOut.toFixed(3),
      balance: (doubleDue + lateClaimDue - paidOut).toFixed(3),
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="hotel_attendance_report.xlsx"',
    },
  });
}
