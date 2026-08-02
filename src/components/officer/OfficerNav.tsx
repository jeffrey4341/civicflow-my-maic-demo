"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/officer", label: "Case queue", match: (path: string) => path === "/officer" || path.startsWith("/officer/cases/") },
  { href: "/officer/approvals", label: "Approvals", match: (path: string) => path.startsWith("/officer/approvals") },
  { href: "/officer/audit", label: "Audit", match: (path: string) => path.startsWith("/officer/audit") },
];

export function OfficerNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Officer workspace" className="flex min-w-max items-center gap-1">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 ${
              active ? "bg-civic-50 text-civic-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
