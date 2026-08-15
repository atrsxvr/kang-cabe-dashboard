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

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  profitShare: number;
  deletedAt: Date | null;
  /** Berapa banyak jejaknya, buat menjelaskan kenapa ia tidak bisa dihapus. */
  counts: { tasks: number; harvests: number; sales: number };
};

/** Semua anggota, termasuk yang sudah dinonaktifkan. */
export async function listMembers(): Promise<MemberRow[]> {
  const rows = await prisma.user.findMany({
    orderBy: [{ deletedAt: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      profitShare: true,
      deletedAt: true,
      _count: {
        select: {
          tasksAssigned: true,
          harvestsRecorded: true,
          salesRecorded: true,
        },
      },
    },
  });

  return rows.map(({ _count, ...member }) => ({
    ...member,
    counts: {
      tasks: _count.tasksAssigned,
      harvests: _count.harvestsRecorded,
      sales: _count.salesRecorded,
    },
  }));
}

export type GardenProfileRow = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  defaultTankLitres: number;
};

/**
 * The single garden row, created on first read.
 *
 * Upserting here rather than seeding it means the settings page works on a
 * database that has never been seeded — including the throwaway one CI builds.
 */
export async function getGardenProfile(): Promise<GardenProfileRow> {
  return prisma.gardenProfile.upsert({
    where: { id: "garden" },
    update: {},
    create: { id: "garden" },
    select: {
      name: true,
      latitude: true,
      longitude: true,
      locationName: true,
      defaultTankLitres: true,
    },
  });
}
