import { describe, expect, it } from "vitest";
import { seedAll } from "@/data/seed";
import { resolveFields } from "@/hooks/use-tenant";
import { validateValues } from "@/lib/validation";

const clinic = () => seedAll().tenants.find((t) => t.id === "citycare")!;

describe("tenant field settings", () => {
  it("clinic preset turns on blood group and allergies, gym fields stay off", () => {
    const keys = resolveFields(clinic(), "customer").map((f) => f.key);
    expect(keys).toContain("blood_group");
    expect(keys).toContain("allergies");
    expect(keys).not.toContain("height_cm");
  });
  it("disabled fields are hidden", () => {
    const t = clinic();
    t.fieldSettings.customer.allergies.enabled = false;
    expect(resolveFields(t, "customer").map((f) => f.key)).not.toContain("allergies");
  });
  it("required fields block saving when empty", () => {
    const t = clinic();
    t.fieldSettings.customer.email = { enabled: true, required: true };
    const errs = validateValues(resolveFields(t, "customer"), { name: "A", phone: "1", status: "Active" });
    expect(Object.keys(errs)).toEqual(["email"]);
  });
  it("labels use the tenant's terminology", () => {
    const t = clinic();
    expect(resolveFields(t, "appointment").find((f) => f.key === "customer")?.label).toBe("Patient");
  });
});

describe("metadata engine hardening", () => {
  const gym = () => seedAll().tenants.find((t) => t.id === "ironforge")!;
  it("custom field ids are tenant-scoped and unique across tenants", () => {
    const keys = seedAll().tenants.flatMap((t) => Object.values(t.customFields).flat().map((f) => f.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("cf_ironforge_waiver");
  });
  it("deprecated fields are hidden but kept on records", () => {
    const { tenants, records } = seedAll();
    const t = tenants.find((x) => x.id === "ironforge")!;
    t.customFields.customer.find((f) => f.key === "cf_ironforge_waiver")!.deprecated = true;
    expect(resolveFields(t, "customer").map((f) => f.key)).not.toContain("cf_ironforge_waiver");
    expect(records.ironforge.customer.some((r) => "cf_ironforge_waiver" in r.values)).toBe(true);
  });
  it("renaming a label keeps the stored value key", () => {
    const t = gym();
    t.customFields.customer[0].label = "Main goal";
    expect(resolveFields(t, "customer").find((f) => f.label === "Main goal")?.key).toBe("cf_ironforge_goal");
  });
  it("field order follows the builder order", () => {
    const t = gym();
    t.fieldOrder = { customer: ["cf_ironforge_waiver", "name"] };
    expect(resolveFields(t, "customer").slice(0, 2).map((f) => f.key)).toEqual(["cf_ironforge_waiver", "name"]);
  });
  it("validation rules per type", () => {
    const f = (type: any, rules: any) => [{ key: "x", label: "X", type, required: false, rules }];
    expect(validateValues(f("text", { maxLength: 3 }), { x: "abcd" }).x).toBeTruthy();
    expect(validateValues(f("number", { min: 5, max: 10 }), { x: 4 }).x).toBeTruthy();
    expect(validateValues(f("number", { min: 5, max: 10 }), { x: 11 }).x).toBeTruthy();
    expect(validateValues(f("number", { min: 5, max: 10 }), { x: 7 }).x).toBeUndefined();
    expect(validateValues(f("date", { noFuture: true }), { x: "2999-01-01" }).x).toBeTruthy();
    expect(validateValues(f("date", { noPast: true }), { x: "2000-01-01" }).x).toBeTruthy();
    expect(validateValues([{ key: "x", label: "Goal", type: "select", required: true }], {}).x).toBe("Choose a goal");
  });
  it("seed data passes all isolation checks", async () => {
    const { runIsolationChecks } = await import("@/lib/isolation");
    const { BUNDLES } = await import("@/data/catalog");
    const { tenants, records } = seedAll();
    expect(runIsolationChecks(tenants, records, BUNDLES).every((c) => c.pass)).toBe(true);
  });
});

describe("isolation page with nothing to compare", () => {
  it("fails every check instead of passing when there is no data", async () => {
    const { runIsolationChecks } = await import("@/lib/isolation");
    const checks = runIsolationChecks([], {}, []);
    expect(checks.map((c) => c.pass)).toEqual([false, false, false, false]);
  });
});
