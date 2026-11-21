import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  active: z.boolean().optional(),
  reason: z.string().min(3).max(500),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const device = await prisma.device.findUnique({ where: { id } });
  if (!device) return fail("الجهاز غير موجود", 404);

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { reason, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  if (rest.active === false) updateData.deactivated_at = new Date();
  if (rest.active === true) updateData.deactivated_at = null;

  const updated = await prisma.device.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, active: true, deactivated_at: true },
  });

  await prisma.auditLog.create({
    data: {
      table_name: "devices", record_id: id, action: "UPDATE",
      original_data: { name: device.name, active: device.active },
      new_data: JSON.parse(JSON.stringify(updateData)),
      reason, performed_by: auth.user.username, user_id: auth.user.id,
    },
  });
  return ok(updated);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const device = await prisma.device.findUnique({ where: { id } });
  if (!device) return fail("الجهاز غير موجود", 404);

  const body = await request.json().catch(() => ({}));
  const reason = body?.reason as string;
  if (!reason || reason.length < 3) return fail("السبب إلزامي (3 أحرف على الأقل)");

  const rawToken = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.device.update({ where: { id }, data: { token_hash: tokenHash } });

  await prisma.auditLog.create({
    data: {
      table_name: "devices", record_id: id, action: "REGENERATE_TOKEN",
      reason, performed_by: auth.user.username, user_id: auth.user.id,
    },
  });

  return ok({ id, token: rawToken, warning: "احفظ هذا التوكن الآن، لن يُعرض مجدداً!" });
}
