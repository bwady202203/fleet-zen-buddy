import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { canUseCompanyDrive } from "./access.ts";

const BASE = "https://connector-gateway.lovable.dev/google_drive";
const schema = z.object({ action: z.enum(["list", "download"]), fileId: z.string().regex(/^[\w-]+$/).optional() }).strict();

Deno.serve(async req => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "طريقة الطلب غير مدعومة" }, 405);
  try {
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "يلزم تسجيل الدخول" }, 401);
    const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authorization } } });
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !data.user) return json({ error: "يلزم تسجيل الدخول" }, 401);
    const { data: admin, error: roleError } = await client.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
    if (roleError || !canUseCompanyDrive(data.user.id, admin === true)) return json({ error: "ملفات درايف متاحة لمسؤول حساب الشركة المرتبط فقط" }, 403);
    const { data: profile, error: profileError } = await client.from("user_organizations").select("organization_id").eq("user_id", data.user.id).limit(1).single();
    if (profileError || !profile?.organization_id) return json({ error: "لم يتم تحديد الشركة" }, 403);
    const org = profile.organization_id;
    const apiKey = Deno.env.get("GOOGLE_DRIVE_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey || !lovableKey) return json({ error: "اتصال جوجل درايف غير متاح" }, 503);
    const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": apiKey };
    const drive = async (path: string, init: RequestInit = {}) => {
      const response = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...init.headers } });
      if (!response.ok) {
        const details = await response.text();
        console.error(`Google Drive [${response.status}]: ${details}`);
        throw new Error(`[${response.status}]: ${details}`);
      }
      return response;
    };
    const filter = `trashed = false and appProperties has { key='wiseracc_org' and value='${org}' }`;
    if (req.headers.get("Content-Type")?.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File) || !file.name || file.size === 0 || file.size > 25 * 1024 * 1024) return json({ error: "اختر ملفًا لا يتجاوز 25 ميجابايت" }, 400);
      const folders = await (await drive(`/drive/v3/files?${new URLSearchParams({ q: `${filter} and mimeType='application/vnd.google-apps.folder'`, fields: "files(id)", pageSize: "1" })}`)).json();
      let folderId = folders.files?.[0]?.id;
      if (!folderId) {
        const folder = await (await drive("/drive/v3/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "ملفات شركة الرمال - WiserAcc", mimeType: "application/vnd.google-apps.folder", appProperties: { wiseracc_org: org } }) })).json();
        folderId = folder.id;
      }
      const boundary = `wiseracc_${crypto.randomUUID()}`;
      const metadata = { name: file.name.slice(0, 255), parents: [folderId], appProperties: { wiseracc_org: org } };
      const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`, file, `\r\n--${boundary}--\r\n`]);
      const uploaded = await (await drive("/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,mimeType,modifiedTime", { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body })).json();
      return json({ file: uploaded });
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "طلب غير صحيح" }, 400);
    if (parsed.data.action === "download") {
      if (!parsed.data.fileId) return json({ error: "اختر الملف" }, 400);
      const id = parsed.data.fileId;
      const meta = await (await drive(`/drive/v3/files/${id}?fields=name,mimeType,appProperties,trashed`)).json();
      if (meta.trashed || meta.appProperties?.wiseracc_org !== org || meta.mimeType === "application/vnd.google-apps.folder") return json({ error: "الملف غير متاح للشركة" }, 403);
      const file = await drive(`/drive/v3/files/${id}?alt=media`);
      return new Response(file.body, { headers: { ...corsHeaders, "Content-Type": "application/octet-stream", "Cache-Control": "no-store" } });
    }
    const files: unknown[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({ q: `${filter} and mimeType != 'application/vnd.google-apps.folder'`, fields: "nextPageToken,files(id,name,size,mimeType,modifiedTime)", pageSize: "1000", orderBy: "modifiedTime desc" });
      if (pageToken) params.set("pageToken", pageToken);
      const result = await (await drive(`/drive/v3/files?${params}`)).json();
      files.push(...(result.files ?? []));
      pageToken = result.nextPageToken;
    } while (pageToken);
    const quota = await (await drive("/drive/v3/about?fields=storageQuota")).json();
    return json({ files, quota: quota.storageQuota });
  } catch (error) {
    const details = error instanceof Error ? error.message : "تعذر الاتصال";
    const status = Number(details.match(/^\[(\d+)\]/)?.[1]) || 500;
    return json({ error: "تعذر تنفيذ عملية جوجل درايف", status, details }, status);
  }
});