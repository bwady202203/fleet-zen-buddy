import { z } from "zod";
export interface TransportCommissionRule { min_weight: number; max_weight: number | null; amount: number }
const numeric = z.string().trim().min(1, "هذا الحقل مطلوب").transform(value => Number(value.replace(/,/g, "."))).pipe(z.number().finite("أدخل رقماً صحيحاً").nonnegative("القيمة لا تكون سالبة"));
export const transportCommissionSchema = z.object({ min_weight: numeric, max_weight: z.string().trim().transform(value => value === "" ? null : Number(value.replace(/,/g, "."))).pipe(z.number().finite().positive().nullable()), amount: numeric }).refine(rule => rule.max_weight === null || rule.max_weight > rule.min_weight, { path: ["max_weight"], message: "الحد الأعلى يجب أن يكون أكبر من الحد الأدنى" });
export function calculateTransportCommission(rawWeight: string, rules: TransportCommissionRule[]): number | null {
  if (!rawWeight.trim()) return null;
  const weight = Number(rawWeight.replace(/,/g, "."));
  if (!Number.isFinite(weight) || weight <= 0) return null;
  const matching = rules.filter(rule => weight >= rule.min_weight && (rule.max_weight === null || weight < rule.max_weight));
  return matching.length === 1 ? matching[0]?.amount ?? null : null;
}