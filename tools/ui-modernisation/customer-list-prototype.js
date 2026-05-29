const shell = document.querySelector(".customers-shell");
const toast = document.querySelector("#toast");
const customerList = document.querySelector("#customer-list");
const quickView = document.querySelector("#customer-quick-view");
const searchInput = document.querySelector("#customer-search");
const segmentedControl = document.querySelector(".segmented-control");
const listModeLabel = document.querySelector("#list-mode-label");
const resultCount = document.querySelector("#result-count");
const alphabetRail = document.querySelector("#alphabet-rail");
let toastTimer;
let sortMode = "recent";
let selectedCustomerId = "mia";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const customers = [
  {
    id: "mia",
    name: "Mia Tanaka",
    initials: "MT",
    location: "Richmond, VIC",
    phone: "0412 555 018",
    email: "mia.tanaka@example.com",
    lastUpdated: "Today, 10:18 AM",
    updatedSort: 10,
    lastService: "Colour refresh",
    visits: 18,
    revenue: "$2.8k",
    status: "Active",
    tags: ["VIP", "Colour"],
    nextAppointment: { date: "Today", time: "10:30 AM", service: "Colour refresh" },
    pinnedNotes: [
      { title: "Formula", body: "Cooler toner, level 8. Avoid warm gloss." },
      { title: "Preference", body: "Likes quiet appointments and minimal product scent." }
    ]
  },
  {
    id: "sophie",
    name: "Sophie Chen",
    initials: "SC",
    location: "South Yarra, VIC",
    phone: "0498 555 221",
    email: "sophie.chen@example.com",
    lastUpdated: "Today, 9:42 AM",
    updatedSort: 9,
    lastService: "Cut and treatment",
    visits: 7,
    revenue: "$940",
    status: "Active",
    tags: ["Treatment"],
    nextAppointment: { date: "Today", time: "1:00 PM", service: "Cut and treatment" },
    pinnedNotes: [{ title: "Products", body: "Avoid heavy finishing oils around the crown." }]
  },
  {
    id: "amber",
    name: "Amber Liu",
    initials: "AL",
    location: "San Francisco, CA",
    phone: "0400 555 184",
    email: "amber.liu@example.com",
    lastUpdated: "Yesterday",
    updatedSort: 8,
    lastService: "Follow-up consult",
    visits: 12,
    revenue: "$1.4k",
    status: "Active",
    tags: ["Alert", "Follow-up"],
    nextAppointment: null,
    pinnedNotes: [
      { title: "Medical Alert", body: "Allergic to botanical oils. Use synthetic alternatives exclusively." },
      { title: "Preference", body: "Needs extra neck support during rinsing." }
    ]
  },
  {
    id: "grace",
    name: "Grace Kim",
    initials: "GK",
    location: "Fitzroy, VIC",
    phone: "0433 555 612",
    email: "grace.kim@example.com",
    lastUpdated: "May 7",
    updatedSort: 7,
    lastService: "Styling session",
    visits: 4,
    revenue: "$520",
    status: "Active",
    tags: ["Styling"],
    nextAppointment: { date: "Mon, May 11", time: "11:00 AM", service: "Styling session" },
    pinnedNotes: [{ title: "Event", body: "Soft waves requested for event styling." }]
  },
  {
    id: "nora",
    name: "Nora Patel",
    initials: "NP",
    location: "Carlton, VIC",
    phone: "0417 555 884",
    email: "nora.patel@example.com",
    lastUpdated: "May 6",
    updatedSort: 6,
    lastService: "Brow shape",
    visits: 9,
    revenue: "$680",
    status: "Active",
    tags: ["Brows"],
    nextAppointment: { date: "Wed, May 13", time: "9:15 AM", service: "Brow shape" },
    pinnedNotes: [{ title: "Sensitivity", body: "Use sensitive skin wax and keep arch natural." }]
  },
  {
    id: "elena",
    name: "Elena Rossi",
    initials: "ER",
    location: "Brunswick, VIC",
    phone: "0422 555 331",
    email: "elena.rossi@example.com",
    lastUpdated: "May 5",
    updatedSort: 5,
    lastService: "Lash lift",
    visits: 5,
    revenue: "$610",
    status: "Active",
    tags: ["Lashes"],
    nextAppointment: { date: "Wed, May 13", time: "2:30 PM", service: "Lash lift" },
    pinnedNotes: [{ title: "Patch Test", body: "Patch test completed. Use medium shield." }]
  },
  {
    id: "priya",
    name: "Priya Shah",
    initials: "PS",
    location: "Docklands, VIC",
    phone: "0455 555 927",
    email: "priya.shah@example.com",
    lastUpdated: "May 3",
    updatedSort: 4,
    lastService: "Skin consultation",
    visits: 3,
    revenue: "$390",
    status: "Active",
    tags: ["Skin"],
    nextAppointment: { date: "Fri, May 22", time: "12:45 PM", service: "Skin consultation" },
    pinnedNotes: []
  },
  {
    id: "isla",
    name: "Isla Morgan",
    initials: "IM",
    location: "Prahran, VIC",
    phone: "0481 555 404",
    email: "isla.morgan@example.com",
    lastUpdated: "Apr 30",
    updatedSort: 3,
    lastService: "Balayage",
    visits: 14,
    revenue: "$2.1k",
    status: "Active",
    tags: ["Colour"],
    nextAppointment: null,
    pinnedNotes: [{ title: "Timing", body: "Prefers Saturday mornings when available." }]
  },
  {
    id: "lucy",
    name: "Lucy Williams",
    initials: "LW",
    location: "St Kilda, VIC",
    phone: "0439 555 772",
    email: "lucy.williams@example.com",
    lastUpdated: "Apr 26",
    updatedSort: 2,
    lastService: "Fringe trim",
    visits: 6,
    revenue: "$430",
    status: "Active",
    tags: ["Cut"],
    nextAppointment: null,
    pinnedNotes: []
  },
  {
    id: "yasmin",
    name: "Yasmin Haddad",
    initials: "YH",
    location: "Northcote, VIC",
    phone: "0466 555 107",
    email: "yasmin.haddad@example.com",
    lastUpdated: "Apr 18",
    updatedSort: 1,
    lastService: "Makeup trial",
    visits: 2,
    revenue: "$260",
    status: "New",
    tags: ["Bridal"],
    nextAppointment: null,
    pinnedNotes: [{ title: "Wedding", body: "Trial photos stored in profile attachments." }]
  }
];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

function getVisibleCustomers() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = customers.filter((customer) => {
    const haystack = [
      customer.name,
      customer.location,
      customer.lastService,
      customer.email,
      customer.tags.join(" "),
      customer.pinnedNotes.map((note) => `${note.title} ${note.body}`).join(" ")
    ].join(" ").toLowerCase();

    return !query || haystack.includes(query);
  });

  const sorted = filtered.sort((a, b) => {
    if (sortMode === "az") return a.name.localeCompare(b.name);
    return b.updatedSort - a.updatedSort;
  });

  return sortMode === "recent" ? sorted.slice(0, 10) : sorted;
}

function renderCustomerList() {
  const visibleCustomers = getVisibleCustomers();
  listModeLabel.textContent = sortMode === "recent" ? "10 Most Recent" : "A-Z Directory";
  resultCount.textContent = `${visibleCustomers.length} record${visibleCustomers.length === 1 ? "" : "s"}`;
  renderAlphabetRail(visibleCustomers);

  if (!visibleCustomers.length) {
    customerList.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-outlined" aria-hidden="true">person_search</span>
        No customers match this search.
      </div>
    `;
    return;
  }

  if (!visibleCustomers.some((customer) => customer.id === selectedCustomerId)) {
    selectedCustomerId = visibleCustomers[0].id;
  }

  customerList.innerHTML = visibleCustomers.map((customer) => `
    <button class="customer-row ${customer.id === selectedCustomerId ? "active" : ""}" type="button" data-customer-id="${customer.id}" data-letter="${customer.name.charAt(0).toUpperCase()}">
      <div class="customer-primary">
        <div class="customer-avatar">${customer.initials}</div>
        <div class="customer-copy">
          <strong>${customer.name}</strong>
          <span>${customer.lastService} · ${customer.location}</span>
          <div class="tag-row">
            ${customer.tags.slice(0, 2).map((tag) => `<em class="tag ${tag === "Alert" ? "yellow" : ""}">${tag}</em>`).join("")}
          </div>
        </div>
      </div>
      <div class="customer-meta">
        <strong>${customer.lastUpdated}</strong>
        <span>${customer.visits} visits · ${customer.revenue}</span>
      </div>
    </button>
  `).join("");

  renderQuickView();
}

function renderAlphabetRail(visibleCustomers) {
  const availableLetters = new Set(visibleCustomers.map((customer) => customer.name.charAt(0).toUpperCase()));

  alphabetRail.classList.toggle("hidden", sortMode !== "az");
  alphabetRail.innerHTML = alphabet.map((letter) => `
    <button class="${availableLetters.has(letter) ? "" : "disabled"}" type="button" data-letter-jump="${letter}" ${availableLetters.has(letter) ? "" : "disabled"}>
      ${letter}
    </button>
  `).join("");
}

function renderQuickView() {
  const customer = customers.find((item) => item.id === selectedCustomerId) || customers[0];
  const appointmentMarkup = customer.nextAppointment
    ? `
      <div class="appointment-card has-appointment">
        <time>${customer.nextAppointment.date} · ${customer.nextAppointment.time}</time>
        <strong>${customer.nextAppointment.service}</strong>
        <span>Next appointment</span>
      </div>
    `
    : `
      <div class="empty-state">
        <span class="material-symbols-outlined" aria-hidden="true">event_available</span>
        No upcoming appointment
      </div>
    `;
  const notesMarkup = customer.pinnedNotes.length
    ? customer.pinnedNotes.map((note) => `
      <article class="note-card pinned">
        <header>
          <strong>${note.title}</strong>
          <span class="material-symbols-outlined" aria-hidden="true">push_pin</span>
        </header>
        <p>${note.body}</p>
      </article>
    `).join("")
    : `
      <div class="empty-state">
        <span class="material-symbols-outlined" aria-hidden="true">push_pin</span>
        No pinned notes
      </div>
    `;

  quickView.innerHTML = `
    <div class="client-card">
      <div class="client-avatar">${customer.initials}</div>
      <div>
        <strong>${customer.name}</strong>
        <span>${customer.status} · ${customer.lastService}</span>
      </div>
    </div>

    <div class="detail-list">
      <div class="detail-row">
        <span class="material-symbols-outlined" aria-hidden="true">call</span>
        <div><span>Phone</span><strong>${customer.phone}</strong></div>
      </div>
      <div class="detail-row">
        <span class="material-symbols-outlined" aria-hidden="true">mail</span>
        <div><span>Email</span><strong>${customer.email}</strong></div>
      </div>
      <div class="detail-row">
        <span class="material-symbols-outlined" aria-hidden="true">location_on</span>
        <div><span>Location</span><strong>${customer.location}</strong></div>
      </div>
    </div>

    <section class="quick-view-section">
      <div class="section-label">Next Appointment</div>
      ${appointmentMarkup}
    </section>

    <section class="quick-view-section">
      <div class="section-label">Pinned Notes</div>
      ${notesMarkup}
    </section>

    <section class="quick-view-section">
      <button class="button outline full-width" type="button" data-action="open-profile">
        <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
        Open Customer Profile
      </button>
    </section>
  `;
}

function setSortMode(mode) {
  sortMode = mode;
  segmentedControl.dataset.activeSort = mode;
  document.querySelectorAll("[data-sort]").forEach((button) => {
    const selected = button.dataset.sort === mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  renderCustomerList();
}

document.addEventListener("click", (event) => {
  const sortButton = event.target.closest("[data-sort]");
  if (sortButton) {
    setSortMode(sortButton.dataset.sort);
    showToast(sortButton.dataset.sort === "recent" ? "Recent records selected" : "A-Z selected");
    return;
  }

  const customerButton = event.target.closest("[data-customer-id]");
  if (customerButton) {
    selectedCustomerId = customerButton.dataset.customerId;
    renderCustomerList();
    const customer = customers.find((item) => item.id === selectedCustomerId);
    showToast(`${customer.name} selected`);
    return;
  }

  const letterButton = event.target.closest("[data-letter-jump]");
  if (letterButton) {
    const targetRow = customerList.querySelector(`[data-letter="${letterButton.dataset.letterJump}"]`);

    if (targetRow) {
      targetRow.scrollIntoView({ block: "nearest", behavior: "smooth" });
      showToast(`${letterButton.dataset.letterJump} customers`);
    }
    return;
  }

  const button = event.target.closest("button");
  if (!button) return;

  const { action } = button.dataset;

  if (action === "toggle-sidebar") {
    const isOpen = shell.dataset.sidebar === "open";
    shell.dataset.sidebar = isOpen ? "closed" : "open";
    showToast(isOpen ? "Sidebar collapsed" : "Sidebar expanded");
  }
  if (action === "home") window.location.href = "home-prototype.html";
  if (action === "calendar") window.location.href = "calendar-prototype.html";
  if (action === "new-client") window.location.href = "new-customer-prototype.html";
  if (action === "options") window.location.href = "options-prototype.html";
  if (action === "language") showToast("Language toggle placeholder");
  if (action === "backup") showToast("Daily backup completed");
  if (action === "open-profile") window.location.href = "customer-profile-prototype.html";
});

document.addEventListener("submit", (event) => {
  if (event.target.matches(".customer-search")) {
    event.preventDefault();
  }
});

searchInput.addEventListener("input", () => {
  renderCustomerList();
});

renderCustomerList();
