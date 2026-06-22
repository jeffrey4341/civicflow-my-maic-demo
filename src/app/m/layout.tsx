import Link from "next/link";

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-200 py-0 sm:py-6">
      <div className="phone-shell flex min-h-screen flex-col sm:min-h-[860px] sm:rounded-3xl sm:overflow-hidden">
        <header className="flex items-center justify-between bg-civic-700 px-4 py-3 text-white">
          <Link href="/m" className="flex items-center gap-2">
            <span aria-hidden className="text-lg">🌾</span>
            <span className="font-semibold">CivicFlow MY</span>
          </Link>
          <Link href="/officer" className="text-xxs text-civic-100 underline">
            Officer view
          </Link>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-slate-100 px-4 py-2 text-center text-2xs text-slate-400">
          MAIC T5 demo · synthetic data · AI drafts, officers decide
        </footer>
      </div>
    </div>
  );
}
