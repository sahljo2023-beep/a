import { NextRequest } from "next/server";
import { z } from "zod";
import argon2 from "argon2";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";
import { normalizeArabic } from "@/lib/normalize";

const createSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  pin: z.string().min(4).max(8).regex(/^\d+$/, "PIN يجب أن يكون أرقاماً فقط"),
  hired_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح"),
  default_hotel_id: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// GET /api/admin/employees
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const active = searchParams.get("active");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "20"));

  const where = {
    ...(search ? { name_normalized: { contains: normalizeArabic(search) } } : {}),
    ...(active !== null ? { active: active === "true" } : {}),
  };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      select: {
        id: true, name: true, active: true, hired_at: true, left_at: true,
        notes: true, default_hotel_id: true,
        default_hotel: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return ok({ employees, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

// POST /api/admin/employees
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { name, pin, hired_at, default_hotel_id, notes } = parsed.data;
  const name_normalized = normalizeArabic(name);

  const existing = await prisma.employee.findFirst({ where: { name_normalized, active: true } });
  if (existing) return fail("يوجد موظف آخر بنفس الاسم (بعد تطبيع الحروف العربية)", 409);

  const pin_hash = await argon2.hash(pin, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });

  const employee = await prisma.employee.create({
    data: {
      name: name.trim(),
      name_normalized,
      pin_hash,
      hired_at: new Date(hired_at),
      default_hotel_id: default_hotel_id || undefined,
      notes: notes || undefined,
    },
    select: { id: true, name: true, active: true, hired_at: true, default_hotel_id: true },
  });

  await prisma.auditLog.create({
    data: {
      table_name: "employees", record_id: employee.id,
      action: "CREATE", new_data: { name: employee.name, hired_at },
      reason: "إضافة موظف جديد", performed_by: auth.user.username,
      user_id: auth.user.id,
    },
  });

  return ok(employee, 201);
}
