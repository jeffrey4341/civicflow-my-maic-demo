/**
 * Append-only audit timeline.
 *
 * Concept adapted (not copied) from the reference repo's AuditEvent log: every
 * state change or AI decision produces one immutable event with an actor, an
 * event_type, a one-line summary and a structured payload.
 */

import type { AuditActor, AuditEvent } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";

const DEFAULT_LABELS: Record<AuditActor, string> = {
  system: "System",
  ai_agent: "AI Triage Agent",
  citizen: "Citizen",
  officer: "Council Officer",
  supervisor: "Supervisor",
};

export function makeAuditEvent(args: {
  case_id: string;
  actor: AuditActor;
  event_type: string;
  summary: string;
  payload?: Record<string, unknown>;
  actor_label?: string;
}): AuditEvent {
  return {
    event_id: newId("audit"),
    case_id: args.case_id,
    actor: args.actor,
    actor_label: args.actor_label ?? DEFAULT_LABELS[args.actor],
    event_type: args.event_type,
    summary: args.summary,
    payload: args.payload ?? {},
    created_at: nowIso(),
  };
}
