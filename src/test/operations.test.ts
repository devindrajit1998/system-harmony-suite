import { describe, expect, it } from "vitest";
import { seedAll } from "@/data/seed";
import { emit, newRow } from "@/lib/module-events";
import { overlaps, cartTotal, canUndo, isRecentCheckin, ticketTone } from "@/lib/operations";
import { validateRecord } from "@/lib/validation";
import { useAppStore } from "@/store/app-store";

describe("tenant-gated event reactions", () => {
  it("skips disabled inventory and runs stock changes only for the event tenant", () => {
    const s = seedAll();
    const cafe = s.tenants.find((t) => t.id === "brewhaus");
    if (!cafe) throw Error("Missing cafe");
    const product = s.records.brewhaus.product[0];
    const stock = s.records.brewhaus.inventory.find((r) => r.values.productId === product.id);
    if (!stock) throw Error("Missing stock");
    const before = Number(stock.values.stock);
    const p = {
      tenantId: cafe.id,
      sourceId: "paid-1",
      amount: 12,
      lines: [
        {
          id: product.id,
          name: String(product.values.name),
          quantity: 2,
          price: 6,
          source: "product" as const,
          note: "",
        },
      ],
    };
    cafe.modules = cafe.modules.filter((k) => k !== "inventory");
    expect(emit(s, "order.paid", p).reactions.find((r) => r.module === "inventory")?.result).toBe(
      "skipped",
    );
    expect(stock.values.stock).toBe(before);
    cafe.modules.push("inventory");
    emit(s, "order.paid", { ...p, sourceId: "paid-2" });
    expect(stock.values.stock).toBe(before - 2);
    expect(s.records.ironforge.inventory).toBeUndefined();
  });
  it("completed appointments create draft invoices only when billing is enabled", () => {
    const s = seedAll();
    const clinic = s.tenants.find((t) => t.id === "citycare");
    if (!clinic) throw Error("Missing clinic");
    const n = s.records.citycare.invoice.length;
    emit(s, "appointment.completed", { tenantId: clinic.id, sourceId: "a1", amount: 55 });
    expect(s.records.citycare.invoice[0].values.status).toBe("Draft");
    expect(s.records.citycare.invoice.length).toBe(n + 1);
    clinic.modules = clinic.modules.filter((k) => k !== "billing");
    expect(
      emit(s, "appointment.completed", { tenantId: clinic.id, sourceId: "a2" }).reactions[0].result,
    ).toBe("skipped");
    expect(s.records.citycare.invoice.length).toBe(n + 1);
  });
  it("kitchen tickets are created by kitchen events only when KDS is enabled", () => {
    const s = seedAll();
    const cafe = s.tenants.find((t) => t.id === "brewhaus");
    if (!cafe) throw Error("Missing cafe");
    const n = s.records.brewhaus.ticket.length;
    emit(s, "order.sent_to_kitchen", { tenantId: cafe.id, sourceId: "ticket-1", lines: [] });
    expect(s.records.brewhaus.ticket.length).toBe(n + 1);
    cafe.modules = cafe.modules.filter((k) => k !== "kds");
    emit(s, "order.sent_to_kitchen", { tenantId: cafe.id, sourceId: "ticket-2" });
    expect(s.records.brewhaus.ticket.length).toBe(n + 1);
  });
});
describe("operational rules", () => {
  it("blocks same staff overlaps but allows different staff", () => {
    const a = newRow({
      date: "2026-10-17",
      time: "09:00",
      duration_min: 30,
      staff: "Doctor A",
      status: "Confirmed",
    });
    expect(overlaps([a], newRow({ ...a.values, time: "09:15" }))).toBe(true);
    expect(overlaps([a], newRow({ ...a.values, staff: "Doctor B" }))).toBe(false);
    expect(overlaps([a], newRow({ ...a.values, time: "09:30" }))).toBe(false);
  });
  it("check-in confirmation lasts four hours", () => {
    const now = Date.now();
    expect(isRecentCheckin(new Date(now - 4 * 3600000 + 1).toISOString(), now)).toBe(true);
    expect(isRecentCheckin(new Date(now - 4 * 3600000).toISOString(), now)).toBe(false);
  });
  it("check-in undo lasts ten minutes", () => {
    const now = Date.now();
    expect(canUndo(new Date(now - 600000).toISOString(), now)).toBe(true);
    expect(canUndo(new Date(now - 600001).toISOString(), now)).toBe(false);
  });
  it("kitchen tickets are amber at five minutes and red at ten", () => {
    const now = Date.now();
    expect(ticketTone(new Date(now - 299999).toISOString(), 5, 10, now)).toBe("normal");
    expect(ticketTone(new Date(now - 300000).toISOString(), 5, 10, now)).toBe("warning");
    expect(ticketTone(new Date(now - 600000).toISOString(), 5, 10, now)).toBe("danger");
  });
  it("checkout defaults to five percent tax after discount", () => {
    const lines = [
      { id: "p", name: "Tea", price: 10, quantity: 2, note: "", source: "product" as const },
    ];
    expect(cartTotal(lines, 10, "percent", 5)).toEqual({
      subtotal: 20,
      discount: 2,
      tax: 0.9,
      total: 18.9,
    });
    expect(cartTotal(lines, 2, "amount", 5).total).toBe(18.9);
  });
  it("shared validation rejects missing required fields and ignores deprecated fields", () => {
    useAppStore.getState().reset();
    expect(validateRecord("customer", {}).name).toBe("Full name is required");
    useAppStore
      .getState()
      .setFieldSetting("ironforge", "customer", "cf_ironforge_goal", { required: true });
    useAppStore
      .getState()
      .setCustomFieldDeprecated("ironforge", "customer", "cf_ironforge_goal", true);
    expect(
      validateRecord("customer", { name: "A", phone: "1", status: "Active" }).cf_ironforge_goal,
    ).toBeUndefined();
  });
  it("seed includes twenty-five current-week appointments and six event-created tickets", () => {
    const s = seedAll();
    expect(s.records.citycare.appointment).toHaveLength(25);
    expect(s.records.glow.appointment).toHaveLength(25);
    expect(s.records.brewhaus.ticket).toHaveLength(6);
    expect(s.events.filter((e) => e.name === "order.sent_to_kitchen")).toHaveLength(6);
  });
});
