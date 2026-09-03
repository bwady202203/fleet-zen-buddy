const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 مطلوب" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح الذكاء الاصطناعي غير مهيأ" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `أنت مساعد محاسبي. استخرج بيانات إشعار التحويل/الدفع البنكي من الصورة وأعد JSON فقط بهذا الشكل بدون أي شرح:
{
  "reference_number": "الرقم المرجعي",
  "doc_date": "yyyy-mm-dd (تاريخ التنفيذ)",
  "amount": رقم بدون فواصل,
  "beneficiary_name": "الاسم الكامل للمستفيد (الى)",
  "sender_name": "الاسم الكامل للمُرسل (من)",
  "account_number": "رقم حساب المستفيد",
  "notes": "الملاحظات"
}
إذا كان التاريخ بصيغة dd/mm/yyyy فحوّله إلى yyyy-mm-dd. إن لم تجد قيمة اجعلها null.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI gateway error", res.status, text);
      let message = "فشل تحليل الصورة";
      if (res.status === 429) message = "تم تجاوز حد الطلبات، حاول بعد قليل";
      if (res.status === 402) message = "لا يوجد رصيد كافٍ للذكاء الاصطناعي";
      return new Response(JSON.stringify({ error: message, details: text }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    let parsed: Record<string, unknown> = {};
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch (_e) {
        parsed = {};
      }
    }

    return new Response(JSON.stringify({ data: parsed, raw }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
