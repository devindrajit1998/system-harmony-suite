import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { BUNDLES, MODULES, PLANS } from "@/data/catalog";
import { seedAll, uid } from "@/data/seed";
import type { AuditEntry, BundleDef, FieldDef, FieldSetting, ModuleDef, Perm, PlanDef, RecordRow, Tenant } from "@/data/types";

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
}

interface Actions {
  reset: () => void;
  setTenant: (id: string, impersonating?: boolean) => void;
  stopImpersonating: () => void;
  toggleDark: () => void;
  log: (actor: string, action: string, target: string) => void;
  updateTenant: (id: string, fn: (t: Tenant) => void) => void;
  addTenant: (t: Tenant) => void;
  upsertRecord: (tenantId: string, entity: string, row: RecordRow) => void;
  deleteRecord: (tenantId: string, entity: string, id: string) => void;
  setFieldSetting: (tenantId: string, entity: string, key: string, patch: Partial<FieldSetting>) => void;
  saveCustomField: (tenantId: string, entity: string, field: FieldDef, originalKey?: string) => void;
  deleteCustomField: (tenantId: string, entity: string, key: string) => void;
  setCustomFieldDeprecated: (tenantId: string, entity: string, key: string, deprecated: boolean) => void;
  setFieldOrder: (tenantId: string, entity: string, keys: string[] | null) => void;
  setPerm: (tenantId: string, roleId: string, module: string, action: keyof Perm, v: boolean) => void;
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
});

export const useAppStore = create<Data & Actions>()(
  persist(
    immer((set, get) => {
      const tenant = (s: Data, id: string) => s.tenants.find((t) => t.id === id)!;
      return {
        ...initial(),
        reset: () => set({ ...initial(), dark: get().dark }),
        setTenant: (id, impersonating = false) => set((s) => { s.currentTenantId = id; s.impersonating = impersonating; }),
        stopImpersonating: () => set((s) => { s.impersonating = false; }),
        toggleDark: () => set((s) => { s.dark = !s.dark; }),
        log: (actor, action, target) => set((s) => { s.audit.unshift({ id: uid(), at: new Date().toISOString(), actor, action, target }); }),
        updateTenant: (id, fn) => set((s) => { fn(tenant(s, id)); }),
        addTenant: (t) => set((s) => { s.tenants.push(t); s.records[t.id] = {}; }),
        upsertRecord: (tid, entity, row) => set((s) => {
          const list = ((s.records[tid] ??= {})[entity] ??= []);
          const i = list.findIndex((r) => r.id === row.id);
          if (i >= 0) list[i] = row; else list.unshift(row);
        }),
        deleteRecord: (tid, entity, id) => set((s) => {
          const list = s.records[tid]?.[entity];
          if (list) s.records[tid][entity] = list.filter((r) => r.id !== id);
        }),
        setFieldSetting: (tid, entity, key, patch) => set((s) => {
          const fs = (tenant(s, tid).fieldSettings[entity] ??= {});
          fs[key] = { ...(fs[key] ?? { enabled: false, required: false }), ...patch };
          if (patch.enabled === false) fs[key].required = false;
          if (patch.required) fs[key].enabled = true;
        }),
        saveCustomField: (tid, entity, field, originalKey) => set((s) => {
          const list = (tenant(s, tid).customFields[entity] ??= []);
          const i = list.findIndex((f) => f.key === (originalKey ?? field.key));
          if (i >= 0) list[i] = field; else list.push(field);
        }),
        deleteCustomField: (tid, entity, key) => set((s) => {
          const t = tenant(s, tid);
          t.customFields[entity] = (t.customFields[entity] ?? []).filter((f) => f.key !== key);
          delete t.fieldSettings[entity]?.[key];
          for (const r of s.records[tid]?.[entity] ?? []) delete r.values[key];
          if (t.fieldOrder?.[entity]) t.fieldOrder[entity] = t.fieldOrder[entity].filter((k) => k !== key);
        }),
        setCustomFieldDeprecated: (tid, entity, key, v) => set((s) => {
          const f = (tenant(s, tid).customFields[entity] ?? []).find((x) => x.key === key);
          if (f) f.deprecated = v;
        }),
        setFieldOrder: (tid, entity, keys) => set((s) => {
          const t = tenant(s, tid);
          t.fieldOrder ??= {};
          if (keys) t.fieldOrder[entity] = keys; else delete t.fieldOrder[entity];
        }),
        setPerm: (tid, roleId, module, action, v) => set((s) => {
          const r = tenant(s, tid).roles.find((x) => x.id === roleId)!;
          (r.perms[module] ??= { read: false, create: false, update: false, delete: false })[action] = v;
        }),
        saveModule: (m, ok) => set((s) => {
          const i = s.modules.findIndex((x) => x.key === (ok ?? m.key));
          if (i >= 0) s.modules[i] = m; else s.modules.push(m);
        }),
        saveBundle: (b, ok) => set((s) => {
          const i = s.bundles.findIndex((x) => x.key === (ok ?? b.key));
          if (i >= 0) s.bundles[i] = b; else s.bundles.splice(s.bundles.length - 1, 0, b);
        }),
        deleteBundle: (key) => set((s) => { s.bundles = s.bundles.filter((b) => b.key !== key); }),
        savePlan: (p) => set((s) => { const i = s.plans.findIndex((x) => x.key === p.key); s.plans[i] = p; }),
      };
    }),
    { name: "modular-saas-demo-v2", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
