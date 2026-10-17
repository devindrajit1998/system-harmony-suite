import type { ResolvedField } from "@/hooks/use-tenant";

export function isEmpty(v: unknown) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

/** Returns a map of field key -> error message for required fields left empty. */
export function validateValues(fields: Pick<ResolvedField, "key" | "label" | "required" | "type">[], values: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (f.required && f.type !== "boolean" && isEmpty(values[f.key])) errors[f.key] = `${f.label} is required`;
    if (f.type === "number" && !isEmpty(values[f.key]) && Number.isNaN(Number(values[f.key]))) errors[f.key] = `${f.label} must be a number`;
  }
  return errors;
}
