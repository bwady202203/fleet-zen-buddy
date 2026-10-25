import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { canAccessSheet, findViolations, normalizeResidence, SHEET_ID } from "./lookup.ts";

// This private workspace sheet belongs to this account, not to every organization.
const OWNER_ID = "70791dfb-637c-49ec-bbd3-0b1d92c250c0";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
let cache: { values: unknown[][]; fetchedAt: number } | undefined;
const bodySchema = z.object({ residenceNumber: z.string().transform(normalizeResidence).pipe(z.string().regex(/^\d{10}$/, "أدخل رقم إقامة من 10 أرقام")) }).strict();

Deno.serve(async req => {
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "طريقة الطلب غير مدعومة" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anon) return json({ error: "إعدادات الاتصال غير متاحة" }, 503);
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "يلزم تسجيل الدخول" }, 401);
    const client = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await client.auth.getUser(authorization.slice(7));
    if (authError || !auth.user) return json({ error: "يلزم تسجيل الدخول" }, 401);
    const { data: isAdmin, error: roleError } = await client.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
    if (roleError || !canAccessSheet(auth.user.id, OWNER_ID, isAdmin === true)) return json({ error: "هذا الشيت متاح لحساب المسؤول الذي ربطه فقط" }, 403);
    let body: unknown;
    try { body = await req.json(); } catch { return json({ error: "بيانات البحث غير صحيحة" }, 400); }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return json({ error: "أدخل رقم إقامة صحيحًا من 10 أرقام" }, 400);
    const key = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!key || !lovableKey) return json({ error: "اتصال Google Sheets غير متاح" }, 503);
    if (!cache || Date.now() - cache.fetchedAt > 60_000) {
      const response = await fetch(`${GATEWAY_URL}/spreadsheets/${SHEET_ID}/values/الورقة1!A:AA`, { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": key } });
      if (!response.ok) {
        const details = await response.text();
        console.error(`Google Sheets [${response.status}]: ${details}`);
        return json({ error: "تعذر قراءة Google Sheets", status: response.status, details }, response.status);
      }
      const result = await response.json();
      cache = { values: result.values ?? [], fetchedAt: Date.now() };
    }
    return json({ ...findViolations(cache.values, parsed.data.residenceNumber), residenceNumber: parsed.data.residenceNumber, updatedAt: new Date(cache.fetchedAt).toISOString(), source: "جدول المخالفات" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "تعذر إتمام البحث" }, 500);
  }
});