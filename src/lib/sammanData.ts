import { supabase } from "@/integrations/supabase/client";

/** Reads/writes Al-Samman's dedicated tables and maps them to the shared crusher screen shapes. */
const db = supabase as any;

async function fetchAll(build: (from: number, to: number) => any) {
  const out: any[] = []; const size = 1000;
  for (let i = 0; ; i += size) {
    const { data, error } = await build(i, i + size - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < size) break;
  }
  return out;
}

const SHIP_SELECT = "*, material:samman_material_types(name), client:samman_clients(name), driver:samman_drivers(driver_name), supplier:samman_suppliers(name), company:samman_companies(name)";

export function mapShipment(s: any) {
  return {
    ...s,
    doc_number: s.document_number,
    entry_at: s.entry_date,
    exit_at: s.exit_date,
    material_type: s.material?.name ?? null,
    client_name: s.client?.name ?? s.client_name,
    driver_name: s.driver?.driver_name ?? s.driver_name,
    supplier_name: s.supplier?.name ?? s.supplier_name,
    establishment: s.company?.name ?? s.company_name,
    serial_number: s.serial_code,
    previous_serial: s.previous_serial_code,
  };
}

export async function listSammanShipments(fromDate: string, toDate: string) {
  const rows = await fetchAll((a, b) => db.from("samman_shipments").select(SHIP_SELECT)
    .gte("entry_date", `${fromDate}T00:00:00`).lte("entry_date", `${toDate}T23:59:59`)
    .order("document_number", { ascending: false }).range(a, b));
  return rows.map(mapShipment);
}

export const deleteSammanShipment = (id: string) => db.from("samman_shipments").delete().eq("id", id);

export const SAMMAN_KINDS: Record<string, { table: string; name: string; extra: string | null }> = {
  driver: { table: "samman_drivers", name: "driver_name", extra: "vehicle_number" },
  serial: { table: "samman_serial_numbers", name: "serial_code", extra: "status" },
  company: { table: "samman_companies", name: "name", extra: "registration_number" },
  supplier: { table: "samman_suppliers", name: "name", extra: "phone" },
  client: { table: "samman_clients", name: "name", extra: "phone" },
  material: { table: "samman_material_types", name: "name", extra: null },
};
const STATUS: Record<string, string> = { available: "متاح", used: "مستخدم", cancelled: "ملغي" };

export async function listSammanLookup(kind: string) {
  const k = SAMMAN_KINDS[kind];
  const rows = await fetchAll((a, b) => db.from(k.table).select("*").order("created_at", { ascending: false }).range(a, b));
  return rows.map((r) => ({ id: r.id, name: r[k.name], extra: k.extra ? (kind === "serial" ? STATUS[r.status] || r.status : r[k.extra]) : null, raw: r }));
}

export function addSammanLookup(kind: string, orgId: string, name: string, extra: string | null) {
  const k = SAMMAN_KINDS[kind];
  const row: any = { organization_id: orgId, [k.name]: name };
  if (k.extra && kind !== "serial" && extra) row[k.extra] = extra;
  return db.from(k.table).insert(row);
}

export const deleteSammanLookup = (kind: string, id: string) => db.from(SAMMAN_KINDS[kind].table).delete().eq("id", id);

async function findOrCreate(kind: string, orgId: string, name: string | null) {
  if (!name) return null;
  const k = SAMMAN_KINDS[kind];
  const { data } = await db.from(k.table).select("id").eq(k.name, name).limit(1);
  if (data?.[0]) return data[0].id;
  const { data: ins, error } = await db.from(k.table).insert({ organization_id: orgId, [k.name]: name }).select("id").single();
  if (error) throw error;
  return ins.id;
}

export async function saveSammanShipment(orgId: string, userId: string | null, v: any) {
  const prev = (v.previous_serial as string).trim();
  const { data: dup } = await db.from("samman_shipments").select("id").eq("previous_serial_code", prev).limit(1);
  if (dup?.length) throw new Error(`السريال ${prev} مُدخل سابقًا في فاتورة أخرى — أدخل سريالًا لم يُستخدم من قبل`);
  const next = await generateSammanSerial();
  const [company_id, client_id, supplier_id, material_type_id, driver_id, previous_serial_id, serial_id] = await Promise.all([
    findOrCreate("company", orgId, v.establishment), findOrCreate("client", orgId, v.client_name),
    findOrCreate("supplier", orgId, v.supplier_name), findOrCreate("material", orgId, v.material_type),
    findOrCreate("driver", orgId, v.driver_name), findOrCreate("serial", orgId, prev), findOrCreate("serial", orgId, next),
  ]);
  const { data, error } = await db.from("samman_shipments").insert({
    organization_id: orgId, company_id, client_id, supplier_id, material_type_id, driver_id, previous_serial_id, serial_id,
    entry_date: v.entry_at, exit_date: v.exit_at, shipment_number: v.shipment_number, kilometers: v.kilometers,
    invoice_number: v.invoice_number, invoice_value: v.invoice_value, invoice_pdf_path: v.invoice_pdf_path,
    empty_weight: v.empty_weight, full_weight: v.full_weight, client_name: v.client_name, driver_name: v.driver_name,
    supplier_name: v.supplier_name, company_name: v.establishment, serial_code: next, previous_serial_code: prev, created_by: userId,
  }).select("id").single();
  if (error) throw error;
  await db.from("samman_serial_numbers").update({ status: "used", used_at: new Date().toISOString(), used_by_shipment_id: data.id }).eq("id", serial_id);
  return { serial_number: next };
}

/** Random unique 8-digit serial not present in shipments or the serial pool. */
export async function generateSammanSerial(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const c = String(10000000 + Math.floor(Math.random() * 90000000));
    const [a, b] = await Promise.all([
      db.from("samman_shipments").select("id").or(`serial_code.eq.${c},previous_serial_code.eq.${c}`).limit(1),
      db.from("samman_serial_numbers").select("id").eq("serial_code", c).limit(1),
    ]);
    if (!a.data?.length && !b.data?.length) return c;
  }
  throw new Error("تعذر توليد سريال جديد");
}

/** Serial generated by the latest shipment — to be entered on the next invoice. */
export async function getLastSammanSerial(): Promise<string> {
  const { data } = await db.from("samman_shipments").select("serial_code").order("created_at", { ascending: false }).limit(1);
  return data?.[0]?.serial_code || "";
}

/** Driver of the shipment that generated (or previously used) this serial. */
export async function getSammanDriverBySerial(code: string): Promise<string> {
  const c = code.trim();
  if (!/^\d{8,}$/.test(c)) return "";
  const { data } = await db.from("samman_shipments").select("driver_name").or(`serial_code.eq.${c},previous_serial_code.eq.${c}`).not("driver_name", "is", null).order("created_at", { ascending: false }).limit(1);
  return data?.[0]?.driver_name || "";
}
