import { NEUTRAL_CHIP, TONE_CHIP } from "@/lib/chips";
import type { OutreachTarget } from "@/hooks/useOutreach";

export type OutreachStatus = OutreachTarget["status"];

const STATUS_PRESENTATION: Record<
  OutreachStatus,
  { label: string; className: string }
> = {
  new: { label: "New", className: NEUTRAL_CHIP },
  enriched: { label: "Enriched", className: TONE_CHIP.info },
  researched: { label: "Researched", className: TONE_CHIP.info },
  drafted: { label: "Drafted", className: TONE_CHIP.warning },
  contacted: { label: "Contacted", className: TONE_CHIP.positive },
  replied: { label: "Replied", className: TONE_CHIP.positive },
  onboarded: { label: "Onboarded", className: TONE_CHIP.positive },
  passed: { label: "Passed", className: TONE_CHIP.danger },
  unreachable: { label: "Unreachable", className: TONE_CHIP.danger },
};

export const OUTREACH_STATUS_OPTIONS = (
  Object.entries(STATUS_PRESENTATION) as [
    OutreachStatus,
    (typeof STATUS_PRESENTATION)[OutreachStatus],
  ][]
).map(([value, presentation]) => ({ value, label: presentation.label }));

export const outreachStatusDescriptor = (status: OutreachStatus) =>
  STATUS_PRESENTATION[status];
