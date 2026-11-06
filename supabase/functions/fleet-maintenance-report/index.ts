import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders as baseCors } from 'npm:@supabase/supabase-js@2/cors';

const corsHeaders = { ...baseCors, 'Access-Control-Allow-Headers': `${baseCors['Access-Control-Allow-Headers']}, x-api-key` };
const ORG_ID = '8449f832-4c11-4f27-b650-294106680b15';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } });

function riyadhDate(offsetDays: number) {
  const d = new Date(Date.now() + 3 * 3600_000 + offsetDays * 86400_000);
  return d.toISOString().slice(0, 10);
}

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
  const given = req.headers.get('x-api-key') ?? '';
  if (!expected || !safeEqual(given, expected)) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(req.url);
  const dateParam = url.searchParams.get('date');
  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return json({ error: 'date must be YYYY-MM-DD' }, 400);
  const date = dateParam ?? riyadhDate(-1);
  // Riyadh day boundaries in UTC
  const start = new Date(`${date}T00:00:00+03:00`).toISOString();
  const end = new Date(new Date(`${date}T00:00:00+03:00`).getTime() + 86400_000).toISOString();

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const [vehRes, reqRes, oilRes] = await Promise.all([
    sb.from('vehicles').select('id, license_plate, model, driver_name, status, current_mileage').eq('organization_id', ORG_ID),
    sb.from('maintenance_requests').select('id, vehicle_id, description, priority, status, cost, completed_date, created_at')
      .eq('organization_id', ORG_ID).gte('created_at', start).lt('created_at', end).order('created_at'),
    sb.from('oil_change_records').select('id, vehicle_id, mileage, date, cost, performed_by, notes')
      .eq('organization_id', ORG_ID).eq('date', date),
  ]);
  if (vehRes.error || reqRes.error || oilRes.error) return json({ error: 'Failed to load data' }, 500);

  const reqIds = (reqRes.data ?? []).map((r) => r.id);
  let items: any[] = [];
  if (reqIds.length) {
    const { data, error } = await sb.from('maintenance_cost_items')
      .select('maintenance_request_id, item_name, item_type, quantity, unit_price, total_price, notes')
      .in('maintenance_request_id', reqIds);
    if (error) return json({ error: 'Failed to load items' }, 500);
    items = data ?? [];
  }

  const vMap = new Map((vehRes.data ?? []).map((v) => [v.id, v]));
  const veh = (id: string) => {
    const v = vMap.get(id);
    return v ? { plate: v.license_plate, model: v.model, driver: v.driver_name } : null;
  };

  const maintenance = (reqRes.data ?? []).map((r) => {
    const its = items.filter((i) => i.maintenance_request_id === r.id);
    const itemsTotal = its.reduce((s, i) => s + Number(i.total_price || 0), 0);
    return {
      id: r.id, vehicle: veh(r.vehicle_id), description: r.description, priority: r.priority,
      status: r.status, cost: Number(r.cost || 0) || itemsTotal, completed_date: r.completed_date,
      created_at: r.created_at,
      items: its.map(({ maintenance_request_id, ...i }) => i),
    };
  });
  const oil = (oilRes.data ?? []).map((o) => ({ ...o, vehicle: veh(o.vehicle_id), vehicle_id: undefined }));

  return json({
    date,
    summary: {
      maintenance_count: maintenance.length,
      maintenance_cost: Math.round(maintenance.reduce((s, m) => s + m.cost, 0) * 100) / 100,
      vehicles_serviced: new Set(maintenance.map((m) => m.vehicle?.plate).filter(Boolean)).size,
      oil_changes: oil.length,
      oil_cost: Math.round(oil.reduce((s, o) => s + Number(o.cost || 0), 0) * 100) / 100,
      total_vehicles: vehRes.data?.length ?? 0,
    },
    maintenance,
    oil_changes: oil,
  });
});
