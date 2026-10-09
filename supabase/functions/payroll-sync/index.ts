import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

const BASE = 'https://zxvckedthgpjipdejcwa.supabase.co/functions/v1/accounting-api'

const Body = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  post: z.boolean().optional(),
  sync_employees: z.boolean().optional(),
  only_refs: z.array(z.string().max(200)).max(2000).optional(),
})

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

type Item = { ref: string; event: string; label: string; employee_name: string; iqama: string; amount: number; date: string; description: string; employee_id?: string | null; status?: string; entry_number?: string; error?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: u } = token ? await admin.auth.getUser(token) : { data: { user: null } }
  if (!u.user) return json({ error: 'Unauthorized' }, 401)

  const key = Deno.env.get('PAYROLL_SYNC_API_KEY') || Deno.env.get('PAYROLL_API_KEY')
  if (!key) return json({ error: 'missing_key', message: 'لم يتم إدخال مفتاح برنامج الرواتب بعد' }, 400)

  let raw: unknown = {}
  try { raw = await req.json() } catch { /* empty */ }
  const p = Body.safeParse(raw)
  if (!p.success) return json({ error: p.error.flatten() }, 400)
  const b = p.data

  const get = async (type: string, params: Record<string, string | undefined>) => {
    const q = new URLSearchParams({ type })
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
    const r = await fetch(`${BASE}?${q}`, { headers: { 'x-api-key': key } })
    if (!r.ok) throw new Error(`${type}: ${r.status} ${await r.text()}`)
    return (await r.json()).data ?? []
  }

  const items: Item[] = []
  try {
    const range = { from: b.from, to: b.to }
    const mY = { month: b.month?.toString(), year: b.year?.toString() }
    const [adv, vio, appr, disb] = await Promise.all([
      get('advances', range), get('violations', range), get('payroll-approved', mY), get('payroll-disbursed', mY),
    ])
    for (const a of adv) items.push({ ref: `ext_adv_${a.id}`, event: 'advance', label: 'صرف سلفة', employee_name: a.employee_name, iqama: a.iqama_number ?? '', amount: Number(a.amount), date: a.date, description: a.notes || 'سلفة من برنامج الرواتب' })
    for (const v of vio) items.push({ ref: `ext_vio_${v.id}`, event: 'violation', label: 'مخالفة', employee_name: v.employee_name, iqama: v.iqama_number ?? '', amount: Number(v.violation_amount), date: v.violation_date, description: `مخالفة ${v.violation_number ?? ''} ${v.violation_reason ?? ''}`.trim() })
    const sheetItems = (sheets: any[], kind: 'acc' | 'pay') => {
      for (const s of sheets) {
        const date = String((kind === 'acc' ? s.approved_at : s.disbursed_at) ?? `${s.year}-${String(s.month).padStart(2, '0')}-28`).slice(0, 10)
        for (const it of s.items ?? []) {
          const amount = kind === 'acc' ? Number(it.total_salary || 0) + Number(it.bonuses || 0) : Number(it.net_salary || 0)
          items.push({
            ref: `ext_${kind}_${s.sheet_number ?? s.id}_${it.employee_id ?? it.iqama_number}`,
            event: kind === 'acc' ? 'salary_accrual' : 'salary_payment',
            label: kind === 'acc' ? 'إثبات راتب' : 'صرف راتب',
            employee_name: it.employee_name ?? '', iqama: it.iqama_number ?? '', amount, date,
            description: `${kind === 'acc' ? 'استحقاق' : 'صرف'} راتب ${s.month}/${s.year} - كشف ${s.sheet_number ?? ''}`,
          })
        }
      }
    }
    sheetItems(appr, 'acc'); sheetItems(disb, 'pay')
  } catch (e) {
    return json({ error: 'fetch_failed', message: e instanceof Error ? e.message : String(e) }, 502)
  }

  // match employees by iqama, then name
  const { data: emps } = await admin.from('employees').select('id, name, residence_number, national_id')
  const byIqama = new Map<string, string>(), byName = new Map<string, string>()
  for (const e of emps ?? []) {
    if (e.residence_number) byIqama.set(String(e.residence_number).trim(), e.id)
    if (e.national_id) byIqama.set(String(e.national_id).trim(), e.id)
    byName.set(String(e.name).trim(), e.id)
  }
  const { data: done } = await admin.from('journal_entries').select('reference, entry_number').in('reference', items.map((i) => i.ref).slice(0, 1000))
  const doneMap = new Map((done ?? []).map((d) => [d.reference, d.entry_number]))

  for (const it of items) {
    it.employee_id = byIqama.get(it.iqama.trim()) ?? byName.get(it.employee_name.trim()) ?? null
    if (doneMap.has(it.ref)) { it.status = 'posted_before'; it.entry_number = doneMap.get(it.ref)!; continue }
    if (!it.employee_id) { it.status = 'no_employee'; continue }
    if (!(it.amount > 0)) { it.status = 'zero'; continue }
    it.status = 'ready'
    if (b.post && (!b.only_refs || b.only_refs.includes(it.ref))) {
      const { data, error } = await admin.rpc('hr_post_journal', {
        p_event: it.event, p_employee_id: it.employee_id, p_amount: it.amount, p_date: it.date,
        p_description: it.description, p_reference: it.ref, p_preview: false,
      })
      if (error) { it.status = 'error'; it.error = error.message } else { it.status = 'posted'; it.entry_number = (data as any)?.entry_number }
    }
  }
  return json({ count: items.length, items })
})
