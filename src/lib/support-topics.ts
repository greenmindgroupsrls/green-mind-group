export const SUPPORT_TOPICS = [
  { value: "problema_tecnico", label: "Problema tecnico" },
  { value: "commissioni_payout", label: "Domanda su commissioni/payout" },
  { value: "ordine_vendita", label: "Domanda su un ordine/vendita" },
  { value: "account", label: "Problema con il mio account" },
  { value: "altro", label: "Altro" },
] as const;

export type SupportTopicValue = (typeof SUPPORT_TOPICS)[number]["value"];

export function supportTopicLabel(value: string): string {
  return SUPPORT_TOPICS.find((t) => t.value === value)?.label ?? value;
}
