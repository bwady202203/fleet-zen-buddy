import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

const Body = z.object({
  event: z.enum(['salary_accrual', 'salary_payment', 'advance', 'violation']),
  employee_id: z.string().uuid().optional(),
  employee_number: z.string().min(1).max(50).optional(),
  amount: z.number().positive().max(100000000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500).optional(),
  reference: z.string().max(120).optional(),
  preview: z.boolean().optional(),
}).refine((b) => b.employee_id || b.employee_number, { message: 'employee_id or employee_number is required' })

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Auth: either x-api-key (HR_API_KEY secret) or a signed-in user's token
  const apiKey = req.headers.get('x-api-key')
  const expected = Deno.env.get('HR_API_KEY')
  let authorized = false
  if (apiKey && expected && apiKey === expected) authorized = true
  else {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (token) {
      const { data } = await admin.auth.getUser(token)
      authorized = Boolean(data.user)
    }
  }
  if (!authorized) return json({ error: 'Unauthorized' }, 401)

  let raw: unknown
  try { raw = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400)
  const b = parsed.data

  let employeeId = b.employee_id
  if (!employeeId) {
    const { data } = await admin.from('employees').select('id').eq('employee_number', b.employee_number!).maybeSingle()
    if (!data) return json({ error: 'Employee not found' }, 404)
    employeeId = data.id
  }

  const { data, error } = await admin.rpc('hr_post_journal', {
    p_event: b.event,
    p_employee_id: employeeId,
    p_amount: b.amount,
    p_date: b.date,
    p_description: b.description ?? null,
    p_reference: b.reference ? `api_${b.reference}` : null,
    p_preview: b.preview ?? false,
  })
  if (error) return json({ error: error.message }, 400)
  return json(data)
})
