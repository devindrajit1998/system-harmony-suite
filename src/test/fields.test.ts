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
