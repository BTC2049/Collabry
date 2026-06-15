const page = document.body.dataset.page || "home";

function createMenu() {
  const queryRole = new URLSearchParams(window.location.search).get("role");
  const savedRole = queryRole || localStorage.getItem("collabry-role") || "creator";
  const profileHref =
    savedRole === "brand" ? "brand-profile.html" : "creator-profile.html";
  const shell = document.createElement("div");
  shell.innerHTML = `
    <button class="menu-toggle" type="button" aria-label="開啟選單" aria-expanded="false">
      <span></span><span></span>
    </button>
    <div class="menu-backdrop"></div>
    <aside class="side-menu" aria-hidden="true">
      <div class="side-menu-top">
        <a class="brand" href="index.html">
          <img src="assets/logo-mark.svg" alt="" width="34" height="34">
          <span>Collabry</span>
        </a>
        <button class="menu-close" type="button" aria-label="關閉選單">×</button>
      </div>
      <p class="menu-kicker">EXPLORE COLLABRY</p>
      <nav class="menu-links" aria-label="收納選單">
        <a href="index.html" ${page === "home" ? 'class="active"' : ""}><span>01</span>首頁</a>
        <a href="creators.html" ${page === "creators" ? 'class="active"' : ""}><span>02</span>探索創作者</a>
        <a href="brands.html" ${page === "brands" ? 'class="active"' : ""}><span>03</span>探索品牌</a>
        <a href="matching.html" ${page === "matching" ? 'class="active"' : ""}><span>04</span>智慧媒合</a>
        <a href="requests.html" ${page === "requests" ? 'class="active"' : ""}><span>05</span>合作邀請 <b class="menu-request-count request-count" data-request-count></b></a>
        <a href="${profileHref}" ${page.includes("profile") ? 'class="active"' : ""}><span>06</span>我的個人頁</a>
      </nav>
      <div class="menu-cta">
        <p>準備找到下一個好合作？</p>
        <a class="button button-primary button-full" href="matching.html">開始媒合 <span>↗</span></a>
      </div>
    </aside>`;
  document.body.append(...shell.children);

  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".side-menu");
  const backdrop = document.querySelector(".menu-backdrop");
  const close = () => {
    document.body.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
  };
  const open = () => {
    document.body.classList.add("menu-open");
    toggle.setAttribute("aria-expanded", "true");
    menu.setAttribute("aria-hidden", "false");
  };
  toggle.addEventListener("click", open);
  document.querySelector(".menu-close").addEventListener("click", close);
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

function setupHome() {
  document.querySelectorAll("[data-role-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      window.location.href =
        button.dataset.roleChoice === "creator" ? "creators.html" : "brands.html";
    });
  });

  document.querySelectorAll("[data-open-auth]").forEach((button) => {
    button.addEventListener("click", () => {
      const googleButton = document.querySelector("#google-signin");
      if (!googleButton) return;
      googleButton.scrollIntoView({ behavior: "smooth", block: "center" });
      googleButton.classList.add("signin-highlight");
      window.setTimeout(() => googleButton.focus({ preventScroll: true }), 500);
      window.setTimeout(() => googleButton.classList.remove("signin-highlight"), 2200);
    });
  });

  const form = document.querySelector("#match-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const params = new URLSearchParams({
        role: data.get("role"),
        email: data.get("email"),
      });
      window.location.href = `matching.html?${params}`;
    });
  }

  const google = document.querySelector("#google-signin");
  if (google) {
    form.querySelectorAll('input[name="role"]').forEach((input) => {
      input.addEventListener("change", () => {
        localStorage.setItem("collabry-role", input.value);
      });
    });
    google.addEventListener("pointerdown", () => {
      const role = form.querySelector('input[name="role"]:checked').value;
      localStorage.setItem("collabry-role", role);
    });
  }
}

function setupFilters() {
  const chips = document.querySelectorAll(".filter-chip");
  const cards = document.querySelectorAll("[data-category]");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.filter;
      cards.forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.category !== filter;
      });
    });
  });

  document.querySelectorAll(".save-button").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("saved");
      button.textContent = button.classList.contains("saved") ? "♥" : "♡";
      button.setAttribute(
        "aria-label",
        button.classList.contains("saved") ? "取消收藏" : "收藏"
      );
    });
  });
}

function setupMatching() {
  setupSearchableFields();

  const roleButtons = document.querySelectorAll("[data-match-role]");
  const profileLink = document.querySelector("#profile-link");
  const title = document.querySelector("#match-heading");
  const copy = document.querySelector("#match-subheading");
  roleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      roleButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const creator = button.dataset.matchRole === "creator";
      localStorage.setItem("collabry-role", creator ? "creator" : "brand");
      if (profileLink) {
        profileLink.href = creator ? "creator-profile.html" : "brand-profile.html";
      }
      title.textContent = creator ? "為你精選的品牌合作" : "為你精選的創作者";
      copy.textContent = creator
        ? "依照你的內容領域、受眾與合作偏好排序"
        : "依照品牌調性、目標受眾與預算範圍排序";
      window.dispatchEvent(
        new CustomEvent("collabry:match-role-changed", {
          detail: { role: creator ? "creator" : "brand" },
        })
      );
    });
  });

  const params = new URLSearchParams(window.location.search);
  const selectedRole = params.get("role");
  if (selectedRole) {
    document.querySelector(`[data-match-role="${selectedRole}"]`)?.click();
  }

}

function setupProfile() {
  const form = document.querySelector("#profile-form");
  if (!form) return;

  const role = form.dataset.role;
  const storageKey = `collabry-${role}-profile`;
  localStorage.setItem("collabry-role", role);

  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
  Object.entries(saved).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (field) field.value = value;
  });

  function updatePreview() {
    const data = new FormData(form);
    document.querySelectorAll("[data-preview]").forEach((target) => {
      const value = data.get(target.dataset.preview);
      if (value) target.textContent = value;
    });

    const required = [...form.querySelectorAll("[data-completion]")];
    const completed = required.filter((field) => field.value.trim()).length;
    const percent = Math.round((completed / required.length) * 100);
    document.querySelector("#completion-value").textContent = `${percent}%`;
    document.querySelector("#completion-bar").style.width = `${percent}%`;
  }

  form.addEventListener("input", updatePreview);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem(storageKey, JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent("collabry:profile-saved", {
        detail: { role, profile: data },
      })
    );
    const status = document.querySelector("#save-status");
    status.textContent = "已儲存變更 ✓";
    status.classList.add("show");
    window.setTimeout(() => status.classList.remove("show"), 2400);
    updatePreview();
  });

  document.querySelector("#view-public-profile")?.addEventListener("click", () => {
    window.location.href = role === "brand" ? "brands.html" : "creators.html";
  });

  updatePreview();
}

function setupSearchableFields() {
  document.querySelectorAll(".searchable-field input[list]").forEach((input) => {
    const datalist = document.querySelector(`#${input.getAttribute("list")}`);
    if (!datalist) return;

    const choices = [...datalist.options].map((option) => option.value);
    const field = input.closest(".searchable-field");
    const arrow = field.querySelector("span");
    const dropdown = document.createElement("div");
    dropdown.className = "custom-options";
    dropdown.setAttribute("role", "listbox");
    field.appendChild(dropdown);

    // Disable the inconsistent native datalist popup after reading its options.
    input.removeAttribute("list");

    let activeIndex = -1;

    function renderOptions(query = "") {
      const keyword = query.trim().toLocaleLowerCase("zh-Hant");
      const filtered = choices.filter((choice) =>
        choice.toLocaleLowerCase("zh-Hant").includes(keyword)
      );

      dropdown.replaceChildren();
      activeIndex = -1;

      if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "custom-option-empty";
        empty.textContent = `按 Enter 使用「${query.trim()}」`;
        dropdown.appendChild(empty);
        return;
      }

      filtered.forEach((choice) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "custom-option";
        option.setAttribute("role", "option");
        option.textContent = choice;
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
          input.value = choice;
          closeDropdown();
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
        dropdown.appendChild(option);
      });
    }

    function openDropdown() {
      document.querySelectorAll(".searchable-field.open").forEach((item) => {
        if (item !== field) item.classList.remove("open");
      });
      renderOptions(input.value);
      field.classList.add("open");
      input.setAttribute("aria-expanded", "true");
    }

    function closeDropdown() {
      field.classList.remove("open");
      input.setAttribute("aria-expanded", "false");
      activeIndex = -1;
    }

    function moveActive(direction) {
      const options = [...dropdown.querySelectorAll(".custom-option")];
      if (!options.length) return;
      activeIndex = (activeIndex + direction + options.length) % options.length;
      options.forEach((option, index) => {
        option.classList.toggle("active", index === activeIndex);
      });
      options[activeIndex].scrollIntoView({ block: "nearest" });
    }

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");

    input.addEventListener("focus", openDropdown);
    input.addEventListener("click", openDropdown);
    input.addEventListener("input", () => {
      renderOptions(input.value);
      field.classList.add("open");
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!field.classList.contains("open")) openDropdown();
        moveActive(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveActive(-1);
      } else if (event.key === "Enter") {
        const active = dropdown.querySelector(".custom-option.active");
        if (active) {
          event.preventDefault();
          input.value = active.textContent;
        }
        closeDropdown();
      } else if (event.key === "Escape") {
        closeDropdown();
      }
    });

    arrow.addEventListener("mousedown", (event) => {
      event.preventDefault();
      if (field.classList.contains("open")) {
        closeDropdown();
      } else {
        input.focus();
        openDropdown();
      }
    });

    document.addEventListener("mousedown", (event) => {
      if (!field.contains(event.target)) closeDropdown();
    });
  });
}

createMenu();
if (page === "home") setupHome();
if (page === "creators" || page === "brands") setupFilters();
if (page === "matching") setupMatching();
if (page.includes("profile")) setupProfile();
