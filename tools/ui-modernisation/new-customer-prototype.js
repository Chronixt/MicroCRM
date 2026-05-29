const shell = document.querySelector(".new-customer-shell");
const toast = document.querySelector("#toast");
const form = document.querySelector("#customer-form");
const noteForm = document.querySelector("#note-form");
const noteInput = document.querySelector("#note-input");
const notesList = document.querySelector("#notes-list");
const segmentedControl = document.querySelector(".segmented-control");
const pinNote = document.querySelector("#pin-note");
const medicalAlert = document.querySelector("#medical-alert");
let toastTimer;
let activeMode = "text";
let noteId = 1;

const notes = [
  {
    id: "starter-1",
    date: "Draft",
    tag: "Pinned",
    body: "Prefers low scent products and a softer fringe shape.",
    pinned: true,
    alert: false
  }
];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

function getInitials(firstName, lastName) {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.trim().toUpperCase() || "NC";
}

function getCustomerDraft() {
  const firstName = document.querySelector("#first-name").value || "New";
  const lastName = document.querySelector("#last-name").value || "Customer";
  const suburb = document.querySelector("#suburb").value.trim();
  const state = document.querySelector("#state").value.trim();
  const postcode = document.querySelector("#postcode").value.trim();
  const suburbLine = [suburb, state, postcode].filter(Boolean).join(" ");
  const fullAddress = [
    document.querySelector("#street-address").value.trim(),
    suburbLine,
    document.querySelector("#country").value.trim()
  ].filter(Boolean).join(", ");

  return {
    name: `${firstName.trim()} ${lastName.trim()}`.trim(),
    initials: getInitials(firstName, lastName),
    phone: document.querySelector("#phone").value || "No phone yet",
    email: document.querySelector("#email").value || "No email yet",
    socialName: document.querySelector("#social-name").value || "No social profile",
    fullAddress: fullAddress || "No address yet",
    source: document.querySelector("#source").value
  };
}

function renderNotes() {
  notesList.innerHTML = notes.map((note) => `
    <article class="note-card ${note.alert ? "alert" : ""}">
      <div class="note-topline">
        <div class="note-meta">
          <span class="note-date">${note.date}</span>
          <span class="note-tag ${note.alert ? "alert" : note.pinned ? "pinned" : "text"}">${note.alert ? "Alert" : note.tag}</span>
        </div>
        <div class="note-actions">
          <button type="button" aria-label="${note.pinned ? "Unpin" : "Pin"} note" data-action="toggle-pin" data-id="${note.id}">
            <span class="material-symbols-outlined" aria-hidden="true">push_pin</span>
          </button>
        </div>
      </div>
      <p>${note.body}</p>
    </article>
  `).join("");
}

function setMode(mode) {
  activeMode = mode;
  segmentedControl.dataset.activeMode = mode;
  segmentedControl.querySelectorAll("[data-mode]").forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  noteInput.placeholder = mode === "text" ? "Type a starter note or detail for this customer..." : "Add a handwritten starter note...";
  showToast(mode === "text" ? "Typing note selected" : "Handwriting note selected");
}

document.addEventListener("click", (event) => {
  const modeButton = event.target.closest("[data-mode]");
  if (modeButton) {
    setMode(modeButton.dataset.mode);
    return;
  }

  const button = event.target.closest("button");
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === "toggle-sidebar") {
    const isOpen = shell.dataset.sidebar === "open";
    shell.dataset.sidebar = isOpen ? "closed" : "open";
    showToast(isOpen ? "Sidebar collapsed" : "Sidebar expanded");
  }
  if (action === "home") window.location.href = "home-prototype.html";
  if (action === "clients") window.location.href = "customer-list-prototype.html";
  if (action === "calendar") window.location.href = "calendar-prototype.html";
  if (action === "options") window.location.href = "options-prototype.html";
  if (action === "language") showToast("Language toggle placeholder");
  if (action === "backup") showToast("Daily backup completed");
  if (action === "attach") showToast("Attachment placeholder");
  if (action === "expand-note") showToast("Expanded note editor placeholder");
  if (action === "save-customer") showToast(`${getCustomerDraft().name} saved`);
  if (action === "toggle-pin") {
    const note = notes.find((item) => item.id === id);
    if (note) {
      note.pinned = !note.pinned;
      note.tag = note.pinned ? "Pinned" : activeMode === "text" ? "Text" : "Handwritten";
      renderNotes();
      showToast(note.pinned ? "Note pinned" : "Note unpinned");
    }
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  showToast(`${getCustomerDraft().name} saved`);
});

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const body = noteInput.value.trim();

  if (!body) {
    showToast("Add note text first");
    return;
  }

  notes.unshift({
    id: `note-${noteId++}`,
    date: "Draft",
    tag: pinNote.checked ? "Pinned" : activeMode === "text" ? "Text" : "Handwritten",
    body,
    pinned: pinNote.checked,
    alert: medicalAlert.checked
  });
  noteInput.value = "";
  renderNotes();
  showToast(pinNote.checked ? "Starter note pinned" : "Starter note saved");
});

renderNotes();
