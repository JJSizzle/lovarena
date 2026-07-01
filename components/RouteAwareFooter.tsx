"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";

const HIDE_FOOTER_PATHS = new Set(["/chat", "/party"]);

export function RouteAwareFooter() {
  const pathname = usePathname();
  if (pathname && HIDE_FOOTER_PATHS.has(pathname)) return null;
  return <SiteFooter />;
}
