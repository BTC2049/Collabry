# Gemini AI 免費版設定

Collabry 採用「規則媒合為基礎、Gemini 手動加強排序」的方式：

- 不按 AI 按鈕時完全不消耗 Gemini 額度。
- 每位會員每天最多使用 5 次。
- 每次最多比較 12 位候選人。
- Gemini 無法使用時自動保留原本排序。
- Email、LINE、聯絡人、電話與地址不會傳給 Gemini。

## 1. 建立免費 Gemini API Key

1. 前往 Google AI Studio：<https://aistudio.google.com/apikey>
2. 建立 API Key。
3. 初期不要在 Google Cloud 綁定付費帳單。
4. 不要把 Key 放進 `supabase-config.js` 或 GitHub。

## 2. 更新 Supabase 資料庫

到 Supabase Dashboard > SQL Editor，重新執行最新版 `supabase-setup.sql`。

這會建立：

- `ai_match_usage` 每日使用次數表
- `consume_ai_match_credit()` 免費額度保護函式
- 智慧媒合資料的私人欄位過濾

## 3. 建立 Edge Function

1. 到 Supabase Dashboard > Edge Functions。
2. 建立名為 `ai-match` 的 Function。
3. 將 `supabase/functions/ai-match/index.ts` 的內容完整貼上。
4. 部署 Function，維持 JWT 驗證開啟。

## 4. 儲存 Gemini Secret

到 Supabase Dashboard > Edge Functions > Secrets，新增：

```text
GEMINI_API_KEY=你的 Gemini API Key
GEMINI_MODEL=gemini-3.1-flash-lite
```

`SUPABASE_URL` 與 `SUPABASE_ANON_KEY` 由 Supabase Edge Functions 自動提供，不必自行新增。

## 5. 更新 GitHub Pages

將整個 `collabry` 資料夾更新至 GitHub。登入後進入智慧媒合頁，按「AI 智慧排序」即可測試。

## 免費版注意事項

Gemini Developer API 免費層的請求內容可能被 Google 用於改善產品，因此目前只傳送公開合作資料。未來開始收費後，可以改為付費層並提高每日次數、候選人數量與資料隱私等級。
