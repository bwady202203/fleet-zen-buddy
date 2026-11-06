import { corsHeaders as baseCors } from 'npm:@supabase/supabase-js@2/cors';

const corsHeaders = { ...baseCors, 'Access-Control-Allow-Headers': `${baseCors['Access-Control-Allow-Headers']}, x-api-key` };
const BASE = 'https://pmbrwjvvkbzbaxevgukd.supabase.co/rest/v1/shipments';
// publishable (anon) key of the crusher program
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtYnJ3anZ2a2J6YmF4ZXZndWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDY5MjcsImV4cCI6MjA3NjA4MjkyN30.nV8uZvEY3R8SkDtuWZI0V4U1KC5RQwcQECvBIEkBXFE';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'GET only' }, 405);
  const expected = Deno.env.get('FLEET_REPORT_API_KEY') ?? '';
  if (!expected || !safeEqual(req.headers.get('x-api-key') ?? '', expected)) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(req.url);
  const yesterday = new Date(Date.now() + 3 * 3600_000 - 86400_000).toISOString().slice(0, 10);
  const from = url.searchParams.get('from') ?? url.searchParams.get('date') ?? yesterday;
  const to = url.searchParams.get('to') ?? url.searchParams.get('date') ?? from;
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) return json({ error: 'dates must be YYYY-MM-DD and from <= to' }, 400);
  const next = new Date(to + 'T00:00:00Z');
  next.setUTCDate(next.getUTCDate() + 1);
  const nextStr = next.toISOString().slice(0, 10);

  try {
    const key = Deno.env.get('CRUSHER_REPORT_KEY')!;
    const select = 'shipment_number,entry_date,company_name,client_name,driver_name,supplier_name,net_weight,invoice_number,invoice_value,material_types(name)';
    const rows: any[] = [];
    for (let offset = 0; ; offset += 1000) {
      const r = await fetch(`${BASE}?select=${select}&entry_date=gte.${from}&entry_date=lt.${nextStr}&order=entry_date.asc&limit=1000&offset=${offset}`,
        { headers: { apikey: ANON, 'x-report-key': key } });
      if (!r.ok) return json({ error: `crusher source ${r.status}` }, 502);
      const page = await r.json();
      rows.push(...page);
      if (page.length < 1000) break;
    }
    const shipments = rows.map(({ material_types, ...s }) => ({ ...s, material: material_types?.name ?? null }));
    const group = (k: string) => {
      const m: Record<string, { count: number; net_weight: number }> = {};
      for (const s of shipments) {
        const n = s[k] ?? 'غير محدد';
        m[n] ??= { count: 0, net_weight: 0 };
        m[n].count++; m[n].net_weight += Number(s.net_weight || 0);
      }
      return m;
    };
    return json({
      from, to,
      summary: {
        shipments_count: shipments.length,
        total_net_weight_kg: shipments.reduce((a, s) => a + Number(s.net_weight || 0), 0),
        by_material: group('material'), by_client: group('client_name'), by_driver: group('driver_name'),
      },
      shipments,
    });
  } catch {
    return json({ error: 'Failed to load crusher report' }, 500);
  }
});
