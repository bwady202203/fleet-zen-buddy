import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://pmbrwjvvkbzbaxevgukd.supabase.co/rest/v1/shipments";
// publishable (anon) key of the crusher program
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtYnJ3anZ2a2J6YmF4ZXZndWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDY5MjcsImV4cCI6MjA3NjA4MjkyN30.nV8uZvEY3R8SkDtuWZI0V4U1KC5RQwcQECvBIEkBXFE";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);

    const { from, to } = await req.json();
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) return json({ error: "invalid dates" }, 400);
    const next = new Date(to + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    const nextStr = next.toISOString().slice(0, 10);
    const key = Deno.env.get("CRUSHER_REPORT_KEY")!;
    const select =
      "id,shipment_number,entry_date,company_name,client_name,driver_name,supplier_name,net_weight,invoice_number,invoice_value,material_types(name)";
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 1000) {
      const url = `${BASE}?select=${select}&entry_date=gte.${from}&entry_date=lt.${nextStr}&order=entry_date.desc&limit=1000&offset=${offset}`;
      const r = await fetch(url, { headers: { apikey: ANON, "x-report-key": key } });
      if (!r.ok) return json({ error: `crusher api ${r.status}` }, 502);
      const page = await r.json();
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return json({ shipments: rows });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
