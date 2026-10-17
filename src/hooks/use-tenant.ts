import { useMemo } from "react";
import { DEFAULT_TERMS, ENTITY_MAP } from "@/data/catalog";
import type { FieldDef, Tenant } from "@/data/types";
import { monthlyPrice, plural } from "@/lib/rules";
import { useAppStore } from "@/store/app-store";

export interface ResolvedField extends FieldDef {
  required: boolean;
}

export function termFor(tenant: Tenant | undefined, key: string) {
  return tenant?.terms[key] || DEFAULT_TERMS[key] || key;
}

export function resolveFields(tenant: Tenant, entity: string, includeDisabled = false, includeDeprecated = false): (ResolvedField & { enabled: boolean })[] {
  const def = ENTITY_MAP[entity];
  if (!def) return [];
  const settings = tenant.fieldSettings[entity] ?? {};
  const all = [...def.fields, ...(tenant.customFields[entity] ?? [])];
  const order = tenant.fieldOrder?.[entity];
  if (order?.length) {
    const idx = (k: string) => { const i = order.indexOf(k); return i < 0 ? order.length + all.findIndex((f) => f.key === k) : i; };
    all.sort((a, b) => idx(a.key) - idx(b.key));
  }
  return all
    .filter((f) => includeDeprecated || !f.deprecated)
    .map((f) => {
      const st = settings[f.key];
      const enabled = f.tier === "system" ? true : f.tier === "custom" ? (st?.enabled ?? true) : !!st?.enabled;
      const required = f.tier === "system" ? !!f.required : !!st?.required;
      const label = st?.label || (f.labelTerm ? termFor(tenant, f.labelTerm) : f.label);
      return { ...f, label, enabled, required };
    })
    .filter((f) => includeDisabled || f.enabled);
}

export function useTenant() {
  const id = useAppStore((s) => s.currentTenantId);
  const tenants = useAppStore((s) => s.tenants);
  return tenants.find((t) => t.id === id) ?? tenants[0];
}

export function useTerms() {
  const tenant = useTenant();
  return useMemo(() => {
    const t = (key: string) => termFor(tenant, key);
    return { t, tp: (key: string) => plural(t(key)) };
  }, [tenant]);
}

export function useModules() {
  const tenant = useTenant();
  const modules = useAppStore((s) => s.modules);
  return useMemo(() => modules.filter((m) => tenant?.modules.includes(m.key)), [modules, tenant]);
}

export function useFields(entity: string) {
  const tenant = useTenant();
  return useMemo(() => (tenant ? resolveFields(tenant, entity) : []), [tenant, entity]);
}

export function useTenantPrice(tenant: Tenant | undefined) {
  const modules = useAppStore((s) => s.modules);
  const plans = useAppStore((s) => s.plans);
  return useMemo(
    () => monthlyPrice({ plan: plans.find((p) => p.key === tenant?.plan), moduleKeys: tenant?.modules ?? [], modules, bundle: tenant?.bundle ?? "custom" }),
    [tenant, modules, plans],
  );
}

export function money(n: number, currency = "USD") {
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
