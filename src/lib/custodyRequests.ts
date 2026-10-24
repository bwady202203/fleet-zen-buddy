import { supabase } from "@/integrations/supabase/client";

export interface CustodyRequestRecord {
  id: string;
  request_number: string;
  request_date: string;
  amount: number;
  created_at: string;
}

export async function fetchCustodyRequests(organizationId: string) {
  const records: CustodyRequestRecord[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("custody_requests")
      .select("id, request_number, request_date, amount, created_at")
      .eq("organization_id", organizationId)
      .order("request_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    records.push(...(data || []));
    if (!data || data.length < 1000) return records;
  }
}

export async function saveCustodyRequest(organizationId: string, amount: number, date: string) {
  const { data, error } = await supabase.from("custody_requests")
    .insert({ organization_id: organizationId, amount, request_date: date, request_number: "" })
    .select("id, request_number, request_date, amount, created_at")
    .single();
  if (error) throw error;
  return data;
}