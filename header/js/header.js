/* ==========================================================================
   ECOCycle — Header behavior
   Nạp dữ liệu điều hướng từ nav.json và dựng menu chính
   ========================================================================== */

(function () {
  "use strict";

  const ICONS = {
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 11l8-7 8 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9h12v-9" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    wrench: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.6-.9-.9-2.6 2.1-2.1z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    recycle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 19H4l3-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 5h6l3 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 19h3l-3-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    people: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="2.6" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="9" r="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 19c.8-3 3-4.6 5.5-4.6s4.7 1.6 5.5 4.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14.8 15.2c1.9.2 3.5 1.6 4.2 3.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  async function loadNav() {
    const list = document.getElementById("main-nav-list");
    if (!list) return;
    const src = list.dataset.navSource || "header/js/nav.json";

    try {
      const res = await fetch(src);
      const items = await res.json();
      renderNav(list, items);
    } catch (err) {
      console.error("Không tải được nav.json:", err);
    }
  }

  function renderNav(list, items) {
    list.innerHTML = items
      .map((item) => {
        const icon = ICONS[item.icon] || "";
        const activeClass = item.active ? " is-active" : "";
        return `
          <li>
            <a class="main-nav__link${activeClass}" href="${item.href}">
              ${icon}
              <span>${item.label}</span>
            </a>
          </li>`;
      })
      .join("");
  }

  function setupDropdowns() {
    document.querySelectorAll("[aria-haspopup='true']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const isOpen = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!isOpen));
      });
    });
  }

  function initHeader() {
    loadNav();
    setupDropdowns();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeader);
  } else {
    initHeader();
  }
})();
