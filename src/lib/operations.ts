import { useAppStore } from "@/store/app-store";
import type { RecordRow } from "@/data/types";
import type { OrderLine } from "./module-events";
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const minuteOfDay = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export const clock = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
export function overlaps(rows: RecordRow[], row: RecordRow) {
  const v = row.values;
  const start = minuteOfDay(String(v.time));
  const end = start + Number(v.duration_min ?? 30);
  return rows.some(
    (r) =>
      r.id !== row.id &&
      r.values.status !== "Cancelled" &&
      r.values.date === v.date &&
      r.values.staff === v.staff &&
      start < minuteOfDay(String(r.values.time)) + Number(r.values.duration_min ?? 30) &&
      end > minuteOfDay(String(r.values.time)),
  );
}
export function cartTotal(
  lines: OrderLine[],
  discount: number,
  mode: "percent" | "amount",
  tax: number,
) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const off = Math.min(
    subtotal,
    Math.max(0, mode === "percent" ? (subtotal * discount) / 100 : discount),
  );
  const taxable = subtotal - off;
  return {
    subtotal,
    discount: off,
    tax: (taxable * tax) / 100,
    total: Math.round(taxable * (1 + tax / 100) * 100) / 100,
  };
}
export const canUndo = (at: string, now = Date.now()) =>
  now - new Date(at).getTime() <= 10 * 60 * 1000;
export const isRecentCheckin = (at: string, now = Date.now()) =>
  now - new Date(at).getTime() < 4 * 60 * 60 * 1000;
export const ticketTone = (at: string, warning = 5, danger = 10, now = Date.now()) =>
  (now - new Date(at).getTime()) / 60000 >= danger
    ? "danger"
    : (now - new Date(at).getTime()) / 60000 >= warning
      ? "warning"
      : "normal";
// Read-only module ports: consumers never reach into another module's records.
export function staffPort(tid: string) {
  return useAppStore.getState().records[tid]?.staff ?? [];
}
export function servicePort(tid: string) {
  return useAppStore.getState().records[tid]?.service ?? [];
}
export function catalogPort(tid: string, modules: string[]) {
  const s = useAppStore.getState();
  return [
    ...(modules.includes("products")
      ? (s.records[tid]?.product ?? [])
          .filter((r) => r.values.status === "Active")
          .map((r) => ({ ...r, source: "product" as const }))
      : []),
    ...(modules.includes("services")
      ? (s.records[tid]?.service ?? [])
          .filter((r) => r.values.status === "Active")
          .map((r) => ({ ...r, source: "service" as const }))
      : []),
  ];
}
export function stockPort(tid: string, id: string) {
  return useAppStore.getState().records[tid]?.inventory?.find((r) => r.values.productId === id);
}
export function tablesPort(tid: string) {
  return useAppStore.getState().records[tid]?.table ?? [];
}
export function membersPort(tid: string) {
  const s = useAppStore.getState();
  return (s.records[tid]?.customer ?? []).map((r) => ({
    ...r,
    membership: s.records[tid]?.membership?.find(
      (m) => m.values.customerId === r.id || m.values.customer === r.values.name,
    ),
  }));
}
