import type { RecordRow, Tenant } from "@/data/types";

export type EventName =
  "appointment.completed" | "order.paid" | "order.sent_to_kitchen" | "checkin.created";
export interface OrderLine {
  id: string;
  name: string;
  source: "product" | "service";
  quantity: number;
  price: number;
  note: string;
}
export interface Cart {
  id: string;
  lines: OrderLine[];
  discount: number;
  mode: "percent" | "amount";
  table: string;
  sent: boolean;
}
export interface EventPayload {
  tenantId: string;
  sourceId: string;
  customer?: string;
  amount?: number;
  table?: string;
  lines?: OrderLine[];
}
export interface ModuleEvent {
  id: string;
  name: EventName;
  at: string;
  payload: EventPayload;
  reactions: { module: string; result: "ran" | "skipped"; reason: string }[];
}
export interface EventState {
  tenants: Tenant[];
  records: Record<string, Record<string, RecordRow[]>>;
}
export const newRow = (
  values: Record<string, unknown>,
  at = new Date().toISOString(),
): RecordRow => ({ id: crypto.randomUUID(), createdAt: at, values });
const handlers = new Map<
  EventName,
  { module: string; handler: (state: EventState, payload: EventPayload, at: string) => void }[]
>();
export function listen(
  name: EventName,
  module: string,
  handler: (state: EventState, payload: EventPayload, at: string) => void,
) {
  const listener = { module, handler };
  const list = handlers.get(name) ?? [];
  list.push(listener);
  handlers.set(name, list);
  return () => {
    handlers.set(
      name,
      (handlers.get(name) ?? []).filter((x) => x !== listener),
    );
  };
}
export function emit(
  state: EventState,
  name: EventName,
  payload: EventPayload,
  at = new Date().toISOString(),
): ModuleEvent {
  const tenant = state.tenants.find((t) => t.id === payload.tenantId);
  const event: ModuleEvent = { id: crypto.randomUUID(), name, at, payload, reactions: [] };
  for (const reaction of handlers.get(name) ?? []) {
    if (!tenant?.modules.includes(reaction.module)) {
      event.reactions.push({
        module: reaction.module,
        result: "skipped",
        reason: "Module not enabled",
      });
      continue;
    }
    reaction.handler(state, payload, at);
    event.reactions.push({ module: reaction.module, result: "ran", reason: "Module enabled" });
  }
  return event;
}
function append(state: EventState, tid: string, entity: string, row: RecordRow) {
  ((state.records[tid] ??= {})[entity] ??= []).unshift(row);
}
function invoice(state: EventState, p: EventPayload, at: string, status: string) {
  append(
    state,
    p.tenantId,
    "invoice",
    newRow(
      {
        customer: p.customer || "Walk-in",
        amount: p.amount ?? 0,
        status,
        date: at.slice(0, 10),
        sourceId: p.sourceId,
      },
      at,
    ),
  );
}
listen("appointment.completed", "billing", (s, p, at) => invoice(s, p, at, "Draft"));
listen("order.paid", "billing", (s, p, at) => invoice(s, p, at, "Paid"));
listen("order.paid", "inventory", (s, p) => {
  for (const line of p.lines ?? []) {
    if (line.source !== "product") continue;
    const stock = s.records[p.tenantId]?.inventory?.find((r) => r.values.productId === line.id);
    if (stock) {
      stock.values.stock = Math.max(0, Number(stock.values.stock) - line.quantity);
      stock.values.status =
        Number(stock.values.stock) === 0
          ? "Out of stock"
          : Number(stock.values.stock) < Number(stock.values.reorder_level ?? 5)
            ? "Low"
            : "In stock";
    }
  }
});
listen("order.sent_to_kitchen", "kds", (s, p, at) =>
  append(
    s,
    p.tenantId,
    "ticket",
    newRow(
      {
        name: `#${p.sourceId.slice(-5).toUpperCase()}`,
        table: p.table || "Takeaway",
        status: "New",
        lines: p.lines ?? [],
        sourceId: p.sourceId,
      },
      at,
    ),
  ),
);
