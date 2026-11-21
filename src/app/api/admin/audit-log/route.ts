import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, ok } from "@/lib/api-helpers";

// GET /api/admin/audit-log
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const logs = await prisma.auditLog.findMany({
    orderBy: { created_at: "desc" },
    take: 200,
  });

  return ok(logs);
}
