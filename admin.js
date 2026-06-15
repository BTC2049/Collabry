import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { supabaseConfig } from "./supabase-config.js";

const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey);
const loading = document.querySelector("#admin-loading");
const denied = document.querySelector("#admin-denied");
const content = document.querySelector("#admin-content");
const table = document.querySelector("#users-table");
let rows = [];

function showDenied() {
  loading.hidden = true;
  denied.hidden = false;
}

function formatDate(value) {
  if (!value) return "尚未記錄";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}

function render(data) {
  table.replaceChildren();
  data.forEach((user) => {
    const row = document.createElement("tr");
    const complete = Boolean(user.profile_completed_at);
    row.innerHTML = `
      <td class="user-cell"><strong>${user.display_name || "未填寫名稱"}</strong><small>${user.id}</small></td>
      <td><span class="role-badge role-${user.role || "creator"}">${user.role === "brand" ? "品牌" : "創作者"}</span></td>
      <td>${user.email || "未提供"}</td>
      <td><span class="status-badge ${complete ? "status-complete" : "status-pending"}">${complete ? "已完成" : "待完善"}</span></td>
      <td>${formatDate(user.created_at)}</td>`;
    table.appendChild(row);
  });
  document.querySelector("#table-count").textContent = `${data.length} 筆資料`;
}

function exportCsv() {
  const headers = ["會員ID", "名稱", "角色", "Email", "檔案完成", "加入時間", "更新時間"];
  const values = rows.map((user) => [
    user.id,
    user.display_name || "",
    user.role === "brand" ? "品牌" : "創作者",
    user.email || "",
    user.profile_completed_at ? "是" : "否",
    user.created_at || "",
    user.updated_at || "",
  ]);
  const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = "\uFEFF" + [headers, ...values].map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `collabry-users-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  showDenied();
} else {
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_admin) {
    showDenied();
  } else {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,display_name,role,profile_completed_at,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      showDenied();
    } else {
      rows = data || [];
      loading.hidden = true;
      content.hidden = false;
      document.querySelector("#stat-total").textContent = rows.length;
      document.querySelector("#stat-creators").textContent = rows.filter((item) => item.role === "creator").length;
      document.querySelector("#stat-brands").textContent = rows.filter((item) => item.role === "brand").length;
      document.querySelector("#stat-complete").textContent = rows.filter((item) => item.profile_completed_at).length;
      render(rows);
    }
  }
}

document.querySelector("#admin-search").addEventListener("input", (event) => {
  const query = event.target.value.trim().toLowerCase();
  render(rows.filter((user) =>
    [user.display_name, user.email, user.role].some((value) =>
      String(value || "").toLowerCase().includes(query)
    )
  ));
});
document.querySelector("#export-users").addEventListener("click", exportCsv);
