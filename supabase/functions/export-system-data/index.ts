import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user has admin role
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Only admins can export system data");
    }

    // Fetch all system data
    const systemData: Record<string, any> = {
      metadata: {
        export_date: new Date().toISOString(),
        exported_by: user.email,
        system_name: "نظام إدارة الأسطول والشحنات",
      },
      schema: {},
      data: {},
    };

    // List of tables to export
    const tables = [
      "organizations",
      "profiles",
      "user_roles",
      "branches",
      "cost_centers",
      "projects",
      "chart_of_accounts",
      "companies",
      "company_driver_commissions",
      "company_load_type_prices",
      "company_settings",
      "drivers",
      "suppliers",
      "load_types",
      "loads",
      "load_invoices",
      "load_invoice_items",
      "payment_receipts",
      "driver_payments",
      "employees",
      "employee_transactions",
      "leaves",
      "vehicles",
      "mileage_records",
      "oil_change_records",
      "maintenance_requests",
      "spare_parts",
      "spare_parts_purchases",
      "stock_transactions",
      "custody_representatives",
      "custody_transfers",
      "custody_expenses",
      "custody_journal_entries",
      "invoices",
      "invoice_items",
      "journal_entries",
      "journal_entry_lines",
    ];

    // Fetch data from each table
    for (const table of tables) {
      try {
        const { data, error } = await supabaseClient.from(table).select("*");

        if (error) {
          console.error(`Error fetching ${table}:`, error);
          systemData.data[table] = {
            error: error.message,
            count: 0,
            records: [],
          };
        } else {
          systemData.data[table] = {
            count: data?.length || 0,
            records: data || [],
          };
        }

        // Get table schema information (skip for now as rpc not available)
        systemData.schema[table] = {
          note: "Schema information requires custom database function",
        };
      } catch (err) {
        console.error(`Failed to process table ${table}:`, err);
        systemData.data[table] = {
          error: "Failed to fetch",
          count: 0,
          records: [],
        };
      }
    }

    // Add summary statistics
    systemData.summary = {
      total_tables: tables.length,
      total_records: Object.values(systemData.data).reduce(
        (sum: number, table: any) => sum + (table.count || 0),
        0
      ),
      tables_with_errors: Object.values(systemData.data).filter(
        (table: any) => table.error
      ).length,
    };

    return new Response(JSON.stringify(systemData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
