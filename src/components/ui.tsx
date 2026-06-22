import type {
  AuditEvent,
  CaseStatus,
  Language,
  PiiRisk,
  PolicyCitation,
  Urgency,
} from "@/lib/types";
import { statusLabel, urgencyLabel } from "@/lib/i18n";

/* ──────────────────────────────────────────────────────────────────────────
 * Interactive primitives — the single source of truth for buttons and form
 * fields. Every interactive control should use these so focus, disabled, and
 * loading behaviour stay consistent and accessible across the app.
 * ────────────────────────────────────────────────────────────────────────── */

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "soft-indigo"
  | "soft-emerald";
type ButtonSize = "sm" | "md" | "lg";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-civic-600 text-white hover:bg-civic-700",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  "soft-indigo": "border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
  "soft-emerald": "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
};

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-4 py-3 text-sm",
};

/** Decorative loading spinner; hidden from assistive tech (button sets aria-busy). */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className = "",
  disabled,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

const FIELD_BASE =
  "w-full rounded-lg border border-slate-300 text-sm transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-200 disabled:opacity-50";

/** Single-line text field. Pass `label` to render an associated <label>. */
export function Input({
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const field = <input className={`${FIELD_BASE} px-3 py-2 ${className}`} {...props} />;
  if (!label) return field;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {field}
    </label>
  );
}

/** Multi-line text field. Pass `label` to render an associated <label>. */
export function Textarea({
  label,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const field = <textarea className={`${FIELD_BASE} p-2.5 ${className}`} {...props} />;
  if (!label) return field;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {field}
    </label>
  );
}

const STATUS_STYLE: Record<CaseStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  needs_info: "bg-amber-100 text-amber-800",
  submitted: "bg-sky-100 text-sky-800",
  manual_review: "bg-red-100 text-red-800",
  routed: "bg-civic-100 text-civic-800",
  awaiting_supervisor: "bg-orange-100 text-orange-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  closed: "bg-emerald-100 text-emerald-800",
};

const URGENCY_STYLE: Record<Urgency, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-slate-100 text-slate-700",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-orange-100 text-orange-800",
  flood_risk: "bg-red-100 text-red-800",
};

const PII_STYLE: Record<PiiRisk, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

export function Badge({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, locale = "en" }: { status: CaseStatus; locale?: Language }) {
  return <Badge className={STATUS_STYLE[status]}>{statusLabel(status, locale)}</Badge>;
}

export function UrgencyBadge({ urgency, locale = "en" }: { urgency: Urgency; locale?: Language }) {
  return <Badge className={URGENCY_STYLE[urgency]}>{urgencyLabel(urgency, locale)}</Badge>;
}

export function PiiBadge({ risk }: { risk: PiiRisk }) {
  return <Badge className={PII_STYLE[risk]}>PII: {risk}</Badge>;
}

export function ConfidenceBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      {label ? <div className="mb-1 text-xs text-slate-500">{label}</div> : null}
      <div className="flex items-center gap-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-civic-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-9 text-right text-xs tabular-nums text-slate-600">{pct}%</span>
      </div>
    </div>
  );
}

export function CitationCard({ citation }: { citation: PolicyCitation }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-civic-700">{citation.doc_title}</div>
        <Badge className="bg-civic-50 text-civic-700">{Math.round(citation.confidence * 100)}%</Badge>
      </div>
      <div className="mt-0.5 text-xs font-medium text-slate-500">§ {citation.section}</div>
      <p className="mt-2 text-sm text-slate-700">“{citation.snippet}”</p>
      <div className="mt-2 text-[11px] text-slate-400">source: {citation.source_doc}</div>
    </div>
  );
}

const ACTOR_DOT: Record<string, string> = {
  citizen: "bg-sky-500",
  ai_agent: "bg-civic-500",
  system: "bg-slate-400",
  officer: "bg-indigo-500",
  supervisor: "bg-orange-500",
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
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
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No audit events yet.</p>;
  }
  return (
    <ol className="relative ml-3 border-l border-slate-200">
      {events.map((e) => (
        <li key={e.event_id} className="relative mb-4 pl-5">
          <span className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${ACTOR_DOT[e.actor] ?? "bg-slate-400"}`} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-slate-400">{e.event_type}</span>
            <span className="text-[11px] text-slate-400">· {e.actor_label}</span>
            <span className="text-[11px] text-slate-400">· {formatTime(e.created_at)}</span>
          </div>
          <p className="mt-0.5 text-sm text-slate-700">{e.summary}</p>
        </li>
      ))}
    </ol>
  );
}

export function SafetyBanner({ text }: { text: string }) {
  return (
    <div className="bg-flag-gold/15 px-4 py-2 text-center text-[11px] font-medium text-amber-900">
      {text}
    </div>
  );
}
