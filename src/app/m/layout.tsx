import Link from "next/link";

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-2xl items-center px-4 sm:px-6">
          <Link href="/m" className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-civic-700 text-xs font-bold text-white" aria-hidden>
              CF
            </span>
            <span>
              <span className="block font-semibold leading-5 text-slate-950">CivicFlow MY</span>
              <span className="block text-xs leading-4 text-slate-600">Majlis Demo citizen services</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="mx-auto max-w-2xl border-t border-slate-200 px-4 py-5 text-sm leading-6 text-slate-600 sm:px-6">
        Public demo · Synthetic data only · Human decisions remain required
      </footer>
    </div>
  );
}
