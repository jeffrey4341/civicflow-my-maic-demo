import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-civic-800 to-civic-600 text-white">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
          <span className="text-flag-gold">●</span> MAIC Nexus Challenge T5 · Public Services &amp; Smart Cities
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">CivicFlow MY Mobile</h1>
        <p className="mt-4 max-w-2xl text-lg text-civic-50">
          A mobile-first, multilingual citizen-service AI casework platform for Malaysian
          councils. Citizens report issues in Malay, English, Chinese or Tamil; the system
          classifies, retrieves policy citations, routes to the right department, gates
          high-risk cases for supervisor approval, and drafts a reply — with a full audit trail.
        </p>

        <div className="mt-6 rounded-lg border border-flag-gold/40 bg-flag-gold/10 px-4 py-3 text-sm text-flag-gold">
          Public demo artifact. All cases, SOPs and citizen data are <strong>synthetic</strong>.
          AI drafts; officers and supervisors decide. High-risk cases require human approval.
          This is a citizen-service workflow layer, not a chatbot.
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <Link
            href="/m"
            className="group rounded-2xl bg-white p-6 text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="text-2xl">📱</div>
            <h2 className="mt-3 text-xl font-semibold text-civic-700">Citizen app</h2>
            <p className="mt-1 text-sm text-slate-600">
              Mobile-first PWA. Submit a service request in your language and track its status.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-civic-600 group-hover:underline">
              Open /m →
            </span>
          </Link>

          <Link
            href="/officer"
            className="group rounded-2xl bg-white p-6 text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="text-2xl">🏛️</div>
            <h2 className="mt-3 text-xl font-semibold text-civic-700">Officer console</h2>
            <p className="mt-1 text-sm text-slate-600">
              Case queue, AI triage, SOP citations, supervisor approvals and the audit timeline.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-civic-600 group-hover:underline">
              Open /officer →
            </span>
          </Link>
        </div>

        <p className="mt-10 text-xs text-civic-100/80">
          Reference: README.md · AI_DISCLOSURE.md · DATA_CARD.md · MODEL_CARD.md · docs/
        </p>
      </div>
    </main>
  );
}
