const shell = document.querySelector(".options-shell");
const toast = document.querySelector("#toast");
const deleteInput = document.querySelector("#delete-confirmation");
const deleteButton = document.querySelector('[data-action="delete-data"]');

const routes = {
  home: "home-prototype.html",
  "new-client": "new-customer-prototype.html",
  clients: "customer-list-prototype.html",
  calendar: "calendar-prototype.html"
};

let toastTimer;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2200);
}

function updateDeleteState() {
  if (!deleteInput || !deleteButton) return;
  deleteButton.disabled = deleteInput.value.trim() !== "DELETE";
}

document.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;

  const action = actionTarget.dataset.action;

  if (routes[action]) {
    window.location.href = routes[action];
    return;
  }

  if (action === "toggle-sidebar") {
    shell.dataset.sidebar = shell.dataset.sidebar === "closed" ? "open" : "closed";
    return;
  }

  if (action === "backup") showToast("Daily backup completed.");
  if (action === "language") showToast("Language selector placeholder.");
  if (action === "validate-import") showToast("Import file validated.");
  if (action === "import-data") showToast("Import started.");
  if (action === "preview-export") showToast("Export preview ready.");
  if (action === "export-data") showToast("Export downloaded.");

  if (action === "delete-data") {
    showToast("Data deletion confirmed.");
    deleteInput.value = "";
    updateDeleteState();
  }
});

deleteInput?.addEventListener("input", updateDeleteState);
updateDeleteState();
