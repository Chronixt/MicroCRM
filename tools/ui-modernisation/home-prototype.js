const shell = document.querySelector(".home-shell");
const toast = document.querySelector("#toast");
const appointmentList = document.querySelector("#appointment-list");
const searchInput = document.querySelector("#home-search");
let toastTimer;
let appointmentScenario = "multiple";

const todaysAppointments = [
  {
    client: "Mia Tanaka",
    service: "Colour refresh",
    time: "10:30 AM - 12:00 PM",
    initials: "MT",
    status: "Confirmed",
    notes: "Prefers cooler toner. Check scalp sensitivity."
  },
  {
    client: "Sophie Chen",
    service: "Cut and treatment",
    time: "1:00 PM - 2:15 PM",
    initials: "SC",
    status: "Scheduled",
    notes: "Add bond repair treatment and avoid heavy finishing oils."
  },
  {
    client: "Amber Liu",
    service: "Follow-up consult",
    time: "4:15 PM - 4:45 PM",
    initials: "AL",
    status: "Follow-up",
    notes: "Review previous formula notes before booking next colour service."
  }
];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

function getVisibleAppointments() {
  if (appointmentScenario === "empty") return [];
  if (appointmentScenario === "single") return [todaysAppointments[0]];
  return todaysAppointments;
}

function renderAppointmentDetail(appointment) {
  appointmentList.innerHTML = `
    <div class="today-detail-content">
      <div class="client-card">
        <div class="client-avatar">${appointment.initials}</div>
        <div>
          <strong>${appointment.client}</strong>
          <span>${appointment.service}</span>
        </div>
      </div>
      <dl>
        <div><dt>Time</dt><dd>${appointment.time}</dd></div>
        <div><dt>Status</dt><dd><span class="status-pill">${appointment.status}</span></dd></div>
        <div><dt>Notes</dt><dd>${appointment.notes}</dd></div>
      </dl>
      <button class="button outline full-width" type="button" data-action="open-appointment">
        <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
        Open Details
      </button>
    </div>
  `;
}

function renderAppointmentAgenda(appointments) {
  const items = appointments.map((appointment, index) => {
    const expanded = index === 0;
    const startTime = appointment.time.split(" - ")[0];

    return `
      <article class="agenda-item ${expanded ? "expanded" : ""}" data-agenda-item>
        <button class="agenda-client-button" type="button" data-action="toggle-agenda-item" aria-expanded="${expanded}">
          <div class="client-card agenda-client-card">
            <div class="client-avatar">${appointment.initials}</div>
            <div>
              <strong>${appointment.client}</strong>
              <span>${appointment.service}</span>
            </div>
            <time>${startTime}</time>
          </div>
        </button>
        <div class="agenda-details">
          <div class="agenda-details-inner">
            <dl>
              <div><dt>Time</dt><dd>${appointment.time}</dd></div>
              <div><dt>Status</dt><dd><span class="status-pill">${appointment.status}</span></dd></div>
              <div><dt>Notes</dt><dd>${appointment.notes}</dd></div>
            </dl>
            <button class="button outline full-width" type="button" data-action="open-appointment">
              <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
              Open Details
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  appointmentList.innerHTML = `
    <div class="agenda-list">
      ${items}
    </div>
  `;
}

function renderAppointments() {
  const appointments = getVisibleAppointments();

  if (appointments.length > 1) {
    renderAppointmentAgenda(appointments);
    return;
  }

  if (appointments.length === 1) {
    renderAppointmentDetail(appointments[0]);
    return;
  }

  appointmentList.innerHTML = `
    <div class="appointment-card">
      <time>--</time>
      <div>
        <strong>No appointments today</strong>
        <span>Your schedule is clear.</span>
      </div>
    </div>
  `;
}

function cycleAppointmentScenario() {
  if (appointmentScenario === "multiple") return "single";
  if (appointmentScenario === "single") return "empty";
  return "multiple";
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const { action } = button.dataset;

  if (action === "toggle-sidebar") {
    const isOpen = shell.dataset.sidebar === "open";
    shell.dataset.sidebar = isOpen ? "closed" : "open";
    showToast(isOpen ? "Sidebar collapsed" : "Sidebar expanded");
  }

  if (action === "new-client") window.location.href = "new-customer-prototype.html";
  if (action === "clients") window.location.href = "customer-list-prototype.html";
  if (action === "calendar") window.location.href = "calendar-prototype.html";
  if (action === "options") window.location.href = "options-prototype.html";
  if (action === "language") showToast("Language toggle placeholder");

  if (action === "backup") {
    showToast("Daily backup completed");
    const backupState = document.querySelector(".backup-state p");
    if (backupState) backupState.textContent = "Backup completed just now.";
  }

  if (action === "toggle-agenda-item") {
    const item = button.closest("[data-agenda-item]");
    const list = item.closest(".agenda-list");

    list.querySelectorAll("[data-agenda-item]").forEach((agendaItem) => {
      agendaItem.classList.toggle("expanded", agendaItem === item);
      agendaItem.querySelector("[data-action='toggle-agenda-item']").setAttribute("aria-expanded", String(agendaItem === item));
    });
  }

  if (action === "open-appointment") showToast("Appointment detail modal placeholder");

  if (action === "refresh") {
    appointmentScenario = cycleAppointmentScenario();
    renderAppointments();
    showToast("Appointments refreshed");
  }
});

searchInput.addEventListener("input", () => {
  if (!searchInput.value.trim()) return;
  showToast(`Searching for "${searchInput.value.trim()}"`);
});

renderAppointments();
