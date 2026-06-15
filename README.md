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

創作者與品牌個人頁支援 JPG、PNG、WebP 圖片，單檔上限 5 MB。圖片會上傳至 Supabase Storage 的 `avatars` bucket，路徑依會員 ID 隔離。

更新此功能後，需再次到 Supabase SQL Editor 執行最新版 `supabase-setup.sql`，建立 Storage bucket、圖片權限與 `avatar_url` 欄位。

## 正式開發建議

1. 使用 Supabase Auth 完成 Google OAuth 與會員身分管理。
2. 將 Email 與合作偏好寫入資料庫。
3. 先用規則式配對建立 MVP，再逐步加入語意相似度與成效回饋。
4. 為品牌與 KOL 各建立一個單頁檔案編輯流程，避免複雜後台。
