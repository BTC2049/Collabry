import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { supabaseConfig } from "./supabase-config.js";

const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey);
const params = new URLSearchParams(window.location.search);
const requestedRole = params.get("role") === "creator" ? "creator" : "brand";
const previewMine = params.get("preview") === "mine";

function text(value, fallback = "尚未提供") {
  return String(value || fallback);
}

function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function fact(label, value) {
  const item = document.createElement("div");
  item.className = "public-fact";
  const small = document.createElement("small");
  const strong = document.createElement("strong");
  small.textContent = label;
  strong.textContent = text(value);
  item.append(small, strong);
  return item;
}

async function getProfile() {
  if (previewMine) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,role,profile_data,avatar_url,is_published,published_at")
      .eq("id", user.id)
      .maybeSingle();
    return data?.role === requestedRole ? data : null;
  }

  const { data } = await supabase.rpc("get_published_profiles", {
    requested_role: requestedRole,
  });
  return (data || []).find((profile) => profile.id === params.get("id")) || null;
}

function addLink(container, label, value) {
  const href = safeUrl(value);
  if (!href) return;
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = `${label} ↗`;
  container.appendChild(link);
}

function render(profile) {
  const data = profile.profile_data || {};
  const isBrand = profile.role === "brand";
  const name = text(profile.display_name, isBrand ? "未命名品牌" : "未命名創作者");
  document.title = `${name}｜Collabry`;
  document.querySelector("#public-name").textContent = name;
  document.querySelector("#public-bio").textContent = text(data.bio, "這位會員尚未填寫簡介。");
  document.querySelector("#public-role").textContent = isBrand ? "Brand profile" : "Creator profile";
  document.querySelector("#public-eyebrow").textContent = isBrand ? "OPEN COLLABORATION" : "CREATOR PORTFOLIO";
  document.querySelector("#public-heading").textContent = isBrand ? "品牌合作需求" : "創作者合作資料";

  const avatar = document.querySelector("#public-avatar");
  if (profile.avatar_url) avatar.style.backgroundImage = `url("${profile.avatar_url}")`;
  else avatar.textContent = name.slice(0, 1);

  const facts = document.querySelector("#public-facts");
  const entries = isBrand
    ? [
        ["品牌產業", data.category],
        ["合作平台", data.platform],
        ["合作方式", data.collaboration],
        ["單次預算", data.budget],
        ["理想創作者", data.creatorType],
        ["合作檔期", data.timeline],
        ["開放名額", data.openings],
        ["預計回覆", data.response],
      ]
    : [
        ["主要領域", data.category],
        ["主要平台", data.platform],
        ["粉絲／訂閱", data.followers],
        ["平均互動率", data.engagement],
        ["主要受眾", data.audience],
        ["合作方式", data.collaboration],
        ["參考報價", data.rate],
        ["所在地", data.location],
      ];
  entries.forEach(([label, value]) => facts.appendChild(fact(label, value)));

  const story = document.querySelector("#public-story");
  const heading = document.createElement("h3");
  const paragraph = document.createElement("p");
  heading.textContent = isBrand ? "合作內容與期待" : "合作偏好";
  paragraph.textContent = text(isBrand ? data.brief : data.preferences, "目前尚未補充更多合作說明。");
  story.append(heading, paragraph);

  const links = document.querySelector("#public-links");
  addLink(links, "品牌網站", data.website);
  addLink(links, "作品集", data.portfolio);
  addLink(links, "社群帳號", data.handle);

  document.querySelector("#back-directory").href = isBrand ? "brands.html" : "creators.html";
  document.querySelector("#public-match-link").href = `matching.html?role=${isBrand ? "creator" : "brand"}&target=${encodeURIComponent(profile.id)}`;
  document.querySelector("#public-profile-loading").hidden = true;
  document.querySelector("#public-profile-card").hidden = false;
}

const profile = await getProfile();
if (profile) {
  render(profile);
} else {
  const loading = document.querySelector("#public-profile-loading");
  loading.innerHTML = "<strong>找不到這個公開檔案</strong><p>可能尚未發布、已下架，或目前登入的身分不符。</p>";
}
