import { statusLabel, urgencyLabel } from "@/lib/i18n";
import type {
  AuditActor,
  AuditEvent,
  CaseStatus,
  Language,
  PiiRisk,
  PolicyCitation,
  Urgency,
} from "@/lib/types";

const STATUS_STYLE: Record<CaseStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  needs_info: "bg-amber-100 text-amber-900",
  submitted: "bg-sky-100 text-sky-900",
  manual_review: "bg-red-100 text-red-800",
  routed: "bg-civic-100 text-civic-900",
  awaiting_supervisor: "bg-orange-100 text-orange-900",
  in_progress: "bg-indigo-100 text-indigo-900",
  closed: "bg-emerald-100 text-emerald-900",
};

const URGENCY_STYLE: Record<Urgency, string> = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-slate-100 text-slate-700",
  high: "bg-amber-100 text-amber-900",
  urgent: "bg-orange-100 text-orange-900",
  flood_risk: "bg-red-100 text-red-800",
};

const PII_STYLE: Record<PiiRisk, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-900",
  high: "bg-red-100 text-red-800",
};

export function Badge({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>;
}

export function StatusBadge({ status, locale = "en" }: { status: CaseStatus; locale?: Language }) {
  return <Badge className={STATUS_STYLE[status]}>{statusLabel(status, locale)}</Badge>;
}

export function UrgencyBadge({ urgency, locale = "en" }: { urgency: Urgency; locale?: Language }) {
  return <Badge className={URGENCY_STYLE[urgency]}>{urgencyLabel(urgency, locale)}</Badge>;
}

export function PiiBadge({ risk }: { risk: PiiRisk }) {
  return <Badge className={PII_STYLE[risk]}>PII review: {risk}</Badge>;
}

export function ConfidenceBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      {label ? <label htmlFor={`confidence-${label.replaceAll(" ", "-")}`} className="mb-1 block text-xs text-slate-600">{label}</label> : null}
      <div className="flex items-center gap-2">
        <progress id={label ? `confidence-${label.replaceAll(" ", "-")}` : undefined} max={100} value={pct} aria-label={label ?? "Confidence"} className="h-2 w-full accent-civic-700" />
        <span className="w-10 text-right text-xs tabular-nums text-slate-600">{pct}%</span>
      </div>
    </div>
  );
}

export function CitationCard({ citation }: { citation: PolicyCitation }) {
  return (
    <article className="border-l-2 border-slate-300 pl-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-civic-800">{citation.doc_title}</h3>
        <Badge className="bg-civic-50 text-civic-800">{Math.round(citation.confidence * 100)}% match</Badge>
      </div>
      <p className="mt-1 text-xs font-medium text-slate-600">§ {citation.section}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{citation.snippet}</p>
      <p className="mt-2 font-mono text-xs text-slate-500">{citation.source_doc}</p>
    </article>
  );
}

const ACTOR_STYLE: Record<AuditActor, string> = {
  citizen: "bg-sky-100 text-sky-900",
  ai_agent: "bg-civic-100 text-civic-900",
  system: "bg-slate-100 text-slate-700",
  officer: "bg-indigo-100 text-indigo-900",
  supervisor: "bg-orange-100 text-orange-900",
};

const ACTOR_LABEL: Record<AuditActor, string> = {
  citizen: "Citizen",
  ai_agent: "Automated triage",
  system: "System",
  officer: "Officer",
  supervisor: "Supervisor",
};

export function ActorBadge({ actor, label }: { actor: AuditActor; label?: string }) {
  const showIdentity = (actor === "officer" || actor === "supervisor") && label && label !== ACTOR_LABEL[actor];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ACTOR_STYLE[actor]}`}>
      <span>{ACTOR_LABEL[actor]}</span>
      {showIdentity ? <span className="font-normal">· {label}</span> : null}
    </span>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-MY", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-slate-600">No audit events yet.</p>;
  return (
    <ol className="divide-y divide-slate-200 border-y border-slate-200">
      {events.map((event) => {
        const revision = typeof event.payload.triage_revision === "number" ? event.payload.triage_revision : null;
        return (
          <li key={event.event_id} className="grid gap-2 py-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-5">
            <div>
              <time dateTime={event.created_at} className="text-xs text-slate-500">{formatTime(event.created_at)}</time>
              {revision !== null ? <span className="mt-1 block text-xs text-slate-500">Revision {revision}</span> : null}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <ActorBadge actor={event.actor} label={event.actor_label} />
                <span className="font-mono text-xs text-slate-500">{event.event_type}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{event.summary}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function SafetyBanner({ text }: { text: string }) {
  return <aside className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950" role="note">{text}</aside>;
}
