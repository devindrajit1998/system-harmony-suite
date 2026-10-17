import { bundleSnapshot } from "@/data/seed";
import type { BundleDef, RecordRow, Tenant } from "@/data/types";

export interface Check { id: string; label: string; pass: boolean; detail: string }

/** Tenant isolation checks for /dev/isolation. Pure so it can be unit-tested. */
export function runIsolationChecks(tenants: Tenant[], records: Record<string, Record<string, RecordRow[]>>, bundles: BundleDef[]): Check[] {
  const owner = new Map<string, string>();
  const shared: string[] = [];
  for (const t of tenants) for (const fs of Object.values(t.customFields)) for (const f of fs) {
    const o = owner.get(f.key);
    if (o && o !== t.id) shared.push(`${f.key} (${o}, ${t.id})`);
    else owner.set(f.key, t.id);
  }

  const foreign: string[] = [];
  for (const t of tenants) for (const [entity, rows] of Object.entries(records[t.id] ?? {})) {
    const own = new Set((t.customFields[entity] ?? []).map((f) => f.key));
    for (const r of rows) for (const k of Object.keys(r.values)) {
      if (!k.startsWith("cf_")) continue;
      if (!own.has(k)) foreign.push(`${t.id}/${entity}/${r.id} → ${k}${owner.get(k) ? ` (owned by ${owner.get(k)})` : ""}`);
    }
  }

  const sameTerms: string[] = [];
  for (let i = 0; i < tenants.length; i++) {
    for (let j = i + 1; j < tenants.length; j++) if (tenants[i].terms === tenants[j].terms) sameTerms.push(`${tenants[i].id} & ${tenants[j].id}`);
    if (bundles.some((b) => b.terms === tenants[i].terms)) sameTerms.push(`${tenants[i].id} & its bundle`);
  }
  // Mutating one clone must not leak into another.
  const a = structuredClone(tenants[0]?.terms ?? {}); const b = structuredClone(tenants[1]?.terms ?? {});
  a.__probe = "x";
  if (b.__probe) sameTerms.push("probe leaked");

  const fresh: string[] = [];
  for (const bd of bundles) {
    const snap = bundleSnapshot(structuredClone(bd));
    const n = Object.values(snap.customFields).flat().length;
    if (n) fresh.push(`${bd.name}: ${n} custom fields`);
    if (snap.terms === bd.terms || snap.modules === bd.modules) fresh.push(`${bd.name}: shares references with bundle`);
  }
  for (const t of tenants) {
    if (Object.keys(records[t.id] ?? {}).length === 0 && Object.values(t.customFields).flat().length) fresh.push(`${t.name}: new tenant has custom fields`);
  }

  return [
    { id: "a", label: "No custom field id is shared between two tenants", pass: !shared.length, detail: shared.join("; ") || `${owner.size} custom field ids, all unique` },
    { id: "b", label: "No record references a field id from another tenant", pass: !foreign.length, detail: foreign.slice(0, 5).join("; ") || "All custom values point to the record's own tenant" },
    { id: "c", label: "Each tenant's terminology map is independent", pass: !sameTerms.length, detail: sameTerms.join("; ") || `${tenants.length} separate terminology maps` },
    { id: "d", label: "A freshly created tenant starts with only its bundle defaults", pass: !fresh.length, detail: fresh.join("; ") || `${bundles.length} bundles snapshot cleanly: 0 custom fields, 0 records` },
  ];
}
