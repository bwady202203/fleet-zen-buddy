import { z } from "zod";

export interface TransportCommissionRule {
  min_weight: number;
  max_weight: number | null;
  amount: number;
  from_location?: string | null;
  to_location?: string | null;
}

const numeric = z.string().trim().min(1, "هذا الحقل مطلوب").transform(value => Number(value.replace(/,/g, "."))).pipe(z.number().finite("أدخل رقماً صحيحاً").nonnegative("القيمة لا تكون سالبة"));
const optionalText = z.string().trim().transform(value => value === "" ? null : value).pipe(z.string().nullable());

export const transportCommissionSchema = z.object({
  min_weight: numeric,
  max_weight: z.string().trim().transform(value => value === "" ? null : Number(value.replace(/,/g, "."))).pipe(z.number().finite().positive().nullable()),
  amount: numeric,
  from_location: optionalText,
  to_location: optionalText,
}).refine(rule => rule.max_weight === null || rule.max_weight > rule.min_weight, { path: ["max_weight"], message: "الحد الأعلى يجب أن يكون أكبر من الحد الأدنى" });

const samePlace = (rulePlace: string | null | undefined, loadPlace: string) =>
  !rulePlace || rulePlace.trim() === loadPlace.trim();

export function calculateTransportCommission(rawWeight: string, rules: TransportCommissionRule[], fromLocation = "", toLocation = ""): number | null {
  if (!rawWeight.trim()) return null;
  const weight = Number(rawWeight.replace(/,/g, "."));
  if (!Number.isFinite(weight) || weight <= 0) return null;
  const matching = rules.filter(rule =>
    weight >= rule.min_weight &&
    (rule.max_weight === null || weight < rule.max_weight) &&
    samePlace(rule.from_location, fromLocation) &&
    samePlace(rule.to_location, toLocation));
  const routeSpecific = matching.filter(rule => rule.from_location || rule.to_location);
  const candidates = routeSpecific.length ? routeSpecific : matching.filter(rule => !rule.from_location && !rule.to_location);
  return candidates.length === 1 ? candidates[0]?.amount ?? null : null;
}
