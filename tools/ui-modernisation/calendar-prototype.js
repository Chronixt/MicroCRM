const shell = document.querySelector(".calendar-shell");
const toast = document.querySelector("#toast");
const listView = document.querySelector("#list-view");
const monthView = document.querySelector("#month-view");
const calendarTitle = document.querySelector("#calendar-title");
const calendarRange = document.querySelector("#calendar-range-label");
const bookingDetailContent = document.querySelector("#booking-detail-content");
const segmentedControl = document.querySelector(".segmented-control");
const quickBookOverlay = document.querySelector("#quick-book-overlay");
const quickBookDate = document.querySelector("#quick-book-date");
let toastTimer;

const bookingDetails = {
  "Mia Tanaka": {
    service: "Colour refresh",
    time: "10:30 AM - 12:00 PM",
    initials: "MT",
    status: "Confirmed",
    notes: "Prefers cooler toner. Check scalp sensitivity."
  },
  "Sophie Chen": {
    service: "Cut and treatment",
    time: "1:00 PM - 2:15 PM",
    initials: "SC",
    status: "Scheduled",
    notes: "Add bond repair treatment and avoid heavy finishing oils."
  },
  "Amber Liu": {
    service: "Follow-up consult",
    time: "4:15 PM - 4:45 PM",
    initials: "AL",
    status: "Follow-up",
    notes: "Review previous formula notes before booking next colour service."
  },
  "Grace Kim": {
    service: "Styling session",
    time: "11:00 AM - 12:00 PM",
    initials: "GK",
    status: "Scheduled",
    notes: "Soft waves requested for event styling."
  },
  "Nora Patel": {
    service: "Brow shape",
    time: "9:15 AM - 9:45 AM",
    initials: "NP",
    status: "Confirmed",
    notes: "Keep arch natural and use sensitive skin wax."
  },
  "Elena Rossi": {
    service: "Lash lift",
    time: "2:30 PM - 3:30 PM",
    initials: "ER",
    status: "Scheduled",
    notes: "Patch test completed. Use medium shield."
  },
  "Priya Shah": {
    service: "Skin consultation",
    time: "12:45 PM - 1:15 PM",
    initials: "PS",
    status: "Confirmed",
    notes: "Discuss hydration routine and update product recommendations."
  }
};

const bookingsByDate = {
  "May 9": ["Mia Tanaka", "Sophie Chen", "Amber Liu"],
  "May 11": ["Grace Kim"],
  "May 13": ["Nora Patel", "Elena Rossi"],
  "May 22": ["Priya Shah"]
};
const nextUpcomingBooking = "Mia Tanaka";
const firstBookedDate = Object.keys(bookingsByDate)[0];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

function setView(view) {
  const isMonth = view === "month";
  segmentedControl.dataset.activeView = view;
  document.querySelectorAll("[data-view]").forEach((button) => {
    const selected = button.dataset.view === view;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  listView.classList.toggle("hidden", isMonth);
  monthView.classList.toggle("hidden", !isMonth);
  calendarTitle.textContent = isMonth ? "May 2026" : "This Week";
  calendarRange.textContent = isMonth ? "Month view" : "May 9 - May 15, 2026";
  resetSelectedPanelForView(view);
}

function renderBookingDetail(name) {
  const details = bookingDetails[name] || bookingDetails["Mia Tanaka"];
  bookingDetailContent.innerHTML = `
    <div class="client-card">
      <div class="client-avatar">${details.initials}</div>
      <div>
        <strong id="detail-client">${name}</strong>
        <span id="detail-service">${details.service}</span>
      </div>
    </div>
    <dl>
      <div><dt>Time</dt><dd id="detail-time">${details.time}</dd></div>
      <div><dt>Status</dt><dd><span class="status-pill">${details.status}</span></dd></div>
      <div><dt>Notes</dt><dd>${details.notes}</dd></div>
    </dl>
    <button class="button outline full-width" type="button" data-action="open-booking">
      <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
      Open Details
    </button>
  `;
}

function renderDayAgenda(dateLabel, bookingNames) {
  const agendaItems = bookingNames.map((name, index) => {
    const details = bookingDetails[name];
    const expanded = bookingNames.length === 1 || index === 0;
    const startTime = details.time.split(" - ")[0];

    return `
      <article class="agenda-item ${expanded ? "expanded" : ""}" data-agenda-item>
        <button class="agenda-client-button" type="button" data-action="toggle-agenda-item" aria-expanded="${expanded}">
          <div class="client-card agenda-client-card">
            <div class="client-avatar">${details.initials}</div>
            <div>
              <strong>${name}</strong>
              <span>${details.service}</span>
            </div>
            <time>${startTime}</time>
          </div>
        </button>
        <div class="agenda-details">
          <div class="agenda-details-inner">
            <dl>
              <div><dt>Time</dt><dd>${details.time}</dd></div>
              <div><dt>Status</dt><dd><span class="status-pill">${details.status}</span></dd></div>
              <div><dt>Notes</dt><dd>${details.notes}</dd></div>
            </dl>
            <button class="button outline full-width" type="button" data-action="open-booking">
              <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
              Open Details
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  bookingDetailContent.innerHTML = `
    <div class="agenda-panel-heading">
      <span>Selected Date</span>
      <strong>${dateLabel}</strong>
      <small>${bookingNames.length} booking${bookingNames.length === 1 ? "" : "s"}</small>
    </div>
    <div class="agenda-list">
      ${agendaItems}
    </div>
  `;
}

function selectBooking(name) {
  renderBookingDetail(name);
  document.querySelectorAll(".booking-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.booking === name);
  });
}

function selectBookedDate(dateLabel, { announce = true } = {}) {
  const bookingNames = bookingsByDate[dateLabel] || [];
  const dateButton = document.querySelector(`.month-grid [data-date="${dateLabel}"]`);

  document.querySelectorAll(".month-grid button").forEach((button) => {
    button.classList.toggle("selected", button === dateButton);
  });

  if (!bookingNames.length) return false;

  renderDayAgenda(dateLabel, bookingNames);
  if (announce) showToast(`${dateLabel} selected`);
  return true;
}

function resetSelectedPanelForView(view) {
  closeQuickBook();

  if (view === "month") {
    document.querySelectorAll(".booking-card").forEach((card) => card.classList.remove("active"));
    selectBookedDate(firstBookedDate, { announce: false });
    return;
  }

  document.querySelectorAll(".month-grid button").forEach((button) => button.classList.remove("selected"));
  selectBooking(nextUpcomingBooking);
}

function selectMonthDate(button) {
  const dateLabel = button.dataset.date || "May 9";
  const bookingNames = bookingsByDate[dateLabel] || [];

  if (!bookingNames.length) {
    document.querySelectorAll(".month-grid button").forEach((dateButton) => {
      dateButton.classList.toggle("selected", dateButton === button);
    });
    openQuickBook(dateLabel);
    return;
  }

  selectBookedDate(dateLabel);
}

function openQuickBook(dateLabel = "May 9") {
  quickBookDate.value = dateLabel;
  quickBookOverlay.classList.add("open");
  quickBookOverlay.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => document.querySelector("#quick-book-customer").focus());
}

function closeQuickBook() {
  quickBookOverlay.classList.remove("open");
  quickBookOverlay.setAttribute("aria-hidden", "true");
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    setView(viewButton.dataset.view);
    showToast(`${viewButton.textContent.trim()} view selected`);
    return;
  }

  const booking = event.target.closest("[data-booking]");
  if (booking) {
    selectBooking(booking.dataset.booking);
    showToast(`${booking.dataset.booking} selected`);
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
  if (action === "new-client") window.location.href = "new-customer-prototype.html";
  if (action === "clients") window.location.href = "customer-list-prototype.html";
  if (action === "options") window.location.href = "options-prototype.html";
  if (action === "language") showToast("Language toggle placeholder");
  if (action === "backup") showToast("Daily backup completed");
  if (action === "new-appointment") openQuickBook("May 9");
  if (action === "open-quick-book") openQuickBook(button.dataset.date || "May 9");
  if (action === "select-month-date") selectMonthDate(button);
  if (action === "toggle-agenda-item") {
    const item = button.closest("[data-agenda-item]");
    const list = item.closest(".agenda-list");

    list.querySelectorAll("[data-agenda-item]").forEach((agendaItem) => {
      agendaItem.classList.toggle("expanded", agendaItem === item);
      agendaItem.querySelector("[data-action='toggle-agenda-item']").setAttribute("aria-expanded", String(agendaItem === item));
    });
  }
  if (action === "close-quick-book") closeQuickBook();
  if (action === "quick-book") {
    closeQuickBook();
    showToast(`Appointment booked for ${quickBookDate.value}`);
  }
  if (action === "open-booking") showToast("Appointment detail modal placeholder");
  if (action === "today") {
    calendarTitle.textContent = "Today";
    calendarRange.textContent = "Saturday, May 9, 2026";
    showToast("Jumped to today");
  }
  if (action === "prev" || action === "next") {
    showToast(action === "prev" ? "Previous range" : "Next range");
  }
});

quickBookOverlay.addEventListener("click", (event) => {
  if (event.target === quickBookOverlay) closeQuickBook();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && quickBookOverlay.classList.contains("open")) {
    closeQuickBook();
  }
});

setView("list");
