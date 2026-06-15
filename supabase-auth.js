import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { supabaseConfig } from "./supabase-config.js";

const configured = Boolean(
  supabaseConfig.url && supabaseConfig.publishableKey
);
const googleButton = document.querySelector("#google-signin");
const isProfilePage = document.body.dataset.page?.includes("profile");

function showAuthMessage(message) {
  let messageBox = document.querySelector("#auth-message");
  if (!messageBox) {
    messageBox = document.createElement("div");
    messageBox.id = "auth-message";
    messageBox.className = "auth-message";
    document.body.appendChild(messageBox);
  }
  messageBox.textContent = message;
  messageBox.classList.add("show");
  window.setTimeout(() => messageBox.classList.remove("show"), 5000);
}

function getSiteRoot() {
  if (
    window.location.hostname === "btc2049.github.io" &&
    supabaseConfig.productionUrl
  ) {
    return new URL(supabaseConfig.productionUrl);
  }
  const path = window.location.pathname;
  return new URL(path.slice(0, path.lastIndexOf("/") + 1), window.location.origin);
}

function profileForRole() {
  return localStorage.getItem("collabry-role") === "brand"
    ? "brand-profile.html"
    : "creator-profile.html";
}

function addAccountMenu(user, supabase) {
  const header = document.querySelector(".site-header");
  if (!header || header.querySelector(".account-trigger")) return;

  const metadata = user.user_metadata || {};
  const role = localStorage.getItem("collabry-role") || "creator";
  const profileHref =
    role === "brand" ? "brand-profile.html" : "creator-profile.html";
  const existingLogin = header.querySelector("[data-open-auth]");
  existingLogin?.remove();

  const account = document.createElement("div");
  account.className = "account-control";
  account.innerHTML = `
    <button class="account-trigger" type="button" aria-label="開啟帳號選單" aria-expanded="false">
      ${metadata.avatar_url ? `<img src="${metadata.avatar_url}" alt="">` : `<span>${(metadata.full_name || user.email || "U").slice(0, 1).toUpperCase()}</span>`}
    </button>
    <div class="account-dropdown" aria-hidden="true">
      <div class="account-identity">
        <strong>${metadata.full_name || "Collabry 使用者"}</strong>
        <small>${user.email || ""}</small>
      </div>
      <a href="${profileHref}">編輯我的個人頁 <span>↗</span></a>
      <a href="matching.html?role=${role}">查看我的媒合 <span>↗</span></a>
      <button class="account-signout" type="button">登出</button>
    </div>`;
  const trigger = account.querySelector(".account-trigger");
  const dropdown = account.querySelector(".account-dropdown");
  trigger.addEventListener("click", () => {
    const open = account.classList.toggle("open");
    trigger.setAttribute("aria-expanded", String(open));
    dropdown.setAttribute("aria-hidden", String(!open));
  });
  account.querySelector(".account-signout").addEventListener("click", async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("collabry-user");
    window.location.href = "index.html";
  });
  document.addEventListener("click", (event) => {
    if (!account.contains(event.target)) {
      account.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
      dropdown.setAttribute("aria-hidden", "true");
    }
  });

  const menuToggle = document.querySelector(".menu-toggle");
  if (menuToggle) {
    menuToggle.before(account);
  } else {
    header.appendChild(account);
  }
}

function renderAdminLinks() {
  const dropdown = document.querySelector(".account-dropdown");
  if (dropdown && !dropdown.querySelector("[data-admin-link]")) {
    const link = document.createElement("a");
    link.href = "admin.html";
    link.dataset.adminLink = "";
    link.innerHTML = "管理後台 <span>↗</span>";
    dropdown.querySelector(".account-signout").before(link);
  }

  const menuLinks = document.querySelector(".menu-links");
  if (menuLinks && !menuLinks.querySelector("[data-admin-link]")) {
    const menuAdmin = document.createElement("a");
    menuAdmin.href = "admin.html";
    menuAdmin.dataset.adminLink = "";
    menuAdmin.innerHTML = "<span>06</span>管理後台";
    menuLinks.appendChild(menuAdmin);
  }
}

async function addAdminEntry(supabase, user) {
  const configuredAdmin = (supabaseConfig.adminEmails || []).some(
    (email) => email.toLowerCase() === (user.email || "").toLowerCase()
  );
  if (configuredAdmin) renderAdminLinks();

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (data?.is_admin) renderAdminLinks();
}

function syncUser(user) {
  const metadata = user.user_metadata || {};
  localStorage.setItem(
    "collabry-user",
    JSON.stringify({
      uid: user.id,
      name: metadata.full_name || metadata.name || "",
      email: user.email,
      photoURL: metadata.avatar_url || metadata.picture || "",
    })
  );
}

function renderSignedInPanel(user) {
  const button = document.querySelector("#google-signin");
  const form = button?.closest(".match-form");
  if (!button || !form || form.querySelector(".signed-in-panel")) return;

  form.classList.add("is-authenticated");
  const metadata = user.user_metadata || {};
  const panel = document.createElement("div");
  panel.className = "signed-in-panel";
  panel.innerHTML = `
    <div class="signed-in-status">
      ${metadata.avatar_url
        ? `<img class="signed-user-avatar" src="${metadata.avatar_url}" alt="">`
        : `<span class="signed-check">✓</span>`}
      <div>
        <span class="signed-label">ACCOUNT CONNECTED</span>
        <strong>已登入</strong>
        <small>${metadata.full_name || user.email || ""}</small>
        ${metadata.full_name && user.email ? `<small>${user.email}</small>` : ""}
      </div>
    </div>
    <a class="button button-dark button-full" href="${profileForRole()}">進入我的個人頁 <span>→</span></a>`;
  form.prepend(panel);
}

async function setupAvatarUpload(supabase, user) {
  const input = document.querySelector("#avatar-upload");
  const preview = document.querySelector("[data-avatar-preview]");
  if (!input || !preview) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  function showAvatar(url) {
    if (!url) return;
    preview.style.backgroundImage = `url("${url}")`;
    preview.classList.add("has-image");
    preview.textContent = "";
  }

  showAvatar(profile?.avatar_url || user.user_metadata?.avatar_url);

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showAuthMessage("請上傳 JPG、PNG 或 WebP 圖片。");
      input.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showAuthMessage("圖片不可超過 5 MB。");
      input.value = "";
      return;
    }

    showAvatar(URL.createObjectURL(file));
    const uploader = input.previousElementSibling;
    uploader?.classList.add("uploading");
    const extension = file.name.split(".").pop().toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      uploader?.classList.remove("uploading");
      showAuthMessage(`圖片上傳失敗：${uploadError.message}`);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = data.publicUrl;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    uploader?.classList.remove("uploading");

    if (profileError) {
      showAuthMessage(`頭像資料更新失敗：${profileError.message}`);
      return;
    }
    showAvatar(avatarUrl);
    showAuthMessage("頭像已更新。");
  });
}

if (!configured) {
  googleButton?.addEventListener("click", () => {
    showAuthMessage("尚未填入 Supabase 專案網址與 Publishable Key。");
  });
} else {
  const supabase = createClient(
    supabaseConfig.url,
    supabaseConfig.publishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );

  googleButton?.addEventListener("click", async () => {
    if (window.location.protocol === "file:") {
      showAuthMessage("Google 登入必須從 GitHub Pages 或 localhost 開啟。");
      return;
    }

    const role =
      document.querySelector('#match-form input[name="role"]:checked')?.value ||
      localStorage.getItem("collabry-role") ||
      "creator";
    localStorage.setItem("collabry-role", role);
    localStorage.setItem("collabry-auth-pending", "true");
    googleButton.disabled = true;
    googleButton.classList.add("loading");

    const redirectTo = new URL("index.html", getSiteRoot()).href;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      googleButton.disabled = false;
      googleButton.classList.remove("loading");
      localStorage.removeItem("collabry-auth-pending");
      showAuthMessage(`Google 登入失敗：${error.message}`);
    }
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    syncUser(session.user);
    addAccountMenu(session.user, supabase);
    addAdminEntry(supabase, session.user);
    renderSignedInPanel(session.user);
    setupAvatarUpload(supabase, session.user);
    const emailInput = document.querySelector('#profile-form input[name="email"]');
    if (emailInput && !emailInput.value) {
      emailInput.value = session.user.email || "";
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (
      localStorage.getItem("collabry-auth-pending") === "true" &&
      document.body.dataset.page === "home"
    ) {
      localStorage.removeItem("collabry-auth-pending");
      window.location.replace(profileForRole());
    }
  } else if (isProfilePage) {
    window.location.replace("index.html#match");
  }

  supabase.auth.onAuthStateChange((event, currentSession) => {
    if (event === "SIGNED_IN" && currentSession?.user) {
      syncUser(currentSession.user);
      renderSignedInPanel(currentSession.user);
    }
  });

  window.addEventListener("collabry:profile-saved", async (event) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      showAuthMessage("請先登入後再儲存個人頁。");
      return;
    }

    const { role, profile } = event.detail;
    const { error } = await supabase
      .from("profiles")
      .update({
        email: user.email,
        display_name:
          profile.displayName ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "",
        role,
        profile_data: profile,
        profile_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) showAuthMessage(`雲端儲存失敗：${error.message}`);
  });
}
