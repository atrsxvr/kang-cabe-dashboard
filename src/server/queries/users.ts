import "server-only";

import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

export type MemberOption = {
  id: string;
  name: string;
  role: Role;
};

/** Assignable members. Deactivated ones are excluded by the deletedAt filter. */
export async function listActiveMembers(): Promise<MemberOption[]> {
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}
