// ZATCA E-Invoicing submission edge function
// Simulates the ZATCA Clearance/Reporting API. In production, replace the
// `submitToZatca` body with real calls to the official ZATCA endpoints
// (Compliance, Production CSID, Clearance, Reporting) using the merchant's
// PCSID + private key for signing the XML payload.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SubmitRequest {
  invoice_id: string;
  submission_type?: "clearance" | "reporting" | "compliance" | "validation";
}

const ZATCA_ENDPOINTS = {
  sandbox: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  simulation: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
  production: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
} as const;

async function submitToZatca(
  invoice: any,
  type: string,
  environment: keyof typeof ZATCA_ENDPOINTS,
) {
  // ============================================================
  // SIMULATION MODE
  // ------------------------------------------------------------
  // Real calls require a valid PCSID + signed XML in UBL 2.1.
  // We simulate ZATCA's response shape so the workflow is
  // testable end-to-end. To go live: build the signed XML in
  // the function (or pass it from the client), then POST to
  // `${ZATCA_ENDPOINTS[environment]}/invoices/clearance/single`
  // with headers Accept-Language, Accept-Version (V2),
  // Clearance-Status, Authorization (Basic base64(BinarySecurityToken:Secret)).
  // ============================================================

  const now = Date.now();

  // Validate required fields
  const errors: string[] = [];
  if (!invoice.seller_vat || !/^\d{15}$/.test(invoice.seller_vat))
    errors.push("الرقم الضريبي للبائع غير صحيح (يجب 15 رقم)");
  if (!invoice.invoice_number) errors.push("رقم الفاتورة مطلوب");
  if (!invoice.items || invoice.items.length === 0)
    errors.push("الفاتورة لا تحتوي على بنود");
  if (!invoice.total_with_tax || invoice.total_with_tax <= 0)
    errors.push("الإجمالي يجب أن يكون أكبر من صفر");

  if (errors.length > 0) {
    return {
      status_code: 400,
      result: "error",
      message: "فشل التحقق من الفاتورة قبل الإرسال",
      errors: errors.map((e) => ({ code: "VALIDATION", message: e })),
      warnings: [],
      duration_ms: Date.now() - now,
    };
  }

  // Simulate latency
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));

  // Simulate occasional warnings
  const warnings: any[] = [];
  if (!invoice.buyer_vat && invoice.invoice_type === "standard") {
    warnings.push({
      code: "BR-KSA-EN16931-09",
      message: "الفاتورة الضريبية يفضل أن تحتوي على رقم ضريبي للمشتري",
    });
  }

  const zatcaUuid = crypto.randomUUID();
  const acceptedStatus = type === "clearance" ? "CLEARED" : "REPORTED";

  return {
    status_code: 200,
    result: warnings.length > 0 ? "warning" : "success",
    message:
      type === "clearance"
        ? `تم تخليص الفاتورة بنجاح (${acceptedStatus})`
        : `تم الإبلاغ عن الفاتورة بنجاح (${acceptedStatus})`,
    errors: [],
    warnings,
    zatca_uuid: zatcaUuid,
    cleared_invoice: btoa(`<?xml version="1.0"?><ClearedInvoice uuid="${zatcaUuid}"/>`),
    qr_code: invoice.qr_base64 || null,
    duration_ms: Date.now() - now,
    environment,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Auth check
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SubmitRequest = await req.json();
    if (!body.invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Load invoice
    const { data: invoice, error: invErr } = await admin
      .from("zatca_invoices")
      .select("*")
      .eq("id", body.invoice_id)
      .maybeSingle();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const submissionType =
      body.submission_type ??
      (invoice.invoice_type === "simplified" ? "reporting" : "clearance");
    const environment = (invoice.environment || "sandbox") as keyof typeof ZATCA_ENDPOINTS;

    // Call ZATCA (simulated)
    const result = await submitToZatca(invoice, submissionType, environment);

    // Log submission
    await admin.from("zatca_submissions").insert({
      invoice_id: invoice.id,
      organization_id: invoice.organization_id,
      submission_type: submissionType,
      environment,
      request_payload: { invoice_uuid: invoice.invoice_uuid, icv: invoice.icv },
      response_payload: result,
      status_code: result.status_code,
      result: result.result,
      message: result.message,
      warnings: result.warnings,
      errors: result.errors,
      zatca_uuid: result.zatca_uuid ?? null,
      cleared_invoice: result.cleared_invoice ?? null,
      qr_code: result.qr_code ?? null,
      duration_ms: result.duration_ms,
      created_by: userData.user.id,
    });

    // Update invoice status
    const newStatus =
      result.result === "error"
        ? "rejected"
        : result.result === "warning"
        ? "warning"
        : submissionType === "clearance"
        ? "cleared"
        : "reported";

    await admin
      .from("zatca_invoices")
      .update({
        status: newStatus,
        zatca_uuid: result.zatca_uuid ?? invoice.zatca_uuid,
        zatca_response: result,
        rejection_reason: result.result === "error" ? result.message : null,
        cleared_at: newStatus === "cleared" ? new Date().toISOString() : invoice.cleared_at,
        reported_at: newStatus === "reported" ? new Date().toISOString() : invoice.reported_at,
      })
      .eq("id", invoice.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("zatca-submit error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
