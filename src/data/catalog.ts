import type { BundleDef, EntityDef, FieldDef, ModuleDef, PlanDef } from "./types";

export const MODULES: ModuleDef[] = [
  { key: "customers", name: "Contacts", icon: "Users", description: "People you serve", dependsOn: [], price: 0, status: "active", core: true, entity: "customer" },
  { key: "staff", name: "Staff", icon: "UserCog", description: "Team members and schedules", dependsOn: [], price: 0, status: "active", entity: "staff" },
  { key: "services", name: "Services", icon: "Sparkles", description: "Service menu with pricing", dependsOn: [], price: 5, status: "active", entity: "service" },
  { key: "appointments", name: "Appointments", icon: "CalendarClock", description: "Bookings and calendar", dependsOn: ["customers", "staff"], price: 12, status: "active", entity: "appointment" },
  { key: "memberships", name: "Memberships", icon: "BadgeCheck", description: "Recurring member plans", dependsOn: ["customers"], price: 12, status: "active", entity: "membership" },
  { key: "checkin", name: "Check-in", icon: "ScanLine", description: "Door check-ins", dependsOn: ["memberships"], price: 8, status: "active", entity: "checkin" },
  { key: "classes", name: "Classes", icon: "Dumbbell", description: "Group class schedule", dependsOn: ["memberships", "staff"], price: 10, status: "active", entity: "class" },
  { key: "products", name: "Products", icon: "Package", description: "Product catalog", dependsOn: [], price: 10, status: "active", entity: "product" },
  { key: "orders", name: "Orders", icon: "ShoppingBag", description: "Online orders", dependsOn: ["products", "customers"], price: 15, status: "active", entity: "order" },
  { key: "pos", name: "Point of Sale", icon: "CreditCard", description: "In-person sales", dependsOn: ["products"], price: 15, status: "active", entity: "sale" },
  { key: "inventory", name: "Inventory", icon: "Boxes", description: "Stock levels", dependsOn: ["products"], price: 10, status: "active", entity: "inventory" },
  { key: "tables", name: "Tables", icon: "LayoutGrid", description: "Floor plan and seating", dependsOn: [], price: 8, status: "active", entity: "table" },
  { key: "kds", name: "Kitchen Display", icon: "ChefHat", description: "Kitchen tickets", dependsOn: ["pos"], price: 8, status: "beta", entity: "ticket" },
  { key: "prescriptions", name: "Prescriptions", icon: "Pill", description: "Medication records", dependsOn: ["appointments"], price: 10, status: "active", entity: "prescription" },
  { key: "billing", name: "Billing", icon: "Receipt", description: "Invoices and payments", dependsOn: ["customers"], price: 10, status: "active", entity: "invoice" },
  { key: "reports", name: "Reports", icon: "BarChart3", description: "Business analytics", dependsOn: [], price: 5, status: "active" },
];

export const DEFAULT_TERMS: Record<string, string> = {
  customer: "Customer",
  staff: "Staff Member",
  service: "Service",
  appointment: "Appointment",
  membership: "Membership",
  checkin: "Check-in",
  class: "Class",
  product: "Product",
  order: "Order",
  sale: "Sale",
  inventory: "Stock Item",
  table: "Table",
  ticket: "Kitchen Ticket",
  prescription: "Prescription",
  invoice: "Invoice",
};

const STATUS = (opts: string[]): FieldDef => ({ key: "status", label: "Status", type: "select", tier: "system", options: opts, required: true });
const sys = (key: string, label: string, type: FieldDef["type"] = "text", extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type, tier: "system", required: true, ...extra });
const opt = (key: string, label: string, type: FieldDef["type"] = "text", extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type, tier: "module", ...extra });

export const ENTITIES: EntityDef[] = [
  {
    key: "customer",
    fields: [
      sys("name", "Full name"), sys("phone", "Phone"), STATUS(["Active", "Inactive", "Lead"]),
      opt("email", "Email"), opt("dob", "Date of birth", "date"),
      opt("gender", "Gender", "select", { options: ["Female", "Male", "Non-binary", "Prefer not to say"] }),
      opt("address", "Address", "textarea"), opt("emergency_contact", "Emergency contact"), opt("notes", "Notes", "textarea"),
      opt("blood_group", "Blood group", "select", { options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] }),
      opt("allergies", "Allergies", "textarea"), opt("height_cm", "Height (cm)", "number"), opt("weight_kg", "Weight (kg)", "number"),
      opt("hair_type", "Hair type", "select", { options: ["Straight", "Wavy", "Curly", "Coily"] }),
    ],
  },
  {
    key: "staff",
    fields: [
      sys("name", "Full name"), sys("phone", "Phone"), STATUS(["Active", "On leave", "Inactive"]),
      opt("email", "Email"), opt("specialty", "Specialty"), opt("hire_date", "Hire date", "date"), opt("notes", "Notes", "textarea"),
    ],
  },
  {
    key: "service",
    fields: [sys("name", "Service name"), sys("price", "Price", "number"), STATUS(["Active", "Hidden"]), opt("duration_min", "Duration (min)", "number"), opt("category", "Category"), opt("description", "Description", "textarea")],
  },
  {
    key: "appointment",
    fields: [sys("customer", "Customer", "text", { labelTerm: "customer" }), sys("date", "Date", "date"), sys("time", "Time"), STATUS(["Confirmed", "Pending", "Completed", "Cancelled"]), opt("staff", "Staff", "text", { labelTerm: "staff" }), opt("service", "Service", "text", { labelTerm: "service" }), opt("duration_min", "Duration (min)", "number"), opt("notes", "Notes", "textarea")],
  },
  {
    key: "membership",
    fields: [sys("customer", "Customer", "text", { labelTerm: "customer" }), sys("plan", "Plan", "select", { options: ["Monthly", "Quarterly", "Annual"] }), STATUS(["Active", "Paused", "Expired"]), opt("start_date", "Start date", "date"), opt("end_date", "End date", "date"), opt("price", "Price", "number")],
  },
  {
    key: "checkin",
    fields: [sys("customer", "Customer", "text", { labelTerm: "customer" }), sys("date", "Date", "date"), STATUS(["Checked in", "Denied"]), opt("notes", "Notes", "textarea")],
  },
  {
    key: "class",
    fields: [sys("name", "Class name"), sys("date", "Date", "date"), STATUS(["Open", "Full", "Cancelled"]), opt("staff", "Instructor", "text", { labelTerm: "staff" }), opt("capacity", "Capacity", "number"), opt("room", "Room")],
  },
  {
    key: "product",
    fields: [sys("name", "Name"), sys("price", "Price", "number"), STATUS(["Active", "Draft", "Archived"]), opt("sku", "SKU"), opt("category", "Category"), opt("description", "Description", "textarea")],
  },
  {
    key: "order",
    fields: [sys("customer", "Customer", "text", { labelTerm: "customer" }), sys("total", "Total", "number"), STATUS(["Pending", "Paid", "Shipped", "Delivered", "Refunded"]), opt("date", "Order date", "date"), opt("items", "Items", "number"), opt("address", "Shipping address", "textarea")],
  },
  {
    key: "sale",
    fields: [sys("name", "Reference"), sys("total", "Total", "number"), STATUS(["Completed", "Refunded", "Voided"]), opt("payment_method", "Payment method", "select", { options: ["Card", "Cash", "Wallet"] }), opt("date", "Date", "date")],
  },
  {
    key: "inventory",
    fields: [sys("name", "Item"), sys("stock", "On hand", "number"), STATUS(["In stock", "Low", "Out of stock"]), opt("reorder_level", "Reorder level", "number"), opt("supplier", "Supplier")],
  },
  {
    key: "table",
    fields: [sys("name", "Table"), sys("seats", "Seats", "number"), STATUS(["Free", "Occupied", "Reserved"]), opt("area", "Area", "select", { options: ["Indoor", "Patio", "Bar"] })],
  },
  {
    key: "ticket",
    fields: [sys("name", "Ticket"), sys("table", "Table", "text", { labelTerm: "table" }), STATUS(["New", "Preparing", "Ready", "Served"]), opt("items", "Items", "number"), opt("notes", "Notes", "textarea")],
  },
  {
    key: "prescription",
    fields: [sys("customer", "Customer", "text", { labelTerm: "customer" }), sys("medication", "Medication"), STATUS(["Active", "Completed", "Stopped"]), opt("dosage", "Dosage"), opt("date", "Prescribed on", "date"), opt("notes", "Notes", "textarea")],
  },
  {
    key: "invoice",
    fields: [sys("customer", "Customer", "text", { labelTerm: "customer" }), sys("amount", "Amount", "number"), STATUS(["Paid", "Due", "Overdue", "Void", "Draft"]), opt("date", "Issued", "date"), opt("due_date", "Due date", "date"), opt("notes", "Notes", "textarea")],
  },
];

export const ENTITY_MAP = Object.fromEntries(ENTITIES.map((e) => [e.key, e]));

export const BUNDLES: BundleDef[] = [
  { key: "gym", name: "Gym", icon: "Dumbbell", description: "Memberships, classes, check-ins", modules: ["customers", "memberships", "checkin", "classes", "staff", "billing"], terms: { customer: "Member", staff: "Trainer" }, defaultFields: { customer: ["email", "dob", "emergency_contact", "height_cm", "weight_kg"] } },
  { key: "clinic", name: "Clinic", icon: "Stethoscope", description: "Patients, appointments, prescriptions", modules: ["customers", "appointments", "staff", "prescriptions", "billing"], terms: { customer: "Patient", staff: "Doctor" }, defaultFields: { customer: ["email", "dob", "gender", "blood_group", "allergies", "emergency_contact"] } },
  { key: "salon", name: "Salon", icon: "Scissors", description: "Bookings, services, POS", modules: ["customers", "appointments", "services", "staff", "products", "pos", "billing"], terms: { customer: "Client", staff: "Stylist", appointment: "Booking" }, defaultFields: { customer: ["email", "hair_type", "notes"] } },
  { key: "cafe", name: "Cafe", icon: "Coffee", description: "Menu, tables, kitchen", modules: ["products", "tables", "pos", "kds", "inventory"], terms: { product: "Menu Item" }, defaultFields: { product: ["category", "description"] } },
  { key: "online", name: "Online Seller", icon: "Store", description: "Catalog, orders, stock", modules: ["products", "orders", "inventory", "customers", "billing"], terms: {}, defaultFields: { customer: ["email", "address"], product: ["sku", "category"] } },
  { key: "custom", name: "Custom", icon: "Puzzle", description: "Pick everything yourself", modules: ["customers"], terms: {}, defaultFields: {} },
];

export const PLANS: PlanDef[] = [
  { key: "starter", name: "Starter", price: 19, seats: 3, locations: 1, features: ["Core contacts", "Email support"] },
  { key: "pro", name: "Pro", price: 49, seats: 10, locations: 3, features: ["Everything in Starter", "Roles & permissions", "Priority support"] },
  { key: "business", name: "Business", price: 99, seats: null, locations: null, features: ["Everything in Pro", "Unlimited seats & locations", "Dedicated manager"] },
];

export const BUNDLE_DISCOUNT = 0.15;
