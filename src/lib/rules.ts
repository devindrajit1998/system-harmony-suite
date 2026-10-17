import { BUNDLE_DISCOUNT } from "@/data/catalog";
import type { ModuleDef, PlanDef } from "@/data/types";

/** All modules needed for `key` to work (including itself). */
export function withDependencies(key: string, modules: ModuleDef[]): string[] {
  const out = new Set<string>();
  const visit = (k: string) => {
    if (out.has(k)) return;
    out.add(k);
    modules.find((m) => m.key === k)?.dependsOn.forEach(visit);
  };
  visit(key);
  return [...out];
}

/** Enable a module plus its dependencies. */
export function enableModule(enabled: string[], key: string, modules: ModuleDef[]): string[] {
  return [...new Set([...enabled, ...withDependencies(key, modules)])];
}

/** Enabled modules that would break (transitively) if `key` were turned off. */
export function dependents(enabled: string[], key: string, modules: ModuleDef[]): string[] {
  const out = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of modules) {
      if (!enabled.includes(m.key) || out.has(m.key) || m.key === key) continue;
      if (m.dependsOn.some((d) => d === key || out.has(d))) {
        out.add(m.key);
        changed = true;
      }
    }
  }
  return [...out];
}

export function disableModule(enabled: string[], key: string, modules: ModuleDef[]): string[] {
  const off = new Set([key, ...dependents(enabled, key, modules)]);
  return enabled.filter((k) => !off.has(k));
}

export function modulesTotal(keys: string[], modules: ModuleDef[]): number {
  return keys.reduce((s, k) => s + (modules.find((m) => m.key === k)?.price ?? 0), 0);
}

/** Monthly price: plan + module add-ons, with bundle discount on add-ons unless Custom. */
export function monthlyPrice(opts: { plan?: PlanDef; moduleKeys: string[]; modules: ModuleDef[]; bundle: string }) {
  const addons = modulesTotal(opts.moduleKeys, opts.modules);
  const discount = opts.bundle !== "custom" ? +(addons * BUNDLE_DISCOUNT).toFixed(2) : 0;
  const planPrice = opts.plan?.price ?? 0;
  return { plan: planPrice, addons, discount, total: +(planPrice + addons - discount).toFixed(2) };
}

export function plural(word: string): string {
  if (/(staff|inventory)$/i.test(word)) return word;
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + "ies";
  if (/(s|x|ch|sh)$/i.test(word)) return word + "es";
  return word + "s";
}
