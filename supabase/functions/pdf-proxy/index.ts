import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ALLOWED_HOSTS = ["pmbrwjvvkbzbaxevgukd.supabase.co", "drive.google.com", "docs.google.com"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return new Response("Unauthorized", { status: 401, headers: cors });
    const { url } = await req.json();
    const target = new URL(String(url));
    if (target.protocol !== "https:" || !ALLOWED_HOSTS.includes(target.hostname)) return new Response("Host not allowed", { status: 400, headers: cors });
    const r = await fetch(target.toString(), { redirect: "follow" });
    if (!r.ok) return new Response(`Upstream ${r.status}`, { status: 502, headers: cors });
    return new Response(r.body, { headers: { ...cors, "Content-Type": r.headers.get("content-type") || "application/pdf" } });
  } catch (e) {
    return new Response(String((e as Error).message), { status: 500, headers: cors });
  }
});
