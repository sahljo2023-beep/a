import { NextRequest } from "next/server";
import { z } from "zod";
import argon2 from "argon2";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";

const createSchema = z.object({
  username: z.string().min(3).max(50).trim().toLowerCase(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(100),
  display_name: z.string().min(2).max(100).trim(),
  role: z.enum(["VIEWER"]),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    where: { role: { in: ["VIEWER", "ADMIN"] } },
    select: { id: true, username: true, email: true, role: true, display_name: true, active: true, created_at: true },
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });
  return ok(users);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { username, email, password, display_name, role } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, ...(email ? [{ email }] : [])] } });
  if (existing) return fail("اسم المستخدم أو البريد الإلكتروني مستخدم مسبقاً", 409);

  const password_hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });

  const user = await prisma.user.create({
    data: { username, email, password_hash, display_name, role },
    select: { id: true, username: true, role: true, display_name: true, active: true },
  });

  await prisma.auditLog.create({
    data: {
      table_name: "users", record_id: user.id, action: "CREATE",
      new_data: { username, role, display_name },
      reason: "إنشاء حساب مدير جديد", performed_by: auth.user.username, user_id: auth.user.id,
    },
  });
  return ok(user, 201);
}
