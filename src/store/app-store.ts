import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { BUNDLES, MODULES, PLANS } from "@/data/catalog";
import { seedAll, uid } from "@/data/seed";
import {
  emit,
  newRow,
  type EventName,
  type EventPayload,
  type ModuleEvent,
} from "@/lib/module-events";
import { seedOperations } from "@/data/operational-seed";
import type { Cart } from "@/lib/module-events";
import type {
  AuditEntry,
  BundleDef,
  FieldDef,
  FieldSetting,
  ModuleDef,
  Perm,
  PlanDef,
  RecordRow,
  Tenant,
} from "@/data/types";

interface Data {
  modules: ModuleDef[];
  bundles: BundleDef[];
  plans: PlanDef[];
  tenants: Tenant[];
  records: Record<string, Record<string, RecordRow[]>>;
  audit: AuditEntry[];
  currentTenantId: string;
  impersonating: boolean;
  dark: boolean;
  events: ModuleEvent[];
  operationSettings: Record<
    string,
    { open: string; close: string; slot: number; tax: number; warning: number; danger: number }
  >;
  posCarts: Record<string, Cart[]>;
}

interface Actions {
  emitEvent: (name: EventName, payload: EventPayload) => void;
  setOperationSettings: (tid: string, patch: Partial<Data["operationSettings"][string]>) => void;
  payOrder: (payload: EventPayload, method: string) => void;
  setPosCarts: (tid: string, carts: Cart[]) => void;
  reset: () => void;
  setTenant: (id: string, impersonating?: boolean) => void;
  stopImpersonating: () => void;
  toggleDark: () => void;
  log: (actor: string, action: string, target: string) => void;
  updateTenant: (id: string, fn: (t: Tenant) => void) => void;
  addTenant: (t: Tenant) => void;
  upsertRecord: (tenantId: string, entity: string, row: RecordRow) => void;
  deleteRecord: (tenantId: string, entity: string, id: string) => void;
  setFieldSetting: (
    tenantId: string,
    entity: string,
    key: string,
    patch: Partial<FieldSetting>,
  ) => void;
  saveCustomField: (
    tenantId: string,
    entity: string,
    field: FieldDef,
    originalKey?: string,
  ) => void;
  deleteCustomField: (tenantId: string, entity: string, key: string) => void;
  setCustomFieldDeprecated: (
    tenantId: string,
    entity: string,
    key: string,
    deprecated: boolean,
  ) => void;
  setFieldOrder: (tenantId: string, entity: string, keys: string[] | null) => void;
  setPerm: (
    tenantId: string,
    roleId: string,
    module: string,
    action: keyof Perm,
    v: boolean,
  ) => void;
  saveModule: (m: ModuleDef, originalKey?: string) => void;
  saveBundle: (b: BundleDef, originalKey?: string) => void;
  deleteBundle: (key: string) => void;
  savePlan: (p: PlanDef) => void;
}

const initial = (): Data => ({
  modules: structuredClone(MODULES),
  bundles: structuredClone(BUNDLES),
  plans: structuredClone(PLANS),
  ...seedAll(),
  currentTenantId: "ironforge",
  impersonating: false,
  dark: false,
  operationSettings: {},
  posCarts: {},
});

export const useAppStore = create<Data & Actions>()(
  persist(
    immer((set, get) => {
      const tenant = (s: Data, id: string) => s.tenants.find((t) => t.id === id)!;
      return {
        ...initial(),
        setPosCarts: (tid, carts) =>
          set((s) => {
            s.posCarts[tid] = carts;
          }),
        emitEvent: (name, payload) =>
          set((s) => {
            s.events.unshift(emit(s, name, payload));
            s.events = s.events.slice(0, 20);
          }),
        setOperationSettings: (tid, patch) =>
          set((s) => {
            s.operationSettings[tid] = {
              ...(s.operationSettings[tid] ?? {
                open: "09:00",
                close: "18:00",
                slot: 30,
                tax: 5,
                warning: 5,
                danger: 10,
              }),
              ...patch,
            };
          }),
        payOrder: (p, method) =>
          set((s) => {
            ((s.records[p.tenantId] ??= {}).order ??= []).unshift({
              ...newRow({
                customer: p.customer || "Walk-in",
                total: p.amount,
                status: "Paid",
                lines: p.lines,
                payment_method: method,
                table: p.table,
                date: new Date().toISOString().slice(0, 10),
              }),
              id: p.sourceId,
            });
            s.events.unshift(emit(s, "order.paid", p));
            s.events = s.events.slice(0, 20);
          }),
        reset: () => set({ ...initial(), dark: get().dark }),
        setTenant: (id, impersonating = false) =>
          set((s) => {
            s.currentTenantId = id;
            s.impersonating = impersonating;
          }),
        stopImpersonating: () =>
          set((s) => {
            s.impersonating = false;
          }),
        toggleDark: () =>
          set((s) => {
            s.dark = !s.dark;
          }),
        log: (actor, action, target) =>
          set((s) => {
            s.audit.unshift({ id: uid(), at: new Date().toISOString(), actor, action, target });
          }),
        updateTenant: (id, fn) =>
          set((s) => {
            fn(tenant(s, id));
          }),
        addTenant: (t) =>
          set((s) => {
            s.tenants.push(t);
            s.records[t.id] = {};
          }),
        upsertRecord: (tid, entity, row) =>
          set((s) => {
            const list = ((s.records[tid] ??= {})[entity] ??= []);
            const i = list.findIndex((r) => r.id === row.id);
            if (i >= 0) list[i] = row;
            else list.unshift(row);
          }),
        deleteRecord: (tid, entity, id) =>
          set((s) => {
            const list = s.records[tid]?.[entity];
            if (list) s.records[tid][entity] = list.filter((r) => r.id !== id);
          }),
        setFieldSetting: (tid, entity, key, patch) =>
          set((s) => {
            const fs = (tenant(s, tid).fieldSettings[entity] ??= {});
            fs[key] = { ...(fs[key] ?? { enabled: false, required: false }), ...patch };
            if (patch.enabled === false) fs[key].required = false;
            if (patch.required) fs[key].enabled = true;
          }),
        saveCustomField: (tid, entity, field, originalKey) =>
          set((s) => {
            const list = (tenant(s, tid).customFields[entity] ??= []);
            const i = list.findIndex((f) => f.key === (originalKey ?? field.key));
            if (i >= 0) list[i] = field;
            else list.push(field);
          }),
        deleteCustomField: (tid, entity, key) =>
          set((s) => {
            const t = tenant(s, tid);
            t.customFields[entity] = (t.customFields[entity] ?? []).filter((f) => f.key !== key);
            delete t.fieldSettings[entity]?.[key];
            for (const r of s.records[tid]?.[entity] ?? []) delete r.values[key];
            if (t.fieldOrder?.[entity])
              t.fieldOrder[entity] = t.fieldOrder[entity].filter((k) => k !== key);
          }),
        setCustomFieldDeprecated: (tid, entity, key, v) =>
          set((s) => {
            const f = (tenant(s, tid).customFields[entity] ?? []).find((x) => x.key === key);
            if (f) f.deprecated = v;
          }),
        setFieldOrder: (tid, entity, keys) =>
          set((s) => {
            const t = tenant(s, tid);
            t.fieldOrder ??= {};
            if (keys) t.fieldOrder[entity] = keys;
            else delete t.fieldOrder[entity];
          }),
        setPerm: (tid, roleId, module, action, v) =>
          set((s) => {
            const r = tenant(s, tid).roles.find((x) => x.id === roleId)!;
            (r.perms[module] ??= { read: false, create: false, update: false, delete: false })[
              action
            ] = v;
          }),
        saveModule: (m, ok) =>
          set((s) => {
            const i = s.modules.findIndex((x) => x.key === (ok ?? m.key));
            if (i >= 0) s.modules[i] = m;
            else s.modules.push(m);
          }),
        saveBundle: (b, ok) =>
          set((s) => {
            const i = s.bundles.findIndex((x) => x.key === (ok ?? b.key));
            if (i >= 0) s.bundles[i] = b;
            else s.bundles.splice(s.bundles.length - 1, 0, b);
          }),
        deleteBundle: (key) =>
          set((s) => {
            s.bundles = s.bundles.filter((b) => b.key !== key);
          }),
        savePlan: (p) =>
          set((s) => {
            const i = s.plans.findIndex((x) => x.key === p.key);
            s.plans[i] = p;
          }),
      };
    }),
    {
      name: "modular-saas-demo-v2",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 1,
      migrate: (persisted) => {
        const data = persisted as Data;
        data.operationSettings ??= {};
        data.posCarts ??= {};
        const upgraded = structuredClone(data.records);
        data.events = seedOperations(structuredClone(data.tenants), upgraded);
        for (const t of data.tenants) {
          const records = (data.records[t.id] ??= {});
          for (const entity of [
            "appointment",
            "membership",
            "checkin",
            "product",
            "inventory",
            "ticket",
          ]) {
            const defaults = upgraded[t.id]?.[entity] ?? [];
            for (const [i, row] of (records[entity] ?? []).entries()) {
              const base = defaults[i]?.values;
              if (!base) continue;
              // Add operational keys without deleting custom values or changing record ids.
              if (entity === "appointment" && !row.values.time)
                row.values = {
                  ...base,
                  ...row.values,
                  time: base.time,
                  date: base.date,
                  staff: base.staff,
                  status: row.values.status === "Scheduled" ? "Pending" : row.values.status,
                };
              if (entity === "membership" && !row.values.customerId)
                row.values = {
                  ...base,
                  ...row.values,
                  customerId: base.customerId,
                  customer: base.customer,
                };
              if (entity === "checkin" && !row.values.at)
                row.values = {
                  ...base,
                  ...row.values,
                  at: row.createdAt,
                  customerId: base.customerId,
                };
              if (entity === "ticket" && !row.values.lines) row.values = { ...row.values, ...base };
            }
          }
          if (t.modules.includes("inventory"))
            for (const product of records.product ?? []) {
              let stock = records.inventory?.find((r) => r.values.name === product.values.name);
              if (!stock) {
                stock = newRow({
                  name: product.values.name,
                  stock: 20,
                  reorder_level: 5,
                  status: "In stock",
                });
                (records.inventory ??= []).push(stock);
              }
              stock.values.productId = product.id;
            }
        }
        const kds = data.modules.find((m) => m.key === "kds");
        if (kds) kds.dependsOn = kds.dependsOn.filter((k) => k !== "tables");
        return data;
      },
    },
  ),
);
