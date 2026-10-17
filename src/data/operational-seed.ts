import type { RecordRow, Tenant } from "./types";
import { emit, newRow, type ModuleEvent } from "@/lib/module-events";
import { localDate } from "@/lib/operation-time";
export function seedOperations(
  tenants: Tenant[],
  records: Record<string, Record<string, RecordRow[]>>,
) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const events: ModuleEvent[] = [];
  for (const t of tenants) {
    if (!["ironforge", "citycare", "glow", "brewhaus", "urbankart"].includes(t.id)) continue;
    const r = records[t.id];
    if (t.modules.includes("appointments")) r.staff = (r.staff ?? []).slice(0, 3);
    if (t.modules.includes("appointments")) {
      const people = r.customer ?? [];
      const staff = r.staff ?? [];
      r.appointment = Array.from({ length: 25 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + (i % 7));
        return newRow(
          {
            customer: people[i % people.length]?.values.name ?? "",
            date: localDate(d),
            time: `${String(9 + Math.floor(i / 7) * 2).padStart(2, "0")}:00`,
            staff: staff[i % 3]?.values.name ?? "",
            staffId: staff[i % 3]?.id,
            duration_min: 30,
            status: ["Confirmed", "Pending", "Completed"][i % 3],
            amount: 55,
          },
          now.toISOString(),
        );
      });
    }
    if (t.modules.includes("checkin")) {
      r.membership = (r.customer ?? []).map((p, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() + (i % 5 === 0 ? -7 : 30 + i));
        return newRow(
          {
            customer: p.values.name,
            customerId: p.id,
            plan: i % 2 ? "Annual" : "Monthly",
            status: i % 5 === 0 ? "Expired" : i % 5 === 1 ? "Frozen" : "Active",
            end_date: localDate(d),
          },
          now.toISOString(),
        );
      });
      r.checkin = [];
      for (let i = 2; i < 7; i++) {
        const p = r.customer?.[i];
        if (p)
          r.checkin.push(
            newRow(
              {
                customer: p.values.name,
                customerId: p.id,
                date: localDate(now),
                status: "Checked in",
                at: new Date(now.getTime() - (i - 1) * 12 * 60000).toISOString(),
              },
              new Date(now.getTime() - (i - 1) * 12 * 60000).toISOString(),
            ),
          );
      }
    }
    if (t.modules.includes("pos")) {
      if (t.bundle === "salon")
        r.product = Array.from({ length: 8 }, (_, i) =>
          newRow(
            {
              name: [
                "Hydrating Shampoo",
                "Repair Conditioner",
                "Styling Cream",
                "Hair Oil",
                "Dry Shampoo",
                "Curl Mousse",
                "Heat Protectant",
                "Shine Spray",
              ][i],
              price: 12 + i * 3,
              category: "Hair care",
              status: "Active",
            },
            now.toISOString(),
          ),
        );
      if (t.bundle === "cafe") {
        r.product = (r.product ?? [])
          .slice(0, 14)
          .map((p, i) => ({
            ...p,
            values: {
              ...p.values,
              price: [3.5, 4.5, 4, 5, 3.25, 9, 4, 4.5, 2.5, 11, 8, 5, 4, 9][i % 14],
              category: i < 4 ? "Coffee" : i < 7 ? "Bakery" : "Brunch",
              status: "Active",
            },
          }));
      }
      if (t.modules.includes("inventory"))
        r.inventory = (r.product ?? []).map((p, i) =>
          newRow(
            {
              name: p.values.name,
              productId: p.id,
              stock: i === r.product.length - 1 ? 0 : 20 + i,
              reorder_level: 5,
              status: i === r.product.length - 1 ? "Out of stock" : "In stock",
            },
            now.toISOString(),
          ),
        );
    }
    if (t.modules.includes("services"))
      r.service = (r.service ?? [])
        .slice(0, 12)
        .map((p, i) => ({
          ...p,
          values: {
            ...p.values,
            status: "Active",
            duration_min: [30, 60, 90][i % 3],
            category: i < 6 ? "Hair" : "Beauty",
          },
        }));
    if (t.modules.includes("kds")) {
      r.ticket = [];
      for (let i = 0; i < 6; i++) {
        const p = r.product?.[i];
        const at = new Date(now.getTime() - [1, 4, 6, 8, 11, 14][i] * 60000).toISOString();
        const ev = emit(
          { tenants, records },
          "order.sent_to_kitchen",
          {
            tenantId: t.id,
            sourceId: `seed-${100 + i}`,
            table: i % 2 ? `Table ${i + 1}` : "",
            lines: p
              ? [
                  {
                    id: p.id,
                    name: String(p.values.name),
                    source: "product",
                    quantity: (i % 2) + 1,
                    price: Number(p.values.price),
                    note: i === 2 ? "No dairy" : "",
                  },
                ]
              : [],
          },
          at,
        );
        events.push(ev);
        if (r.ticket[0])
          r.ticket[0].values.status = ["New", "New", "Preparing", "Preparing", "Ready", "Ready"][i];
      }
    }
  }
  return events;
}
