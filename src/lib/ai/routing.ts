/**
 * Routing engine — maps a category to a department, unit and SLA, mirroring the
 * synthetic data/policies/department_routing_rules.md matrix. Unknown / low-
 * confidence cases fall back to Customer Service so no case is left unrouted.
 */

import type { CaseCategory, RoutingDecision } from "@/lib/types";
import { nowIso } from "@/lib/util";
import { evaluateApprovalGate, type GateInput } from "@/lib/ai/approval";

interface RouteRow {
  rule_id: string;
  department: string;
  unit: string;
  sla_hours: number;
}

const ROUTING_TABLE: Record<CaseCategory, RouteRow> = {
  drainage: { rule_id: "RTE-DRN", department: "Engineering", unit: "Drainage Unit", sla_hours: 4 },
  business_licensing: { rule_id: "RTE-LIC", department: "Licensing", unit: "Licensing Unit", sla_hours: 336 },
  education_aid_welfare: { rule_id: "RTE-WEL", department: "Community & Welfare", unit: "Education Support Unit", sla_hours: 240 },
  roads_potholes: { rule_id: "RTE-ROD", department: "Engineering", unit: "Roads & Maintenance Unit", sla_hours: 168 },
  waste_management: { rule_id: "RTE-WST", department: "Public Health", unit: "Cleansing Unit", sla_hours: 168 },
  streetlight: { rule_id: "RTE-LMP", department: "Engineering", unit: "Street Lighting Unit", sla_hours: 168 },
  general_enquiry: { rule_id: "RTE-GEN", department: "Customer Service", unit: "Front Desk", sla_hours: 72 },
};

const FALLBACK: RouteRow = {
  rule_id: "RTE-GEN",
  department: "Customer Service",
  unit: "Front Desk",
  sla_hours: 72,
};

export interface RoutingInput extends GateInput {
  case_id: string;
}

/** Produce a RoutingDecision for a classified case. */
export function routeCase(input: RoutingInput): RoutingDecision {
  const { case_id, category, category_confidence } = input;
  const lowConfidence = category_confidence < 0.5;
  const row = lowConfidence ? FALLBACK : ROUTING_TABLE[category] ?? FALLBACK;
  const gate = evaluateApprovalGate(input);

  const rationale = lowConfidence
    ? "Low classification confidence — routed to Customer Service for manual triage (fallback rule)."
    : `Category "${category}" maps to ${row.department} / ${row.unit} (${row.rule_id}).`;

  return {
    case_id,
    category,
    department: row.department,
    unit: row.unit,
    rule_id: row.rule_id,
    rationale,
    sla_hours: row.sla_hours,
    requires_supervisor: gate.requires_supervisor,
    created_at: nowIso(),
  };
}
