import { ChevronLeft, ChevronRight, Columns3, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RecordRow } from "@/data/types";
import type { ResolvedField } from "@/hooks/use-tenant";
import { formatValue } from "./FieldInput";

const PAGE = 10;

export function DynamicTable({ fields, rows, currency, onEdit, onDelete }: {
  fields: ResolvedField[];
  rows: RecordRow[];
  currency?: string;
  onEdit: (r: RecordRow) => void;
  onDelete: (r: RecordRow) => void;
}) {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const filterable = fields.filter((f) => f.type === "select" || f.type === "boolean");
  const cols = fields.filter((f) => !hidden.includes(f.key) && f.type !== "textarea");

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r) =>
      (!s || fields.some((f) => String(r.values[f.key] ?? "").toLowerCase().includes(s))) &&
      Object.entries(filters).every(([k, v]) => !fields.some(f => f.key === k) || !v || v === "all" || r.values[k] === (fields.find(f => f.key === k)?.type === 'boolean' ? v === 'true' : v)),
    );
  }, [rows, q, filters, fields]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const p = Math.min(page, pages - 1);
  const view = filtered.slice(p * PAGE, p * PAGE + PAGE);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className="pl-8" />
        </div>
        {filterable.map((f) => (
          <Select key={f.key} value={filters[f.key] ?? "all"} onValueChange={(v) => { setFilters((p) => ({ ...p, [f.key]: v })); setPage(0); }}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{f.type === 'boolean' ? 'Any' : 'All'} {f.label.toLowerCase()}</SelectItem>
              {f.type === 'boolean' ? <><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></> : (f.options ?? []).filter(o => !f.retiredOptions?.includes(o)).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Columns3 className="h-4 w-4" /> Columns</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {fields.filter((f) => f.type !== "textarea").map((f) => (
              <DropdownMenuCheckboxItem key={f.key} checked={!hidden.includes(f.key)} onSelect={(e) => e.preventDefault()}
                onCheckedChange={(c) => setHidden((h) => (c ? h.filter((x) => x !== f.key) : [...h, f.key]))}>{f.label}</DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((f) => <TableHead key={f.key} className="whitespace-nowrap">{f.label}</TableHead>)}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => onEdit(r)}>
                {cols.map((f) => (
                  <TableCell key={f.key} className="max-w-[240px] truncate whitespace-nowrap">
                    {f.key === "status" ? <span className="brand-soft rounded-full px-2 py-0.5 text-xs font-medium">{String(r.values[f.key] ?? "—")}</span> : formatValue(f, r.values[f.key], currency)}
                  </TableCell>
                ))}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Row actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(r)}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {view.length === 0 && (
              <TableRow><TableCell colSpan={cols.length + 1} className="py-12 text-center text-muted-foreground">No records match your search.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t px-3 py-2 text-sm text-muted-foreground">
        <span>{filtered.length} records</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" disabled={p === 0} onClick={() => setPage(p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
          <span>{p + 1} / {pages}</span>
          <Button variant="ghost" size="icon" disabled={p >= pages - 1} onClick={() => setPage(p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
