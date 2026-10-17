import type { ResolvedField } from "@/hooks/use-tenant";

export function isEmpty(v: unknown) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Returns a map of field key -> error message. Used by forms, imports and inline edits alike. */
export function validateValues(fields: Pick<ResolvedField, "key" | "label" | "required" | "type" | "rules">[], values: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = values[f.key];
    const r = f.rules ?? {};
    if (isEmpty(v)) {
      if (f.required && f.type !== "boolean") errors[f.key] = f.type === "select" || f.type === "multiselect" ? `Choose a ${f.label.toLowerCase()}` : `${f.label} is required`;
      continue;
    }
    if (f.type === "number") {
      const n = Number(v);
      if (Number.isNaN(n)) errors[f.key] = `${f.label} must be a number`;
      else if (r.min !== undefined && n < r.min) errors[f.key] = `${f.label} must be at least ${r.min}`;
      else if (r.max !== undefined && n > r.max) errors[f.key] = `${f.label} must be at most ${r.max}`;
    }
    if ((f.type === "text" || f.type === "textarea") && r.maxLength && String(v).length > r.maxLength)
      errors[f.key] = `${f.label} must be ${r.maxLength} characters or fewer`;
    if (f.type === "date") {
      const d = String(v).slice(0, 10);
      if (r.noFuture && d > today()) errors[f.key] = `${f.label} can't be in the future`;
      if (r.noPast && d < today()) errors[f.key] = `${f.label} can't be in the past`;
    }
  }
  return errors;
}
