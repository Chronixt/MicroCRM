const notes = [
  {
    id: "n1",
    date: "Oct 12, 2023",
    tag: "Styling",
    type: "text",
    body: "Client preferred the lighter shade during last coloring session. Mentioned scalp sensitivity around the temples.",
    pinned: false
  },
  {
    id: "n2",
    date: "Sep 05, 2023",
    tag: "Handwritten",
    type: "handwritten",
    body: "",
    pinned: false
  }
];

const pinnedNotes = [
  {
    id: "p1",
    label: "Medical Alert",
    body: "Allergic to botanical oils. Use synthetic alternatives exclusively.",
    highlight: true
  },
  {
    id: "p2",
    label: "Preference",
    body: '"Always needs extra neck support during rinsing."',
    highlight: false
  }
];

const shell = document.querySelector(".prototype-shell");
const noteForm = document.querySelector("#note-form");
const noteInput = document.querySelector("#note-input");
const segmentedControl = document.querySelector(".segmented-control");
const notesList = document.querySelector("#notes-list");
const pinnedList = document.querySelector("#pinned-list");
const toast = document.querySelector("#toast");
const editorModal = document.querySelector("#editor-modal");
const expandedNoteInput = document.querySelector("#expanded-note-input");
const editorSurface = document.querySelector(".editor-surface");
const editorTitle = document.querySelector("#editor-title");
const pinExpandedNote = document.querySelector("#pin-expanded-note");
const handwritingCanvas = document.querySelector("#handwriting-canvas");
const brushSize = document.querySelector("#brush-size");
const brushSizeLabel = document.querySelector("#brush-size-label");
const markdownPreviewContent = document.querySelector("#markdown-preview-content");
let activeMode = "text";
let toastTimer;
let activeInkColor = "#ffffff";
let activeCanvasTool = "pencil";
let drawing = false;
let lastPoint = null;
let canvasSnapshot = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

function makePinIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 12V4l1-1V2H7v1l1 1v8l-2 2v2h7v7l1 1 1-1v-7h7v-2l-2-2Z" /></svg>';
}

function renderPinnedNotes() {
  pinnedList.innerHTML = pinnedNotes
    .map((note) => {
      const body = note.body.startsWith('"') ? `<em>${note.body}</em>` : note.body;
      return `
        <article class="pinned-card ${note.highlight ? "highlight" : ""}">
          <span>${note.label}</span>
          <p>${body}</p>
          <button class="pin-button" type="button" aria-label="Unpin ${note.label}" data-action="remove-pinned" data-id="${note.id}">
            ${makePinIcon()}
          </button>
        </article>
      `;
    })
    .join("");
}

function renderCanvasPreview() {
  return `
    <div class="canvas-preview">
      <svg viewBox="0 0 360 110" aria-hidden="true">
        <path d="M24 62 C 72 10, 108 104, 164 56 S 248 14, 322 64" stroke="#22d3ee" stroke-width="6" />
        <path d="M58 84 H 298" stroke="#22d3ee" stroke-width="3" stroke-dasharray="9 9" opacity="0.7" />
      </svg>
      <span class="canvas-label">Imported PDF Sketch</span>
    </div>
  `;
}

function renderNotes() {
  notesList.innerHTML = notes
    .map((note) => {
      const tagClass = note.tag.toLowerCase();
      const body = note.type === "handwritten" ? renderCanvasPreview() : `<p>${note.body}</p>`;
      return `
        <article class="note-card">
          <div class="note-topline">
            <div class="note-meta">
              <span class="note-date">${note.date}</span>
              <span class="note-tag ${tagClass}">${note.tag}</span>
            </div>
            <div class="note-actions">
              <button type="button" title="Pin note" aria-label="Pin note" data-action="pin-note" data-id="${note.id}">
                ${makePinIcon()}
              </button>
              ${note.type === "text" ? '<button type="button" title="Edit note" aria-label="Edit note" data-action="edit-note" data-id="' + note.id + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg></button>' : ""}
            </div>
          </div>
          ${body}
        </article>
      `;
    })
    .join("");
}

function setMode(mode) {
  activeMode = mode;
  segmentedControl.dataset.activeMode = mode;
  document.querySelectorAll("[data-mode]").forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });

  noteInput.placeholder =
    mode === "handwriting"
      ? "Add a quick description for the handwriting note..."
      : "Type a new note or detail for Amber...";
  showToast(mode === "handwriting" ? "Handwriting mode selected" : "Typing mode selected");
}

function setExpandedEditorMode(mode) {
  const isHandwriting = mode === "handwriting";
  editorSurface.dataset.editorMode = isHandwriting ? "handwriting" : "text";
  editorModal.dataset.noteMode = isHandwriting ? "handwriting" : "text";
  editorTitle.textContent = "Add Note";

  document.querySelectorAll("[data-editor-tool]").forEach((button) => {
    const tool = button.dataset.editorTool;
    button.classList.toggle("active", isHandwriting && tool === "pencil");
  });

  if (isHandwriting) {
    resizeCanvas();
  } else {
    updateMarkdownPreview();
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function renderMarkdown(value) {
  const lines = value.split(/\r?\n/);
  const html = [];
  let inList = false;

  lines.forEach((line) => {
    if (/^\s*-\s+/.test(line)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(line.replace(/^\s*-\s+/, ""))}</li>`);
      return;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }

    if (!line.trim()) return;
    if (line.startsWith("# ")) {
      html.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      html.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
    } else if (line.startsWith("> ")) {
      html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
    } else {
      html.push(`<p>${inlineMarkdown(line)}</p>`);
    }
  });

  if (inList) html.push("</ul>");
  return html.join("") || "<p>Add text to see a formatted preview.</p>";
}

function updateMarkdownPreview() {
  markdownPreviewContent.innerHTML = renderMarkdown(expandedNoteInput.value);
}

function wrapSelection(before, after = before, fallback = "text") {
  const start = expandedNoteInput.selectionStart;
  const end = expandedNoteInput.selectionEnd;
  const value = expandedNoteInput.value;
  const selected = value.slice(start, end) || fallback;
  expandedNoteInput.value = value.slice(0, start) + before + selected + after + value.slice(end);
  expandedNoteInput.focus();
  expandedNoteInput.setSelectionRange(start + before.length, start + before.length + selected.length);
  updateMarkdownPreview();
}

function applyTextFormat(format) {
  if (editorSurface.dataset.editorMode !== "text") return;
  if (format === "bold") wrapSelection("**", "**", "important detail");
  if (format === "italic") wrapSelection("*", "*", "preference");
  if (format === "heading") wrapSelection("## ", "", "Heading");
  if (format === "list") wrapSelection("- ", "", "List item");
  if (format === "quote") wrapSelection("> ", "", "Quoted note");
  if (format === "link") wrapSelection("[", "](https://example.com)", "link text");
}

function openExpandedEditor() {
  expandedNoteInput.value = noteInput.value;
  pinExpandedNote.checked = false;
  setExpandedEditorMode(activeMode);
  editorModal.classList.add("open");
  editorModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    if (activeMode === "handwriting") {
      resizeCanvas();
      handwritingCanvas.focus();
    } else {
      expandedNoteInput.focus();
    }
  });
}

function closeExpandedEditor() {
  noteInput.value = expandedNoteInput.value;
  editorModal.classList.remove("open");
  editorModal.setAttribute("aria-hidden", "true");
  noteInput.focus();
}

function saveNote(value, focusTarget = noteInput, options = {}) {
  const trimmedValue = value.trim();
  const isHandwriting = options.type === "handwriting" || activeMode === "handwriting";
  if (!trimmedValue && !isHandwriting) {
    showToast("Add note text first");
    focusTarget.focus();
    return false;
  }

  const newNote = {
    id: `n-${Date.now()}`,
    date: new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date()),
    tag: isHandwriting ? "Handwritten" : "Text",
    type: isHandwriting ? "handwritten" : "text",
    body: trimmedValue || "Handwritten canvas note",
    pinned: false
  };

  notes.unshift(newNote);

  noteInput.value = "";
  expandedNoteInput.value = "";
  renderNotes();

  if (options.pin) {
    pinnedNotes.unshift({
      id: `p-${newNote.id}`,
      label: newNote.tag,
      body: newNote.type === "handwritten" ? "Handwritten sketch from " + newNote.date : newNote.body,
      highlight: false
    });
    renderPinnedNotes();
  }

  showToast("Note saved");
  return true;
}

function resizeCanvas() {
  const rect = handwritingCanvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * scale));
  const height = Math.max(1, Math.floor(rect.height * scale));
  if (handwritingCanvas.width === width && handwritingCanvas.height === height) return;

  handwritingCanvas.width = width;
  handwritingCanvas.height = height;
  const context = handwritingCanvas.getContext("2d");
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.lineCap = "round";
  context.lineJoin = "round";
}

function canvasPoint(event) {
  const rect = handwritingCanvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  return {
    x: point.clientX - rect.left,
    y: point.clientY - rect.top
  };
}

function startDrawing(event) {
  if (editorSurface.dataset.editorMode !== "handwriting") return;
  event.preventDefault();
  resizeCanvas();
  canvasSnapshot = handwritingCanvas.getContext("2d").getImageData(0, 0, handwritingCanvas.width, handwritingCanvas.height);
  drawing = true;
  lastPoint = canvasPoint(event);
}

function draw(event) {
  if (!drawing || editorSurface.dataset.editorMode !== "handwriting") return;
  event.preventDefault();
  const point = canvasPoint(event);
  const context = handwritingCanvas.getContext("2d");
  context.strokeStyle = activeCanvasTool === "eraser" ? "#111b2d" : activeInkColor;
  context.lineWidth = activeCanvasTool === "eraser" ? Number(brushSize.value) * 3 : Number(brushSize.value);
  context.beginPath();
  context.moveTo(lastPoint.x, lastPoint.y);
  context.lineTo(point.x, point.y);
  context.stroke();
  lastPoint = point;
}

function stopDrawing() {
  drawing = false;
  lastPoint = null;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const { action, id, mode } = button.dataset;

  const routes = {
    home: "home-prototype.html",
    "new-client": "new-customer-prototype.html",
    clients: "customer-list-prototype.html",
    calendar: "calendar-prototype.html",
    options: "options-prototype.html"
  };

  if (routes[action]) {
    window.location.href = routes[action];
    return;
  }

  if (mode) {
    setMode(mode);
    return;
  }

  if (action === "toggle-sidebar") {
    const isOpen = shell.dataset.sidebar === "open";
    shell.dataset.sidebar = isOpen ? "closed" : "open";
    button.setAttribute("aria-label", isOpen ? "Expand sidebar" : "Collapse sidebar");
    showToast(isOpen ? "Sidebar collapsed" : "Sidebar expanded");
  }

  if (action === "add-note") {
    noteInput.focus();
  }

  if (action === "backup") {
    showToast("Backup action triggered for prototype");
  }

  if (action === "call") {
    showToast("Calling Amber Liu");
  }

  if (action === "message") {
    showToast("Opening message thread");
  }

  if (action === "attach") {
    showToast("Attachment picker placeholder");
  }

  if (action === "expand-note") {
    openExpandedEditor();
  }

  if (action === "close-editor") {
    closeExpandedEditor();
  }

  if (action === "save-expanded-note") {
    const expandedMode = editorSurface.dataset.editorMode === "handwriting" ? "handwriting" : "text";
    if (saveNote(expandedNoteInput.value, expandedMode === "text" ? expandedNoteInput : noteInput, { type: expandedMode, pin: pinExpandedNote.checked })) {
      editorModal.classList.remove("open");
      editorModal.setAttribute("aria-hidden", "true");
    }
  }

  if (action === "clear-editor") {
    if (editorSurface.dataset.editorMode === "handwriting") {
      const context = handwritingCanvas.getContext("2d");
      context.clearRect(0, 0, handwritingCanvas.width, handwritingCanvas.height);
    } else {
      expandedNoteInput.value = "";
      updateMarkdownPreview();
      expandedNoteInput.focus();
    }
    showToast("Editor cleared");
  }

  if (action === "undo-canvas") {
    if (canvasSnapshot && editorSurface.dataset.editorMode === "handwriting") {
      handwritingCanvas.getContext("2d").putImageData(canvasSnapshot, 0, 0);
      showToast("Canvas undo");
    } else {
      showToast("Nothing to undo yet");
    }
  }

  if (action === "schedule") {
    showToast("Schedule flow placeholder");
  }

  if (action === "pin-note") {
    const note = notes.find((item) => item.id === id);
    if (!note) return;

    pinnedNotes.unshift({
      id: `p-${note.id}`,
      label: note.tag,
      body: note.type === "handwritten" ? "Handwritten sketch from " + note.date : note.body,
      highlight: note.tag === "Styling"
    });
    renderPinnedNotes();
    showToast("Note pinned");
  }

  if (action === "remove-pinned") {
    const index = pinnedNotes.findIndex((note) => note.id === id);
    if (index >= 0) {
      pinnedNotes.splice(index, 1);
      renderPinnedNotes();
      showToast("Pinned note removed");
    }
  }

  if (action === "edit-note") {
    const note = notes.find((item) => item.id === id);
    if (!note) return;
    noteInput.value = note.body;
    noteInput.focus();
    showToast("Note loaded into composer");
  }
});

document.addEventListener("click", (event) => {
  const toolButton = event.target.closest("[data-editor-tool]");
  if (toolButton) {
    document.querySelectorAll("[data-editor-tool]").forEach((button) => button.classList.remove("active"));
    toolButton.classList.add("active");
    activeCanvasTool = toolButton.dataset.editorTool;
    showToast(`${toolButton.textContent.trim()} selected`);
  }

  const formatButton = event.target.closest("[data-format]");
  if (formatButton) {
    applyTextFormat(formatButton.dataset.format);
  }

  const swatch = event.target.closest(".color-swatch");
  if (swatch) {
    document.querySelectorAll(".color-swatch").forEach((button) => button.classList.remove("active"));
    swatch.classList.add("active");
    activeInkColor = getComputedStyle(swatch).backgroundColor;
  }
});

editorModal.addEventListener("click", (event) => {
  if (event.target === editorModal) {
    closeExpandedEditor();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && editorModal.classList.contains("open")) {
    closeExpandedEditor();
  }
});

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveNote(noteInput.value, noteInput);
});

brushSize.addEventListener("input", () => {
  brushSizeLabel.textContent = `${brushSize.value}px`;
});

expandedNoteInput.addEventListener("input", updateMarkdownPreview);

handwritingCanvas.addEventListener("pointerdown", startDrawing);
handwritingCanvas.addEventListener("pointermove", draw);
handwritingCanvas.addEventListener("pointerup", stopDrawing);
handwritingCanvas.addEventListener("pointercancel", stopDrawing);
handwritingCanvas.addEventListener("pointerleave", stopDrawing);
window.addEventListener("resize", () => {
  if (editorModal.classList.contains("open")) resizeCanvas();
});

renderPinnedNotes();
renderNotes();
segmentedControl.dataset.activeMode = activeMode;
