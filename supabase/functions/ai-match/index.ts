import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function sanitizeProfile(profile: Record<string, unknown>) {
  const privateKeys = new Set(["email", "line", "contact", "phone", "address"]);
  const profileData = Object.fromEntries(
    Object.entries((profile.profile_data as Record<string, unknown>) || {})
      .filter(([key, value]) => !privateKeys.has(key) && value !== "")
      .map(([key, value]) => [key, String(value).slice(0, 300)])
  );
  return {
    id: profile.id,
    display_name: String(profile.display_name || "").slice(0, 100),
    role: profile.role,
    profile_data: profileData,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ message: "Method not allowed" }, 405);

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return json({ message: "Gemini 尚未完成設定，已使用一般媒合排序。" }, 503);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ message: "請先登入" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ message: "登入狀態已失效" }, 401);

  const { data: credit, error: creditError } = await supabase
    .rpc("consume_ai_match_credit", { max_daily: 5 })
    .single();
  if (creditError) return json({ message: "AI 使用次數檢查失敗" }, 500);
  if (!credit.allowed) return json({ message: "今天的 5 次免費 AI 分析已用完，已使用一般排序。" }, 429);

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("id,display_name,role,profile_data")
    .eq("id", user.id)
    .maybeSingle();
  if (!ownProfile) return json({ message: "請先完成個人頁" }, 400);

  const targetRole = ownProfile.role === "creator" ? "brand" : "creator";
  const { data: candidates, error: candidateError } = await supabase
    .rpc("get_match_profiles", { requested_role: targetRole });
  if (candidateError) return json({ message: "無法讀取媒合資料" }, 500);

  const body = await request.json().catch(() => ({}));
  const payload = {
    user: sanitizeProfile(ownProfile),
    filters: body.filters || {},
    candidates: (candidates || []).slice(0, 12).map(sanitizeProfile),
  };
  if (!payload.candidates.length) {
    return json({ rankings: [], remaining: credit.remaining, source: "gemini" });
  }

  const prompt = `你是台灣 KOL 與品牌合作媒合分析器。
根據雙方公開資料、合作領域、平台、受眾、預算與合作方式，為每位候選人評分。
只回傳 JSON 陣列，每筆格式為 {"id":"候選人 id","score":0到100整數,"reason":"繁體中文，35字內的具體原因"}。
不可加入不存在的資訊，不可因粉絲數單一因素給高分，不要輸出 Markdown。

資料：
${JSON.stringify(payload)}`;

  const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.1-flash-lite";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    console.error("Gemini error", response.status, details);
    return json({ message: "Gemini 免費額度暫時無法使用，已使用一般排序。" }, 503);
  }

  const result = await response.json();
  const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  try {
    const rankings = JSON.parse(content)
      .filter((item: Record<string, unknown>) =>
        payload.candidates.some((candidate) => candidate.id === item.id)
      )
      .map((item: Record<string, unknown>) => ({
        id: item.id,
        score: Math.max(0, Math.min(100, Number(item.score) || 0)),
        reason: String(item.reason || "").slice(0, 90),
      }));
    return json({ rankings, remaining: credit.remaining, source: "gemini" });
  } catch {
    return json({ message: "AI 回傳格式異常，已使用一般排序。" }, 503);
  }
});
