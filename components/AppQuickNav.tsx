"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/friends",
    label: "Friends",
    active:
      "border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-100 shadow-[0_0_12px_rgba(217,70,239,0.15)]",
    idle: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200/90 hover:bg-fuchsia-500/15",
  },
  {
    href: "/party",
    label: "Party",
    active:
      "border-cyan-400/60 bg-cyan-500/20 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.15)]",
    idle: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200/90 hover:bg-cyan-500/15",
  },
  {
    href: "/settings",
    label: "Settings",
    active:
      "border-purple-400/60 bg-purple-500/20 text-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.15)]",
    idle: "border-purple-500/25 bg-purple-500/10 text-purple-200/90 hover:bg-purple-500/15",
  },
] as const;

type Props = {
  className?: string;
};

export function AppQuickNav({ className = "" }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className={`grid grid-cols-3 gap-2 ${className}`}
      aria-label="Quick navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl border px-2 py-2.5 text-center text-xs font-bold tracking-wide transition ${
              isActive ? item.active : item.idle
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
