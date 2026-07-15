import Image from "next/image";
import Link from "next/link";

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Link href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-civic-900 focus:ring-2 focus:ring-civic-700">
        Skip to main content
      </Link>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-2xl items-center px-4 sm:px-6">
          <Link href="/m" className="flex min-h-11 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2">
            <Image src="/civicflow-mark.svg" alt="" width={36} height={36} priority />
            <span>
              <span className="block font-semibold leading-5 text-slate-950">CivicFlow MY</span>
              <span className="block text-xs leading-4 text-slate-600">Majlis Demo citizen services</span>
            </span>
          </Link>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-2xl px-4 py-6 outline-none sm:px-6 sm:py-8">{children}</main>
      <footer className="mx-auto max-w-2xl border-t border-slate-200 px-4 py-5 text-sm leading-6 text-slate-600 sm:px-6">
        Public demo · Synthetic data only · Human decisions remain required
      </footer>
    </div>
  );
}
