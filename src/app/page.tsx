import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        <header className="flex items-center gap-3">
          <Image src="/civicflow-mark.svg" alt="" width={40} height={40} priority />
          <div>
            <p className="font-semibold text-slate-950">CivicFlow MY</p>
            <p className="text-sm text-slate-600">Majlis Demo citizen services</p>
          </div>
        </header>

        <section className="mt-12 max-w-3xl">
          <p className="font-medium text-civic-700">Public-service casework demo</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            A clear path from citizen request to human decision.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
            Submit or track a council service request in Bahasa Melayu, English, 中文, or தமிழ்.
            Officers review every recommendation, and supervisors decide high-risk cases.
          </p>
        </section>

        <aside className="mt-8 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="note">
          This public demo uses synthetic cases and policies only. Do not enter real personal details.
          The system drafts and recommends; council staff make the decisions.
        </aside>

        <nav className="mt-10 max-w-3xl divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Choose a workspace">
          <Link
            href="/m"
            aria-label="Citizen services — submit or track a request"
            className="group flex min-h-32 items-center justify-between gap-5 p-5 outline-none transition-colors hover:bg-civic-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-civic-600 sm:p-6"
          >
            <span>
              <span className="block text-lg font-semibold text-slate-950">Citizen services</span>
              <span className="mt-1 block max-w-xl text-sm leading-6 text-slate-600">
                Submit a request, provide follow-up details, or check what happens next.
              </span>
            </span>
            <span className="text-xl text-civic-700" aria-hidden>→</span>
          </Link>
          <Link
            href="/officer"
            aria-label="Officer workspace — review and decide cases"
            className="group flex min-h-32 items-center justify-between gap-5 p-5 outline-none transition-colors hover:bg-civic-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-civic-600 sm:p-6"
          >
            <span>
              <span className="block text-lg font-semibold text-slate-950">Officer workspace</span>
              <span className="mt-1 block max-w-xl text-sm leading-6 text-slate-600">
                Review case facts, policy evidence, supervisor gates, replies, and audit history.
              </span>
            </span>
            <span className="text-xl text-civic-700" aria-hidden>→</span>
          </Link>
        </nav>

        <footer className="mt-10 text-sm text-slate-500">
          MAIC Nexus Challenge T5 · Public Services &amp; Smart Cities
        </footer>
      </div>
    </main>
  );
}
