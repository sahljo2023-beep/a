import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, ok, fail } from "@/lib/api-helpers";

const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

const updateSchema = z.object({
  cidr: z.string().regex(cidrRegex).optional(),
  description: z.string().max(200).nullable().optional(),
  active: z.boolean().optional(),
  reason: z.string().min(3).max(500),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const network = await prisma.allowedNetwork.findUnique({ where: { id } });
  if (!network) return fail("النطاق غير موجود", 404);

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة");

  const { reason, ...rest } = parsed.data;
  const updated = await prisma.allowedNetwork.update({
    where: { id },
    data: rest,
    select: { id: true, cidr: true, active: true },
  });

  await prisma.auditLog.create({
    data: {
      table_name: "allowed_networks", record_id: id, action: "UPDATE",
      original_data: { cidr: network.cidr, active: network.active },
      new_data: rest,
      reason, performed_by: auth.user.username, user_id: auth.user.id,
    },
  });
  return ok(updated);
}
