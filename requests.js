import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { supabaseConfig } from "./supabase-config.js";

const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey);
const list = document.querySelector("#request-list");
let activeTab = "received";
let requests = [];

function escapeHtml(value = "") {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}
function statusLabel(status) {
  return { pending: "等待回覆", accepted: "已接受", declined: "已婉拒" }[status] || status;
}
function formatDate(date) {
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}
function telegramHref(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `https://t.me/${text.replace(/^@/, "")}`;
}
function whatsappHref(value) {
  const number = String(value || "").replace(/[^\d]/g, "");
  return number ? `https://wa.me/${number}` : "";
}
function acceptedContact(request) {
  if (request.status !== "accepted") return "";
  const items = [];
  if (request.other_contact) items.push(`<span>聯絡人：${escapeHtml(request.other_contact)}</span>`);
  if (request.other_email) items.push(`<a href="mailto:${escapeHtml(request.other_email)}">合作 Email：${escapeHtml(request.other_email)}</a>`);
  if (request.other_line) items.push(`<span>LINE ID：${escapeHtml(request.other_line)}</span>`);
  if (request.other_telegram) items.push(`<a href="${escapeHtml(telegramHref(request.other_telegram))}" target="_blank" rel="noopener">Telegram：${escapeHtml(request.other_telegram)}</a>`);
  if (request.other_whatsapp) items.push(`<a href="${escapeHtml(whatsappHref(request.other_whatsapp))}" target="_blank" rel="noopener">WhatsApp：${escapeHtml(request.other_whatsapp)}</a>`);
  if (request.other_discord) items.push(`<span>Discord：${escapeHtml(request.other_discord)}</span>`);
  if (request.other_instagram) items.push(`<span>Instagram：${escapeHtml(request.other_instagram)}</span>`);
  if (request.other_contact_extra) items.push(`<span>其他方式：${escapeHtml(request.other_contact_extra)}</span>`);
  return items.length
    ? `<div class="request-contact">${items.join("")}</div>`
    : `<div class="request-contact"><span>對方尚未在平台填寫聯絡資訊</span></div>`;
}
function render() {
  const visible = requests.filter((item) => item.direction === activeTab);
  list.replaceChildren();
  if (!visible.length) {
    list.innerHTML = `<div class="requests-empty"><strong>${activeTab === "received" ? "目前沒有收到合作邀請" : "目前沒有送出的邀請"}</strong><p>新的邀請會即時出現在這裡。</p></div>`;
    return;
  }
  visible.forEach((request) => {
    const card = document.createElement("article");
    card.className = "request-card";
    const initial = (request.other_name || "U").slice(0, 1);
    card.innerHTML = `
      <div class="request-avatar" ${request.other_avatar ? `style="background-image:url('${escapeHtml(request.other_avatar)}')"` : ""}>${request.other_avatar ? "" : escapeHtml(initial)}</div>
      <div>
        <span class="request-direction">${request.direction === "received" ? "收到合作邀請" : "已送出邀請"}</span>
        <h2>${escapeHtml(request.other_name || "Collabry 使用者")}</h2>
        <p class="request-message">${escapeHtml(request.message || "")}</p>
        <small class="request-time">${formatDate(request.created_at)}</small>
        ${acceptedContact(request)}
      </div>`;
    if (request.direction === "received" && request.status === "pending") {
      const actions = document.createElement("div");
      actions.className = "request-actions";
      actions.innerHTML = `<button class="accept">接受邀請</button><button class="decline">婉拒</button>`;
      actions.querySelector(".accept").addEventListener("click", () => respond(request.id, "accepted"));
      actions.querySelector(".decline").addEventListener("click", () => respond(request.id, "declined"));
      card.appendChild(actions);
    } else {
      const status = document.createElement("span");
      status.className = `request-status status-${request.status}`;
      status.textContent = statusLabel(request.status);
      card.appendChild(status);
    }
    list.appendChild(card);
  });
}
async function load() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.replace("index.html#match");
    return;
  }
  const { data, error } = await supabase.rpc("get_my_collaboration_requests");
  if (error) {
    list.innerHTML = `<div class="requests-empty"><strong>邀請讀取失敗</strong><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }
  requests = data || [];
  render();
}
async function respond(id, status) {
  const { error } = await supabase
    .from("collaboration_requests")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", id);
  if (!error) {
    const request = requests.find((item) => item.id === id);
    if (request) request.status = status;
    await load();
  }
}
document.querySelectorAll("[data-request-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-request-tab]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeTab = button.dataset.requestTab;
    render();
  });
});
load();
window.addEventListener("focus", load);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) load();
});
window.setInterval(load, 15000);
