# 讓 Google 收錄 Collabry

網站 SEO 檔案只是讓 Google 更容易理解內容，仍需要在 Google Search Console 主動提交。

## 1. 先更新 GitHub Pages

確認下列網址可以公開開啟：

- `https://btc2049.github.io/Collabry/`
- `https://btc2049.github.io/Collabry/robots.txt`
- `https://btc2049.github.io/Collabry/sitemap.xml`

## 2. 加入 Google Search Console

1. 前往 <https://search.google.com/search-console/>
2. 選擇「網址前置字元」。
3. 輸入 `https://btc2049.github.io/Collabry/`
4. 選擇 HTML 檔案驗證或 HTML 標記驗證。

GitHub Pages 最容易使用 HTML 檔案：

1. 從 Search Console 下載 `googlexxxxxxxx.html`。
2. 把該檔案放在網站根目錄，與 `index.html` 同一層。
3. 更新 GitHub 後，先確認該驗證網址能開啟。
4. 回 Search Console 按「驗證」。

## 3. 提交 Sitemap

到 Search Console > Sitemap，輸入：

```text
sitemap.xml
```

完整網址為：

```text
https://btc2049.github.io/Collabry/sitemap.xml
```

## 4. 要求建立索引

使用 Search Console 上方「網址審查」，依序檢查並要求建立索引：

```text
https://btc2049.github.io/Collabry/
https://btc2049.github.io/Collabry/creators.html
https://btc2049.github.io/Collabry/brands.html
```

不用每天重複送出。Google 收錄可能需要數天到數週，提交不代表保證立即收錄。

## 5. 後續增加自然流量

- 讓品牌或創作者從自己的社群、網站連回公開頁。
- 增加真正有搜尋價值的內容，例如「台灣微型 KOL 合作指南」。
- 避免大量重複、空白或只有少量文字的公開頁。
- 公開頁標題、介紹及合作領域要寫得具體。
- 日後使用自訂網域，品牌與搜尋辨識度會比 GitHub 子路徑更好。
