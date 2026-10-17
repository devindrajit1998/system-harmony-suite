import { BUNDLES, ENTITY_MAP, MODULES } from "./catalog";
import type { AuditEntry, FieldDef, FieldSetting, Perm, RecordRow, Role, Tenant } from "./types";

let s = 42;
const rand = () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)];
const int = (a: number, b: number) => Math.floor(a + rand() * (b - a + 1));
export const uid = () => Math.random().toString(36).slice(2, 10);

const FIRST = ["Aisha", "Mateo", "Priya", "Liam", "Sofia", "Kenji", "Zara", "Diego", "Amara", "Noah", "Mei", "Omar", "Elena", "Kwame", "Hana", "Lucas", "Fatima", "Arjun", "Chloe", "Tariq", "Ingrid", "Rafael", "Yuki", "Nadia", "Samuel", "Leila", "Viktor", "Ananya", "Jonas", "Imani"];
const LAST = ["Khan", "Garcia", "Sharma", "O'Brien", "Rossi", "Tanaka", "Okafor", "Silva", "Mensah", "Müller", "Chen", "Haddad", "Petrova", "Asante", "Kim", "Dubois", "Rahman", "Patel", "Nguyen", "Ali", "Larsen", "Costa", "Sato", "Hussein", "Adeyemi", "Moreau", "Novak", "Iyer", "Berg", "Mwangi"];
const person = () => `${pick(FIRST)} ${pick(LAST)}`;

const NAMES: Record<string, string[]> = {
  service: ["Haircut & Style", "Balayage", "Root Touch-up", "Keratin Treatment", "Blowout", "Beard Trim", "Manicure", "Pedicure", "Facial", "Brow Shaping", "Deep Conditioning", "Bridal Updo"],
  class: ["HIIT Blast", "Power Yoga", "Spin 45", "Boxing Basics", "Core Crusher", "Mobility Flow", "Kettlebell Club", "Pilates Mat", "Strength 101", "Bootcamp"],
  cafeProduct: ["Flat White", "Oat Latte", "Cold Brew", "Matcha Latte", "Croissant", "Avocado Toast", "Banana Bread", "Chai Latte", "Espresso", "Shakshuka", "Granola Bowl", "Iced Mocha", "Cinnamon Roll", "Turkey Panini"],
  onlineProduct: ["Linen Throw Blanket", "Ceramic Pour-over Set", "Bamboo Desk Organizer", "Wireless Charging Pad", "Merino Beanie", "Cork Yoga Mat", "Glass Water Bottle", "Leather Card Wallet", "Soy Candle Trio", "Canvas Tote", "Desk Lamp Mini", "Stoneware Mug"],
  inventory: ["Oat milk (L)", "Espresso beans (kg)", "Paper cups 12oz", "Croissant dough", "Shipping boxes M", "Bubble wrap roll", "Sugar sachets", "Avocados", "Packing tape", "Matcha powder"],
  medication: ["Amoxicillin", "Metformin", "Lisinopril", "Atorvastatin", "Cetirizine", "Ibuprofen", "Omeprazole", "Salbutamol", "Vitamin D3"],
};

const NOTES = ["Prefers morning slots", "Referred by a friend", "Follow up next month", "VIP — offer complimentary upgrade", "Sensitive to fragrances", "Pays in advance", "Asked about loyalty program", ""];
const STREETS = ["Maple Ave", "Harbor Rd", "Elm St", "Lakeview Dr", "Park Lane", "Station Rd", "Rose Ct"];
const date = (spread = 120) => new Date(Date.now() + (rand() - 0.6) * spread * 864e5).toISOString().slice(0, 10);

function value(f: FieldDef, entity: string, bundle: string, i: number, people: string[]): unknown {
  const k = f.key;
  if (k === "name") {
    if (entity === "customer" || entity === "staff") return person();
    if (entity === "product") return (bundle === "cafe" ? NAMES.cafeProduct : NAMES.onlineProduct)[i % 12] + (i >= 12 ? ` ${i}` : "");
    if (entity === "table") return `Table ${i + 1}`;
    if (entity === "sale") return `S-${1000 + i}`;
    if (entity === "ticket") return `#${300 + i}`;
    const pool = NAMES[entity];
    if (pool) return pool[i % pool.length] + (i >= pool.length ? ` ${Math.floor(i / pool.length) + 1}` : "");
  }
  if (k === "customer") return people.length ? pick(people) : person();
  if (k === "staff") return person();
  if (k === "service") return pick(NAMES.service);
  if (k === "table") return `Table ${int(1, 12)}`;
  if (k === "medication") return pick(NAMES.medication);
  if (k === "phone") return `+1 ${int(200, 989)}-${int(200, 999)}-${int(1000, 9999)}`;
  if (k === "email") return `${person().toLowerCase().replace(/[^a-z]+/g, ".")}@mail.com`;
  if (k === "address") return `${int(10, 980)} ${pick(STREETS)}, Springfield`;
  if (k === "emergency_contact") return `${person()} · +1 555-${int(1000, 9999)}`;
  if (k === "dosage") return pick(["5mg daily", "10mg twice daily", "250mg 3x/day", "As needed"]);
  if (k === "sku") return `SKU-${int(10000, 99999)}`;
  if (k === "supplier") return pick(["FreshCo", "Bean Bros", "PackRight", "GreenLeaf"]);
  if (k === "category") return pick(entity === "service" ? ["Hair", "Nails", "Skin"] : bundle === "cafe" ? ["Coffee", "Bakery", "Brunch"] : ["Home", "Kitchen", "Accessories"]);
  if (k === "specialty") return pick(["Strength", "Cardiology", "Color", "Pediatrics", "Yoga", "Cuts", "General"]);
  if (k === "room") return pick(["Studio A", "Studio B", "Main floor"]);
  if (k === "dob") return `${int(1960, 2005)}-${String(int(1, 12)).padStart(2, "0")}-${String(int(1, 28)).padStart(2, "0")}`;
  if (k === "allergies") return pick(["None", "Penicillin", "Peanuts", "Latex", "None"]);
  if (k === "notes" || k === "description") return pick(NOTES);
  if (f.type === "number") {
    const r: Record<string, [number, number]> = { price: [4, 180], total: [6, 320], amount: [25, 600], height_cm: [152, 196], weight_kg: [48, 112], stock: [0, 120], reorder_level: [10, 25], capacity: [8, 30], seats: [2, 8], duration_min: [30, 120], items: [1, 6] };
    const [a, b] = r[k] ?? [1, 100];
    return int(a, b);
  }
  if (f.type === "date") return date();
  if (f.type === "select") return f.key === "status" && rand() < 0.6 ? f.options![0] : pick(f.options ?? [""]);
  if (f.type === "multiselect") return [pick(f.options ?? [])];
  if (f.type === "boolean") return rand() > 0.5;
  return "";
}

type Spec = Pick<Tenant, "name" | "bundle" | "plan" | "color" | "currency" | "status" | "signupDate">;
const SPECS: (Spec & { id: string; custom: Record<string, FieldDef[]> })[] = [
  { id: "ironforge", name: "IronForge Fitness", bundle: "gym", plan: "pro", color: "#E4572E", currency: "USD", status: "active", signupDate: "2025-11-04",
    custom: { customer: [{ key: "cf_goal", label: "Fitness goal", type: "select", tier: "custom", options: ["Weight loss", "Muscle gain", "Endurance", "Flexibility"] }, { key: "cf_waiver", label: "Waiver signed", type: "boolean", tier: "custom" }] } },
  { id: "citycare", name: "CityCare Clinic", bundle: "clinic", plan: "pro", color: "#0E9F8E", currency: "USD", status: "active", signupDate: "2026-01-18",
    custom: { customer: [{ key: "cf_insurance", label: "Insurance provider", type: "select", tier: "custom", options: ["BlueShield", "Aetna", "Cigna", "Self-pay"] }] } },
  { id: "glow", name: "Glow & Co Salon", bundle: "salon", plan: "starter", color: "#D9467A", currency: "GBP", status: "trial", signupDate: "2026-09-21",
    custom: { customer: [{ key: "cf_formula", label: "Color formula", type: "text", tier: "custom" }, { key: "cf_prefs", label: "Preferences", type: "multiselect", tier: "custom", options: ["Quiet visit", "Tea", "Coffee", "Music"] }] } },
  { id: "brewhaus", name: "Brew Haus Cafe", bundle: "cafe", plan: "starter", color: "#9A6B3F", currency: "EUR", status: "active", signupDate: "2026-04-02",
    custom: { product: [{ key: "cf_vegan", label: "Vegan", type: "boolean", tier: "custom" }, { key: "cf_allergens", label: "Allergens", type: "multiselect", tier: "custom", options: ["Gluten", "Dairy", "Nuts", "Soy"] }] } },
  { id: "urbankart", name: "UrbanKart", bundle: "online", plan: "business", color: "#3563E9", currency: "INR", status: "suspended", signupDate: "2025-08-12",
    custom: { product: [{ key: "cf_brand", label: "Brand", type: "text", tier: "custom" }], customer: [{ key: "cf_tier", label: "Loyalty tier", type: "select", tier: "custom", options: ["Bronze", "Silver", "Gold"] }] } },
];

export function defaultFieldSettings(bundleKey: string): Record<string, Record<string, FieldSetting>> {
  const b = BUNDLES.find((x) => x.key === bundleKey);
  const out: Record<string, Record<string, FieldSetting>> = {};
  for (const e of Object.values(ENTITY_MAP)) {
    out[e.key] = {};
    for (const f of e.fields.filter((f) => f.tier === "module")) {
      const on = (b?.defaultFields[e.key] ?? []).includes(f.key) || ["email", "notes", "date", "category", "payment_method", "staff", "reorder_level", "items"].includes(f.key);
      out[e.key][f.key] = { enabled: on, required: false };
    }
  }
  return out;
}

const ROLE_PRESETS: Record<string, [string, string][]> = {
  gym: [["Trainer", "rcu"], ["Receptionist", "rc"]],
  clinic: [["Doctor", "rcu"], ["Receptionist", "rc"]],
  salon: [["Stylist", "ru"], ["Receptionist", "rcu"]],
  cafe: [["Cashier", "rc"], ["Kitchen", "ru"]],
  online: [["Fulfillment", "ru"], ["Support", "r"]],
  custom: [["Staff", "r"]],
};

export function defaultRoles(bundleKey: string, modules: string[]): Role[] {
  const all = (flags: string): Record<string, Perm> =>
    Object.fromEntries(modules.map((m) => [m, { read: flags.includes("r"), create: flags.includes("c"), update: flags.includes("u"), delete: flags.includes("d") }]));
  return [{ id: "owner", name: "Owner", perms: all("rcud") }, ...(ROLE_PRESETS[bundleKey] ?? []).map(([n, f]) => ({ id: n.toLowerCase(), name: n, perms: all(f) }))];
}

export function buildTenant(spec: Spec & { id: string; custom?: Record<string, FieldDef[]> }): Tenant {
  const b = BUNDLES.find((x) => x.key === spec.bundle)!;
  return { ...spec, modules: [...b.modules], terms: { ...b.terms }, fieldSettings: defaultFieldSettings(spec.bundle), customFields: spec.custom ?? {}, roles: defaultRoles(spec.bundle, b.modules) };
}

export function seedAll() {
  s = 42;
  const tenants = SPECS.map(buildTenant);
  const records: Record<string, Record<string, RecordRow[]>> = {};
  for (const t of tenants) {
    records[t.id] = {};
    const order = [...t.modules].sort((a) => (a === "customers" ? -1 : 1));
    for (const mk of order) {
      const ent = MODULES.find((m) => m.key === mk)?.entity;
      if (!ent) continue;
      const fields = [...ENTITY_MAP[ent].fields, ...(t.customFields[ent] ?? [])];
      const people = (records[t.id].customer ?? []).map((r) => String(r.values.name));
      const n = int(20, 30);
      records[t.id][ent] = Array.from({ length: n }, (_, i) => ({
        id: uid(),
        createdAt: date(300),
        values: Object.fromEntries(fields.map((f) => [f.key, value(f, ent, t.bundle, i, people)])),
      }));
    }
  }
  const actions = ["enabled module", "updated field", "changed plan", "invited staff", "renamed term", "created role", "exported report"];
  const audit: AuditEntry[] = Array.from({ length: 30 }, (_, i) => {
    const t = pick(tenants);
    return { id: uid(), at: new Date(Date.now() - i * int(2, 9) * 36e5).toISOString(), actor: `${pick(FIRST)} @ ${t.name}`, action: pick(actions), target: pick(MODULES).name };
  });
  return { tenants, records, audit };
}
