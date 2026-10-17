import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, Receipt, Coffee, Sparkles, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shell/PortalShell";
import { money, useTenant, useTerms } from "@/hooks/use-tenant";
import { useAppStore } from "@/store/app-store";
import { cartTotal, catalogPort, stockPort, tablesPort } from "@/lib/operations";
import type { OrderLine, Cart } from "@/lib/module-events";
import { validateRecord } from "@/lib/validation";
import { OperationsSettings, useOperationSettings } from "./OperationsSettings";
const emptyCart = (): Cart => ({
  id: crypto.randomUUID(),
  lines: [],
  discount: 0,
  mode: "percent",
  table: "",
  sent: false,
});
export function POS() {
  const tenant = useTenant();
  const { t, tp } = useTerms();
  const settings = useOperationSettings();
  const data = useAppStore((s) => s.records[tenant.id]);
  const cartsByTenant = useAppStore((s) => s.posCarts);
  const saveCarts = useAppStore((s) => s.setPosCarts);
  const [fallback] = useState(() => emptyCart());
  const carts = cartsByTenant?.[tenant.id] ?? [fallback];
  const [index, setIndex] = useState(0);
  const cart = carts[Math.min(index, carts.length - 1)] ?? fallback;
  const catalog = catalogPort(tenant.id, tenant.modules);
  const tables = tenant.modules.includes("tables") ? tablesPort(tenant.id) : [];
  const [category, setCategory] = useState("All");
  const [charge, setCharge] = useState(false);
  const [method, setMethod] = useState("Card");
  const [cash, setCash] = useState("");
  const [receipt, setReceipt] = useState<{
    total: number;
    change: number;
    lines: OrderLine[];
    id: string;
  } | null>(null);
  const emit = useAppStore((s) => s.emitEvent);
  const pay = useAppStore((s) => s.payOrder);
  const totals = cartTotal(cart.lines, cart.discount, cart.mode, settings.tax);
  useEffect(() => {
    setIndex(0);
    setCategory("All");
    setCharge(false);
    setReceipt(null);
  }, [tenant.id]);
  const update = (patch: Partial<Cart>) => {
    saveCarts(
      tenant.id,
      carts.map((c) => (c.id === cart.id ? { ...c, ...patch } : c)),
    );
  };
  const line = (id: string, patch: Partial<OrderLine>) =>
    update({ lines: cart.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const canCharge = cart.lines.length > 0 && (method !== "Cash" || Number(cash) >= totals.total);
  function add(item: (typeof catalog)[number]) {
    const stock = stockPort(tenant.id, item.id);
    const existing = cart.lines.find((l) => l.id === item.id);
    if (
      tenant.modules.includes("inventory") &&
      item.source === "product" &&
      stock &&
      Number(stock.values.stock) < (existing?.quantity ?? 0) + 1
    ) {
      toast.error(`${t("product")} is out of stock`);
      return;
    }
    if (existing) line(item.id, { quantity: existing.quantity + 1 });
    else
      update({
        lines: [
          ...cart.lines,
          {
            id: item.id,
            name: String(item.values.name),
            source: item.source,
            price: Number(item.values.price),
            quantity: 1,
            note: "",
          },
        ],
      });
  }
  function payload() {
    return {
      tenantId: tenant.id,
      sourceId: cart.id,
      amount: totals.total,
      customer: "Walk-in",
      table: tenant.modules.includes("tables") ? cart.table : "",
      lines: cart.lines,
    };
  }
  function payment() {
    if (!canCharge) return;
    const err = validateRecord("order", {
      customer: "Walk-in",
      total: totals.total,
      status: "Paid",
      date: new Date().toISOString().slice(0, 10),
    });
    if (Object.keys(err).length) {
      toast.error(Object.values(err)[0]);
      return;
    }
    for (const l of cart.lines) {
      const stock = stockPort(tenant.id, l.id);
      if (
        tenant.modules.includes("inventory") &&
        l.source === "product" &&
        stock &&
        Number(stock.values.stock) < l.quantity
      ) {
        toast.error(`${l.name}: insufficient stock`);
        return;
      }
    }
    pay(payload(), method);
    setReceipt({
      total: totals.total,
      change: method === "Cash" ? Number(cash) - totals.total : 0,
      lines: cart.lines,
      id: cart.id,
    });
    saveCarts(
      tenant.id,
      carts.map((c) => (c.id === cart.id ? emptyCart() : c)),
    );
    setCharge(false);
    setCash("");
    toast.success(`${t("order")} paid`);
  }
  return (
    <div>
      <PageHeader title={tp("sale")} actions={<OperationsSettings mode="pos" />} />
      <div className="mb-4 flex flex-wrap gap-2">
        {carts.map((c, i) => (
          <Button
            key={c.id}
            variant={cart.id === c.id ? "default" : "outline"}
            onClick={() => setIndex(i)}
          >
            Cart {i + 1}
            {c.lines.length ? ` · ${c.lines.length}` : ""}
          </Button>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_370px]">
        <section>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              "All",
              ...new Set(
                catalog.map((p) =>
                  String(
                    p.values.category || (p.source === "service" && tp("service")) || tp("product"),
                  ),
                ),
              ),
            ].map((c) => (
              <Button
                key={c}
                variant={category === c ? "default" : "outline"}
                onClick={() => setCategory(c)}
              >
                {c}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {catalog
              .filter(
                (p) =>
                  category === "All" ||
                  String(
                    p.values.category || (p.source === "service" && tp("service")) || tp("product"),
                  ) === category,
              )
              .map((p) => {
                const stock =
                  tenant.modules.includes("inventory") && p.source === "product"
                    ? stockPort(tenant.id, p.id)
                    : undefined;
                const unavailable = stock && Number(stock.values.stock) <= 0;
                const Icon =
                  p.source === "service" ? Sparkles : tenant.bundle === "cafe" ? Coffee : Package;
                return (
                  <Button
                    key={p.id}
                    variant="outline"
                    disabled={!!unavailable}
                    className="h-36 flex-col items-start justify-between whitespace-normal p-4 text-left"
                    onClick={() => add(p)}
                  >
                    <Icon className="size-6 text-primary" />
                    <span className="font-semibold">{String(p.values.name)}</span>
                    <span>
                      {money(Number(p.values.price), tenant.currency)}
                      {stock && (
                        <small className="ml-2 text-muted-foreground">
                          {Number(stock.values.stock)} in stock
                        </small>
                      )}
                    </span>
                    {unavailable && <small>Out of stock</small>}
                  </Button>
                );
              })}
          </div>
          {catalog.length === 0 && (
            <p className="py-12 text-muted-foreground">
              No {tp("product").toLowerCase()} or {tp("service").toLowerCase()} available.
            </p>
          )}
        </section>
        <section className="border-l pl-5">
          <h2 className="mb-4 text-lg font-semibold">Cart</h2>
          <div className="divide-y">
            {cart.lines.map((l) => (
              <div key={l.id} className="space-y-2 py-3">
                <div className="flex items-center justify-between gap-2">
                  <strong>{l.name}</strong>
                  <span>{money(l.price * l.quantity, tenant.currency)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Decrease ${l.name}`}
                    disabled={l.quantity <= 1 || cart.sent}
                    onClick={() => line(l.id, { quantity: l.quantity - 1 })}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center">{l.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Increase ${l.name}`}
                    disabled={cart.sent}
                    onClick={() => {
                      const stock = stockPort(tenant.id, l.id);
                      if (
                        tenant.modules.includes("inventory") &&
                        stock &&
                        l.quantity >= Number(stock.values.stock)
                      ) {
                        toast.error("Insufficient stock");
                        return;
                      }
                      line(l.id, { quantity: l.quantity + 1 });
                    }}
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${l.name}`}
                    disabled={cart.sent}
                    onClick={() => update({ lines: cart.lines.filter((x) => x.id !== l.id) })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Input
                  aria-label={`Note for ${l.name}`}
                  placeholder="Note"
                  value={l.note}
                  disabled={cart.sent}
                  onChange={(e) => line(l.id, { note: e.target.value })}
                />
              </div>
            ))}
          </div>
          {cart.lines.length === 0 && <p className="py-8 text-muted-foreground">Cart is empty.</p>}
          {tenant.modules.includes("tables") && (
            <Label>
              {t("table")}
              <select
                aria-label={t("table")}
                className="my-2 h-10 w-full rounded-md border bg-background px-2"
                value={cart.table}
                onChange={(e) => update({ table: e.target.value })}
              >
                <option value="">Takeaway</option>
                {tables.map((r) => (
                  <option key={r.id} value={String(r.values.name)}>
                    {String(r.values.name)}
                  </option>
                ))}
              </select>
            </Label>
          )}
          <div className="my-4 grid grid-cols-2 gap-2">
            <Label htmlFor="discount">
              Discount
              <Input
                id="discount"
                type="number"
                min={0}
                max={cart.mode === "percent" ? 100 : totals.subtotal}
                value={cart.discount}
                onChange={(e) => update({ discount: Math.max(0, Number(e.target.value)) })}
              />
            </Label>
            <Label>
              Type
              <select
                aria-label="Discount type"
                className="mt-1 h-9 w-full rounded-md border bg-background px-2"
                value={cart.mode}
                onChange={(e) =>
                  update({ mode: e.target.value === "amount" ? "amount" : "percent" })
                }
              >
                <option value="percent">%</option>
                <option value="amount">Amount</option>
              </select>
            </Label>
          </div>
          <dl className="space-y-2 border-t py-4">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{money(totals.subtotal, tenant.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Discount</dt>
              <dd>−{money(totals.discount, tenant.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Tax ({settings.tax}%)</dt>
              <dd>{money(totals.tax, tenant.currency)}</dd>
            </div>
            <div className="flex justify-between text-xl font-bold">
              <dt>Total</dt>
              <dd>
                {new Intl.NumberFormat("en", {
                  style: "currency",
                  currency: tenant.currency,
                }).format(totals.total)}
              </dd>
            </div>
          </dl>
          <div className="grid gap-2">
            <Button className="h-12" disabled={!cart.lines.length} onClick={() => setCharge(true)}>
              Charge
            </Button>
            {tenant.modules.includes("kds") && (
              <Button
                variant="outline"
                disabled={!cart.lines.length || cart.sent}
                onClick={() => {
                  emit("order.sent_to_kitchen", payload());
                  update({ sent: true });
                  toast.success(`${t("ticket")} created`);
                }}
              >
                Send to kitchen
              </Button>
            )}
            <Button
              variant="outline"
              disabled={!cart.lines.length}
              onClick={() => {
                saveCarts(tenant.id, [...carts, emptyCart()]);
                setIndex(carts.length);
              }}
            >
              Hold
            </Button>
          </div>
        </section>
      </div>
      <Dialog open={charge} onOpenChange={setCharge}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Charge{" "}
              {new Intl.NumberFormat("en", { style: "currency", currency: tenant.currency }).format(
                totals.total,
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            {["Cash", "Card", "UPI"].map((m) => (
              <Button
                key={m}
                variant={method === m ? "default" : "outline"}
                onClick={() => setMethod(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          {method === "Cash" && (
            <>
              <Label htmlFor="cash-tendered">Cash received</Label>
              <Input
                id="cash-tendered"
                type="number"
                min={totals.total}
                step="0.01"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
              />
              <p>
                Change due:{" "}
                {new Intl.NumberFormat("en", {
                  style: "currency",
                  currency: tenant.currency,
                }).format(Math.max(0, Number(cash) - totals.total))}
              </p>
            </>
          )}
          <Button disabled={!canCharge} onClick={payment}>
            Pay
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Receipt className="mr-2 inline size-5" />
              Receipt
            </DialogTitle>
          </DialogHeader>
          <strong>{tenant.name}</strong>
          <small>{receipt?.id}</small>
          {receipt?.lines.map((l) => (
            <div className="flex justify-between" key={l.id}>
              <span>
                {l.quantity} × {l.name}
              </span>
              <span>{money(l.quantity * l.price, tenant.currency)}</span>
            </div>
          ))}
          <p className="border-t pt-3 text-xl font-bold">
            Paid{" "}
            {new Intl.NumberFormat("en", { style: "currency", currency: tenant.currency }).format(
              receipt?.total ?? 0,
            )}
          </p>
          {method === "Cash" && <p>Change {money(receipt?.change ?? 0, tenant.currency)}</p>}
          <Button onClick={() => setReceipt(null)}>Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export type { Cart };
