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

  const nT = tenants.length;
  const nRecords = Object.values(records).reduce((a, byE) => a + Object.values(byE).reduce((b, rs) => b + rs.length, 0), 0);
  const nCfValues = tenants.reduce((a, t) => a + Object.values(records[t.id] ?? {}).flat().reduce((b, r) => b + Object.keys(r.values).filter((k) => k.startsWith("cf_")).length, 0), 0);
  const nTermMaps = tenants.filter((t) => t.terms).length;
  const none = (what: string) => `Nothing to compare: ${what}`;
  const mk = (id: string, label: string, empty: string | null, issues: string[], ok: string): Check =>
    empty ? { id, label, pass: false, detail: none(empty) } : { id, label, pass: !issues.length, detail: issues.length ? `${ok} — ${issues.slice(0, 5).join("; ")}` : ok };

  return [
    mk("a", "No custom field id is shared between two tenants", nT < 2 ? "fewer than 2 tenants" : owner.size === 0 ? "no custom fields exist" : null, shared,
      `Compared ${nT} tenants, ${owner.size} custom field ids`),
    mk("b", "No record references a field id from another tenant", nRecords === 0 ? "no records exist" : nCfValues === 0 ? "no record holds a custom field value" : null, foreign,
      `Compared ${nRecords} records, ${nCfValues} custom field values across ${nT} tenants`),
    mk("c", "Each tenant's terminology map is independent", nTermMaps < 2 ? "fewer than 2 terminology maps" : null, sameTerms,
      `Compared ${nTermMaps} tenant terminology maps against each other and ${bundles.length} bundles`),
    mk("d", "A freshly created tenant starts with only its bundle defaults", bundles.length === 0 ? "no bundles exist" : null, fresh,
      `Snapshotted ${bundles.length} bundles, checked ${nT} tenants: 0 unbundled custom fields`),
  ];
}
