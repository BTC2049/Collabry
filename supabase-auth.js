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

async function addAdminEntry(supabase) {
  const dropdown = document.querySelector(".account-dropdown");
  if (!dropdown || dropdown.querySelector("[data-admin-link]")) return;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .single();
  if (!data?.is_admin) return;

  const link = document.createElement("a");
  link.href = "admin.html";
  link.dataset.adminLink = "";
  link.innerHTML = "管理後台 <span>↗</span>";
  dropdown.querySelector(".account-signout").before(link);
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

  button.hidden = true;
  form.querySelector(".or")?.setAttribute("hidden", "");
  const metadata = user.user_metadata || {};
  const panel = document.createElement("div");
  panel.className = "signed-in-panel";
  panel.innerHTML = `
    <div class="signed-in-status">
      <span class="signed-check">✓</span>
      <div><strong>已登入</strong><small>${user.email || ""}</small></div>
    </div>
    <a class="button button-dark button-full" href="${profileForRole()}">進入我的個人頁 <span>→</span></a>`;
  button.before(panel);
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
    addAdminEntry(supabase);
    renderSignedInPanel(session.user);
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
