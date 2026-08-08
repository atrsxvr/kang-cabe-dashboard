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
  { href: "/health", label: "Kesehatan Tanaman", icon: Stethoscope },
  { href: "/inventory", label: "Inventaris & Alat", icon: Package },
  { href: "/harvest", label: "Panen & Penjualan", icon: Wheat },
  { href: "/finance", label: "Keuangan & Kas", icon: Wallet },
  { href: "/settings", label: "Settings & Users", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  // "/" would otherwise prefix-match every route.
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
