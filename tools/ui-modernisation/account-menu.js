const accountMenuTrigger = document.querySelector(".user-chip");
let accountMenu;

function showAccountToast(message) {
  if (typeof window.showToast === "function") {
    window.showToast(message);
    return;
  }

  const pageToast = document.querySelector("#toast");
  if (!pageToast) return;
  pageToast.textContent = message;
  pageToast.classList.add("visible");
  window.setTimeout(() => pageToast.classList.remove("visible"), 2200);
}

function buildAccountMenu() {
  const menu = document.createElement("div");
  menu.className = "account-menu";
  menu.id = "account-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-hidden", "true");
  menu.innerHTML = `
    <div class="account-menu-header">
      <div class="avatar">AL</div>
      <div>
        <strong>Amber Liu</strong>
        <span>Standard Plan</span>
      </div>
    </div>
    <button class="account-menu-item" type="button" role="menuitem" data-account-menu-action="profile-settings">
      <span class="material-symbols-outlined" aria-hidden="true">manage_accounts</span>
      Profile Settings
    </button>
    <button class="account-menu-item" type="button" role="menuitem" data-account-menu-action="help">
      <span class="material-symbols-outlined" aria-hidden="true">help</span>
      Help & FAQ
    </button>
    <button class="account-menu-item sign-out" type="button" role="menuitem" data-account-menu-action="sign-out">
      <span class="material-symbols-outlined" aria-hidden="true">logout</span>
      Sign Out
    </button>
  `;
  document.body.appendChild(menu);
  return menu;
}

function positionAccountMenu() {
  if (!accountMenuTrigger || !accountMenu) return;
  const rect = accountMenuTrigger.getBoundingClientRect();
  const menuWidth = accountMenu.offsetWidth || 280;
  const left = Math.min(window.innerWidth - menuWidth - 14, Math.max(14, rect.right - menuWidth));
  accountMenu.style.top = `${rect.bottom + 10}px`;
  accountMenu.style.left = `${left}px`;
}

function setAccountMenuOpen(isOpen) {
  if (!accountMenuTrigger || !accountMenu) return;
  accountMenu.classList.toggle("open", isOpen);
  accountMenu.setAttribute("aria-hidden", String(!isOpen));
  accountMenuTrigger.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) positionAccountMenu();
}

if (accountMenuTrigger) {
  accountMenuTrigger.setAttribute("aria-haspopup", "menu");
  accountMenuTrigger.setAttribute("aria-expanded", "false");
  accountMenuTrigger.setAttribute("aria-controls", "account-menu");
  accountMenu = buildAccountMenu();
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest(".user-chip");
  if (trigger === accountMenuTrigger) {
    event.preventDefault();
    setAccountMenuOpen(!accountMenu.classList.contains("open"));
    return;
  }

  const menuAction = event.target.closest("[data-account-menu-action]");
  if (menuAction) {
    const action = menuAction.dataset.accountMenuAction;
    setAccountMenuOpen(false);
    if (action === "profile-settings") showAccountToast("Profile settings page placeholder.");
    if (action === "help") showAccountToast("Help and FAQ page placeholder.");
    if (action === "sign-out") showAccountToast("Sign out action placeholder.");
    return;
  }

  if (accountMenu?.classList.contains("open") && !event.target.closest(".account-menu")) {
    setAccountMenuOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setAccountMenuOpen(false);
});

window.addEventListener("resize", positionAccountMenu);
window.addEventListener("scroll", positionAccountMenu, true);
