import Link from "next/link";
import { ResetButton } from "@/components/officer/ResetButton";

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-flag-gold/20 px-4 py-1.5 text-center text-[11px] font-medium text-amber-900">
        Officer console · synthetic demo data · AI drafts recommendations — officers and supervisors decide
      </div>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Link href="/officer" className="flex items-center gap-2 font-semibold text-civic-700">
              <span aria-hidden>🏛️</span> CivicFlow MY · Officer
            </Link>
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <Link href="/officer" className="rounded-full bg-slate-100 px-3 py-1 hover:text-civic-700">Queue</Link>
              <Link href="/officer/approvals" className="rounded-full bg-slate-100 px-3 py-1 hover:text-civic-700">Approvals</Link>
              <Link href="/officer/audit" className="rounded-full bg-slate-100 px-3 py-1 hover:text-civic-700">Audit</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/m" className="text-xs text-slate-600 underline">Citizen app</Link>
            <ResetButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
