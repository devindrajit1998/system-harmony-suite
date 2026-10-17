import { describe, expect, it } from "vitest";
import { MODULES, PLANS } from "@/data/catalog";
import { dependents, disableModule, enableModule, monthlyPrice } from "@/lib/rules";

describe("module dependency rules", () => {
  it("enabling KDS auto-enables POS and Products but Tables stays optional", () => {
    expect(enableModule([], "kds", MODULES).sort()).toEqual(["kds", "pos", "products"]);
  });
  it("disabling Memberships also turns off Check-in and Classes", () => {
    const on = ["customers", "memberships", "checkin", "classes", "staff"];
    expect(dependents(on, "memberships", MODULES).sort()).toEqual(["checkin", "classes"]);
    expect(disableModule(on, "memberships", MODULES).sort()).toEqual(["customers", "staff"]);
  });
});

describe("pricing", () => {
  it("applies a 15% bundle discount on module add-ons", () => {
    const pro = PLANS.find((p) => p.key === "pro");
    // gym modules: 0 + 12 + 8 + 10 + 0 + 10 = 40 -> discount 6
    const p = monthlyPrice({ plan: pro, moduleKeys: ["customers", "memberships", "checkin", "classes", "staff", "billing"], modules: MODULES, bundle: "gym" });
    expect(p).toEqual({ plan: 49, addons: 40, discount: 6, total: 83 });
  });
  it("custom setups get no discount", () => {
    const starter = PLANS.find((p) => p.key === "starter");
    expect(monthlyPrice({ plan: starter, moduleKeys: ["reports"], modules: MODULES, bundle: "custom" }).total).toBe(24);
  });
});
