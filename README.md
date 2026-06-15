# Collabry

一個專注於中小型 KOL 與成長品牌的簡單媒合平台原型。

## 品牌定位

- 核心句：讓適合的合作，更快發生。
- 品牌端：更快找到受眾與調性契合的創作者。
- 創作者端：獲得更穩定、更透明的品牌合作機會。
- 差異化：不以粉絲數為唯一標準，而是重視受眾、內容調性與合作意願。

## 目前原型

- 響應式首頁
- 創作者獨立展示與分類頁
- 品牌獨立展示與分類頁
- 智慧媒合、條件篩選與契合度結果頁
- 全站右上角展開式收納選單
- 品牌與創作者登入後的獨立個人頁
- 個人資料編輯、即時預覽、完成度與本機儲存
- 品牌／創作者身分選擇
- Email 蒐集表單
- Google 登入入口原型
- 媒合結果預覽

直接用瀏覽器開啟 `index.html` 即可預覽。

## 真實 Google 登入設定

網站使用 Supabase Auth，適合後續直接加入會員資料、品牌／創作者檔案及媒合紀錄。

1. 在 Supabase 建立 Free 專案。
2. 到 Authentication > Providers > Google 啟用 Google，填入 Google OAuth Client ID 與 Secret。
3. 到 Google Auth Platform 建立 Web OAuth Client：
   - Authorized JavaScript origins：加入 GitHub Pages 網站的 origin，例如 `https://username.github.io`
   - Authorized redirect URI：填入 Supabase Google Provider 頁顯示的 callback URL。
4. 到 Supabase Authentication > URL Configuration：
   - Site URL：`https://btc2049.github.io/Collabry/`
   - Redirect URLs：加入 `https://btc2049.github.io/Collabry/**`
5. 到 Project Settings > Data API 複製 Project URL 與 Publishable Key，填入 `supabase-config.js`。

Google OAuth 無法在 `file://` 網址執行。登入成功後會依使用者選擇的身分，導向品牌或創作者個人頁。

## 管理後台

1. 到 Supabase Dashboard > SQL Editor。
2. 開啟 `supabase-setup.sql`，將檔案底部的 `YOUR_ADMIN_EMAIL@example.com` 換成管理員 Google Email。
3. 執行整份 SQL。
4. 重新登入網站後，帳號選單會出現「管理後台」。

管理後台位於 `admin.html`，只有 `is_admin = true` 的帳號能讀取會員資料。支援搜尋會員與匯出 Excel 可直接開啟的 UTF-8 CSV。

## 頭像與品牌 Logo

創作者與品牌個人頁支援 JPG、PNG、WebP 原始圖片。瀏覽器會縮放至最大 512×512、轉為 WebP 並壓縮至約 250 KB 以下，再覆蓋會員自己的固定檔案。1,000 位會員約使用 250 MB Storage，低於免費方案的 1 GB 額度。

更新此功能後，需再次到 Supabase SQL Editor 執行最新版 `supabase-setup.sql`，建立 Storage bucket、圖片權限與 `avatar_url` 欄位。

## 真實合作邀請

媒合頁只顯示已登入且完成個人頁的真實相反角色會員。送出合作興趣後會建立 `collaboration_requests` 紀錄，收件方可在 `requests.html` 接受或婉拒，雙方都能查看狀態。

啟用此功能需再次執行最新版 `supabase-setup.sql`，建立邀請資料表、RLS 規則與安全查詢函式。

## 個人頁發布流程

個人頁預設為草稿，所有欄位皆可留白。使用者可以儲存草稿、預覽、發布、更新後重新發布，或隨時下架。

分類頁只會公開已發布資料，並透過安全函式移除 Email、LINE 與聯絡人等私人欄位。

1. 在「我的個人頁」切換品牌頁或創作者頁。
2. 填寫需要的內容後按「儲存草稿」。
3. 按「預覽公開頁」檢查訪客看到的獨立介紹頁。
4. 按「發布品牌頁」或「發布創作者頁」正式公開。
5. 公開後會出現在分類與智慧媒合中，也可隨時按「下架」停止曝光。

品牌與創作者分類頁目前各有 18 組分類、文字搜尋與自訂分類輸入。

更新這一版時，請重新在 Supabase SQL Editor 執行 `supabase-setup.sql`，再將整個 `collabry` 資料夾更新至 GitHub Pages。

## SEO 與示範資料

- 首頁、品牌與創作者探索頁已加入搜尋描述、Canonical、Open Graph 與結構化資料。
- `sitemap.xml` 可提交到 Google Search Console。
- `robots.txt` 排除管理後台、邀請與個人編輯頁。
- 品牌與創作者探索頁會補上示範帳戶，避免平台初期過於空白；示範帳戶有清楚標示且不接受真實邀請。
- 公開真實會員頁的「送出合作興趣」會直接建立站內邀請，不再只是跳轉頁面。
- Google Search Console 的驗證、Sitemap 與要求建立索引步驟請見 `GOOGLE-INDEXING.md`。

## Gemini AI 智慧媒合

智慧媒合頁支援手動啟動 Gemini AI 排序。初期設定為每位會員每天 5 次、每次最多 12 位候選人；AI 無法使用時會自動回退到原本的規則排序。

完整設定步驟請見 `GEMINI-SETUP.md`。Gemini API Key 必須放在 Supabase Edge Function Secret，不可放進 GitHub 前端檔案。

## 正式開發建議

1. 使用 Supabase Auth 完成 Google OAuth 與會員身分管理。
2. 將 Email 與合作偏好寫入資料庫。
3. 先用規則式配對建立 MVP，再逐步加入語意相似度與成效回饋。
4. 為品牌與 KOL 各建立一個單頁檔案編輯流程，避免複雜後台。
