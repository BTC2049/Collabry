import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { supabaseConfig } from "./supabase-config.js";

const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey);
const container = document.querySelector("#live-match-results");
const count = document.querySelector("#match-count");
const filters = {
  field: document.querySelector("#field"),
  platform: document.querySelector("#platform"),
  budget: document.querySelector("#budget"),
};
let currentRole =
  new URLSearchParams(window.location.search).get("role") ||
  localStorage.getItem("collabry-role") ||
  "brand";
const requestedTarget = new URLSearchParams(window.location.search).get("target");
let profiles = [];
let aiRanking = new Map();

function escapeHtml(value = "") {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function profileSummary(profile) {
  const data = profile.profile_data || {};
  return [
    data.category,
    data.platform,
    data.audience || data.creatorType,
    data.collaboration,
    data.budget || data.rate,
  ].filter(Boolean).join(" · ");
}

function scoreFor(profile, index) {
  if (aiRanking.has(profile.id)) return aiRanking.get(profile.id).score;
  const completed = Object.values(profile.profile_data || {}).filter(Boolean).length;
  return Math.max(72, Math.min(96, 88 + completed - index * 2));
}

function render() {
  const query = Object.values(filters)
    .map((input) => input?.value.trim().toLowerCase())
    .filter((value) => value && !value.startsWith("不限"));
  const visible = profiles.filter((profile) => {
    const haystack = JSON.stringify(profile.profile_data || {}).toLowerCase();
    return query.every((term) => haystack.includes(term.toLowerCase()));
  });
  if (aiRanking.size) {
    visible.sort((left, right) =>
      (aiRanking.get(right.id)?.score || 0) - (aiRanking.get(left.id)?.score || 0)
    );
  }

  count.textContent = `${visible.length} 位真實會員`;
  container.replaceChildren();

  if (!visible.length) {
    container.innerHTML = `
      <div class="match-empty">
        <strong>目前沒有符合條件的會員</strong>
        <p>可以放寬篩選條件，或稍後再回來看看。</p>
      </div>`;
    return;
  }

  visible.forEach((profile, index) => {
    const data = profile.profile_data || {};
    const name = profile.display_name || (profile.role === "brand" ? "未命名品牌" : "未命名創作者");
    const initial = name.slice(0, 1).toUpperCase();
    const article = document.createElement("article");
    article.className = "match-result";
    article.dataset.profileId = profile.id;
    article.innerHTML = `
      <div class="match-result-icon ${profile.avatar_url ? "has-avatar" : "cover-mint"}"
        ${profile.avatar_url ? `style="background-image:url('${escapeHtml(profile.avatar_url)}')"` : ""}>
        ${profile.avatar_url ? "" : escapeHtml(initial)}
      </div>
      <div class="match-result-copy">
        <span class="match-type">${profile.role === "brand" ? "合作品牌" : "創作者"}</span>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(profileSummary(profile) || "已完成 Collabry 個人檔案")}</p>
        ${aiRanking.get(profile.id)?.reason
          ? `<small class="ai-match-reason">AI 分析：${escapeHtml(aiRanking.get(profile.id).reason)}</small>`
          : ""}
      </div>
      <div class="match-score">
        <strong>${scoreFor(profile, index)}%</strong>
        <small>契合度</small>
        <button class="match-action" type="button">送出合作興趣</button>
      </div>`;
    article.querySelector(".match-action").addEventListener("click", (event) => {
      sendRequest(profile, event.currentTarget);
    });
    container.appendChild(article);
  });
}

async function loadProfiles() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    count.textContent = "請先登入";
    container.innerHTML = `
      <div class="match-empty">
        <strong>登入後才能查看真實媒合名單</strong>
        <p>建立個人頁後，才能向對方送出正式合作邀請。</p>
        <a class="button button-primary" href="index.html#match">前往登入</a>
      </div>`;
    return;
  }

  const { data: ownProfile, error: ownProfileError } = await supabase
    .from("profiles")
    .select("role,profile_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  if (ownProfileError || !ownProfile?.profile_completed_at) {
    count.textContent = "尚未完成個人頁";
    const profileHref =
      (ownProfile?.role || currentRole) === "brand"
        ? "brand-profile.html"
        : "creator-profile.html";
    container.innerHTML = `
      <div class="match-empty">
        <strong>請先完成你的個人頁</strong>
        <p>完成公開資料後，系統才能推薦真實且適合的合作對象。</p>
        <a class="button button-primary" href="${profileHref}">前往完善個人頁</a>
      </div>`;
    return;
  }

  currentRole = ownProfile.role;
  localStorage.setItem("collabry-role", currentRole);
  document.querySelector("#match-heading").textContent =
    currentRole === "creator" ? "為你精選的品牌合作" : "為你精選的創作者";
  document.querySelector("#match-subheading").textContent =
    currentRole === "creator"
      ? "依照你的內容領域、受眾與合作偏好排序"
      : "依照品牌調性、目標受眾與預算範圍排序";
  const profileLink = document.querySelector("#profile-link");
  if (profileLink) {
    profileLink.href =
      currentRole === "creator" ? "creator-profile.html" : "brand-profile.html";
  }
  document.querySelectorAll("[data-match-role]").forEach((button) => {
    button.classList.toggle("active", button.dataset.matchRole === currentRole);
    button.disabled = button.dataset.matchRole !== currentRole;
  });
  const targetRole = currentRole === "creator" ? "brand" : "creator";
  count.textContent = "讀取中...";
  const { data, error } = await supabase.rpc("get_match_profiles", {
    requested_role: targetRole,
  });
  if (error) {
    count.textContent = "讀取失敗";
    container.innerHTML = `<div class="match-empty"><strong>無法讀取媒合資料</strong><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }
  profiles = data || [];
  if (requestedTarget) {
    profiles.sort((left, right) =>
      left.id === requestedTarget ? -1 : right.id === requestedTarget ? 1 : 0
    );
  }
  render();
}

async function sendRequest(receiver, button) {
  button.disabled = true;
  button.textContent = "傳送中...";
  const message =
    currentRole === "brand"
      ? "我們對你的內容很有興趣，希望進一步討論合作。"
      : "我對你們的品牌合作機會很有興趣，希望進一步了解。";
  const { error } = await supabase.from("collaboration_requests").insert({
    receiver_id: receiver.id,
    message,
  });
  if (error) {
    button.disabled = false;
    button.textContent =
      error.code === "23505" ? "已送出邀請" : "傳送失敗，請重試";
    if (error.code === "23505") button.classList.add("matched");
    return;
  }
  button.textContent = "邀請已送達 ✓";
  button.classList.add("matched");
}

async function runAiMatching() {
  const button = document.querySelector("#ai-match-button");
  const note = document.querySelector("#ai-match-note");
  if (!button || button.disabled) return;
  button.disabled = true;
  button.textContent = "AI 分析中...";
  note.className = "ai-match-note";
  note.textContent = "Gemini 正在比較雙方領域、受眾、平台與合作條件。";

  const filterValues = Object.fromEntries(
    Object.entries(filters).map(([key, input]) => [key, input?.value.trim() || ""])
  );
  const { data, error } = await supabase.functions.invoke("ai-match", {
    body: { filters: filterValues },
  });

  button.disabled = false;
  button.textContent = "重新 AI 智慧排序";
  if (error || !data?.rankings) {
    aiRanking.clear();
    note.className = "ai-match-note error";
    note.textContent = data?.message || "AI 免費額度暫時無法使用，已保留一般媒合排序。";
    render();
    return;
  }

  aiRanking = new Map(
    data.rankings.map((item) => [
      item.id,
      {
        score: Math.max(0, Math.min(100, Number(item.score) || 0)),
        reason: String(item.reason || "").slice(0, 90),
      },
    ])
  );
  note.className = "ai-match-note success";
  note.textContent = `已完成 AI 排序，今天剩餘 ${data.remaining ?? 0} 次免費分析。`;
  render();
}

window.addEventListener("collabry:match-role-changed", (event) => {
  currentRole = event.detail.role;
  loadProfiles();
});
Object.values(filters).forEach((input) => {
  input?.addEventListener("change", render);
  input?.addEventListener("input", render);
});
document.querySelector("#ai-match-button")?.addEventListener("click", runAiMatching);

loadProfiles();
