import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { supabaseConfig } from "./supabase-config.js";
import { demoProfiles } from "./demo-data.js";

const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey);
const grid = document.querySelector("#published-directory");
const isBrands = document.body.dataset.page === "brands";
const role = isBrands ? "brand" : "creator";
const resultCount = document.querySelector(".result-count");
let profiles = [];
let activeFilter = "all";
let searchQuery = "";

grid.innerHTML = `<div class="directory-empty"><strong>正在讀取公開檔案...</strong><p>只會顯示使用者主動發布的資料。</p></div>`;

function escapeHtml(value = "") {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function categoryKey(value = "") {
  const text = value.toLowerCase();
  const groups = [
    ["crypto", ["加密", "web3", "nft", "區塊鏈"]],
    ["beauty", ["美妝", "保養", "彩妝"]],
    ["lifestyle", ["生活", "居家", "選物"]],
    ["food", ["食品", "飲品", "美食", "餐廳"]],
    ["parenting", ["親子", "家庭", "育兒"]],
    ["fashion", ["時尚", "穿搭", "服飾"]],
    ["travel", ["旅遊", "住宿", "戶外"]],
    ["health", ["健康", "健身", "運動", "保健"]],
    ["tech", ["3c", "科技", "數位"]],
    ["finance", ["財經", "投資", "金融"]],
    ["gaming", ["遊戲", "電競"]],
    ["pet", ["寵物"]],
    ["education", ["教育", "學習", "知識"]],
    ["auto", ["汽車", "交通", "機車"]],
    ["entertainment", ["藝文", "娛樂", "音樂", "表演", "攝影"]],
    ["business", ["職場", "商業", "專業服務", "電商", "零售"]],
  ];
  return groups.find(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))?.[0] || "other";
}

function card(profile) {
  const data = profile.profile_data || {};
  const name = profile.display_name || (profile.role === "brand" ? "未命名品牌" : "未命名創作者");
  const category = data.category || "其他";
  const collaboration = data.collaboration || "合作方式面議";
  const budget = data.budget || data.rate || "預算面議";
  const platform = data.platform || "平台不限";
  const followers = data.followers || "尚未提供";
  const key = categoryKey(category);
  const article = document.createElement("article");
  article.className = "profile-card";
  article.dataset.category = key;
  article.innerHTML = `
    <div class="profile-cover cover-${["mint","orange","yellow","lilac","blue","rose"][Math.abs(name.length) % 6]}">
      <button class="save-button" aria-label="收藏">♡</button>
      ${profile.avatar_url
        ? `<span class="avatar-letter directory-avatar" style="background-image:url('${escapeHtml(profile.avatar_url)}')"></span>`
        : `<span class="avatar-letter ${profile.role === "brand" ? "brand-logo-shape" : ""}">${escapeHtml(name.slice(0,1))}</span>`}
    </div>
    <div class="profile-info">
      <span class="category-label">${escapeHtml(category)}</span>
      <div class="profile-meta"><h2>${escapeHtml(name)} <span class="verified">●</span></h2></div>
      <p>${escapeHtml(data.bio || "此會員已公開 Collabry 個人頁，歡迎進一步了解合作。")}</p>
      <div class="profile-tags"><span>${escapeHtml(platform)}</span><span>${escapeHtml(collaboration)}</span></div>
      <div class="profile-numbers">
        <div><strong>${escapeHtml(profile.role === "brand" ? budget : followers)}</strong><small>${profile.role === "brand" ? "合作預算" : "粉絲／訂閱"}</small></div>
        <div><strong>${escapeHtml(data.openings || data.engagement || "開放")}</strong><small>${profile.role === "brand" ? "合作名額" : "互動／狀態"}</small></div>
      </div>
      <a class="profile-link" href="public-profile.html?id=${encodeURIComponent(profile.id)}&role=${profile.role}">查看完整公開頁 <span>↗</span></a>
    </div>`;
  article.querySelector(".save-button").addEventListener("click", (event) => {
    event.currentTarget.classList.toggle("saved");
    event.currentTarget.textContent = event.currentTarget.classList.contains("saved") ? "♥" : "♡";
  });
  return article;
}

function render() {
  grid.replaceChildren();
  const visible = profiles.filter((profile) =>
    (activeFilter === "all" || categoryKey(profile.profile_data?.category) === activeFilter) &&
    (!searchQuery || JSON.stringify({
      name: profile.display_name,
      data: profile.profile_data,
    }).toLowerCase().includes(searchQuery))
  );
  resultCount.textContent = `${visible.length} 個已發布檔案`;
  if (!visible.length) {
    grid.innerHTML = `<div class="directory-empty"><strong>這個分類目前還沒有公開檔案</strong><p>成為第一個發布的人，讓適合的合作找到你。</p></div>`;
    return;
  }
  visible.forEach((profile) => grid.appendChild(card(profile)));
}

async function load() {
  const { data, error } = await supabase.rpc("get_published_profiles", {
    requested_role: role,
  });
  if (error) {
    grid.innerHTML = `<div class="directory-empty"><strong>無法讀取公開檔案</strong><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }
  const realProfiles = data || [];
  const demoIds = new Set(realProfiles.map((profile) => profile.id));
  profiles = [
    ...realProfiles,
    ...demoProfiles[role].filter((profile) => !demoIds.has(profile.id)),
  ];
  const total = document.querySelector(".directory-stat strong");
  if (total) total.textContent = profiles.length;

  if (new URLSearchParams(window.location.search).get("preview") === "mine") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && !profiles.some((profile) => profile.id === user.id)) {
      const { data: mine } = await supabase
        .from("profiles")
        .select("id,display_name,role,profile_data,avatar_url,is_published,published_at")
        .eq("id", user.id)
        .maybeSingle();
      if (mine?.role === role) profiles.unshift(mine);
    }
  }
  render();
}

document.querySelectorAll(".filter-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".filter-chip").forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    render();
  });
});
document.querySelector(".directory-search")?.addEventListener("input", (event) => {
  searchQuery = event.target.value.trim().toLowerCase();
  render();
});
load();
