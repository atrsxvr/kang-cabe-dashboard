import {
  CalendarCheck,
  LayoutDashboard,
  Package,
  Settings,
  Sprout,
  Stethoscope,
  Wallet,
  Wheat,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** The eight modules from the PRD, in PRD order. */
export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/seasons", label: "Manajemen Musim", icon: Sprout },
  { href: "/tasks", label: "Jadwal & Tugas", icon: CalendarCheck },
  { href: "/health", label: "Kesehatan & Monitoring", icon: Stethoscope },
  { href: "/inventory", label: "Inventaris & Alat", icon: Package },
  { href: "/harvest", label: "Panen & Penjualan", icon: Wheat },
  { href: "/finance", label: "Keuangan & Kas", icon: Wallet },
  { href: "/settings", label: "Pengaturan & Anggota", icon: Settings },
];

/**
 * The phone's bottom bar: the five modules used out in the garden — the
 * morning look, a task done, something wrong on a leaf, the shed, a picking
 * weighed. Short labels, because five have to fit across 360px.
 *
 * Musim, Keuangan and Pengaturan are desk work and stay behind ☰, which
 * still lists all eight. Same hrefs and icons as `navItems`, so the two
 * cannot disagree about where a module lives.
 */
export const bottomNavItems: NavItem[] = [
  { href: "/", label: "Beranda", icon: LayoutDashboard },
  { href: "/tasks", label: "Tugas", icon: CalendarCheck },
  { href: "/health", label: "Kesehatan", icon: Stethoscope },
  { href: "/inventory", label: "Gudang", icon: Package },
  { href: "/harvest", label: "Panen", icon: Wheat },
];

export function isActive(pathname: string, href: string): boolean {
  // "/" would otherwise prefix-match every route.
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
