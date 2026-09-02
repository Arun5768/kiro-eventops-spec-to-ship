import { seedApplications } from "./data.mjs";
import { seedMemories } from "./memory-data.mjs";
import {
  RULE_VERSION,
  summarizeApplications,
  computeFilterSummary,
  scheduleAnnouncement,
  PRIORITY_SUMMARY,
} from "./scoring.mjs";

const storageKey = "eventops-demo-applications-v1";
const decisionOptions = ["Invite", "Review", "Waitlist"];

const elements = {
  grid: document.querySelector("#application-grid"),
  empty: document.querySelector("#empty-state"),
  search: document.querySelector("#search-input"),
  filters: [...document.querySelectorAll("[data-filter]")],
  visibleCount: document.querySelector("#visible-count"),
  resetFilters: document.querySelector("#reset-filters"),
  form: document.querySelector("#intake-form"),
  resetData: document.querySelector("#reset-data"),
  exportButton: document.querySelector("#export-button"),
  toast: document.querySelector("#toast"),
  queueSummary: document.querySelector("#queue-summary"),
  dataMode: document.querySelector("#data-mode"),
  searchMode: document.querySelector("#search-mode"),
  memoryForm: document.querySelector("#memory-form"),
  memoryQuery: document.querySelector("#memory-query"),
  memoryMeta: document.querySelector("#memory-meta"),
  memoryResults: document.querySelector("#memory-results"),
  metrics: {
    total: document.querySelector("#metric-total"),
    invite: document.querySelector("#metric-invite"),
    review: document.querySelector("#metric-review"),
    average: document.querySelector("#metric-average"),
  },
};

let state = {
  applications: loadApplications(),
  filter: "All",
  search: "",
  backendAvailable: false,
  storageMode: "browser-local",
  searchMode: "local-token-search",
};

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.json();
}

function updateDataMode() {
  const label =
    state.storageMode === "mongodb"
      ? "MONGODB LIVE"
      : state.backendAvailable
        ? "IN-MEMORY API"
        : "BROWSER-LOCAL DEMO";
  elements.dataMode.lastChild.textContent = ` ${label}`;
  elements.searchMode.textContent = state.searchMode.replaceAll("-", " ").toUpperCase();
}

async function connectBackend() {
  try {
    const status = await apiRequest("/api/status");
    state.backendAvailable = true;
    state.storageMode = status.mode;
    state.searchMode = status.searchMode;
    state.applications = await apiRequest("/api/applications");
  } catch {
    state.backendAvailable = false;
    state.storageMode = "browser-local";
    state.searchMode = "local-token-search";
  }
  updateDataMode();
  render();
  await searchCommunityMemory("");
}

function loadApplications() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    localStorage.removeItem(storageKey);
  }
  return structuredClone(seedApplications);
}

function persistApplications() {
  if (!state.backendAvailable) localStorage.setItem(storageKey, JSON.stringify(state.applications));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function decisionClass(decision) {
  return `decision-${decision.toLowerCase()}`;
}

function filteredApplications(evaluated) {
  const search = state.search.toLowerCase();
  return evaluated.filter((application) => {
    const matchesDecision = state.filter === "All" || application.finalDecision === state.filter;
    const haystack = `${application.name} ${application.role} ${application.city}`.toLowerCase();
    return matchesDecision && (!search || haystack.includes(search));
  });
}

function applicationCard(application, index) {
  const override = application.manualDecision
    ? `<p class="override-note">Recommended ${escapeHtml(application.recommendation)} · organizer chose ${escapeHtml(application.finalDecision)}</p>`
    : `<p class="override-note">No manual override</p>`;

  const options = ["", ...decisionOptions]
    .map((decision) => {
      const label = decision || "Use recommendation";
      const selected = application.manualDecision === decision ? " selected" : "";
      return `<option value="${escapeHtml(decision)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");

  return `
    <article class="application-card">
      <div class="application-main">
        <div class="application-kicker">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <span>${escapeHtml(application.city || "City not supplied")}</span>
          <span>${escapeHtml(application.experience || "Experience not supplied")}</span>
          <span>${application.availableHours}h available</span>
        </div>
        <h3>${escapeHtml(application.name || "Unnamed demo applicant")}</h3>
        <p class="applicant-role">${escapeHtml(application.role || "Role not supplied")}</p>
        <p class="motivation">${escapeHtml(application.motivation || "No motivation supplied.")}</p>
        <ul class="reason-list">
          ${application.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
        </ul>
      </div>
      <aside class="application-side" aria-label="Decision for ${escapeHtml(application.name)}">
        <div class="score-ring"><div><strong>${application.score}</strong><span>/ 100</span></div></div>
        <div class="decision-badge ${decisionClass(application.finalDecision)}">${escapeHtml(application.finalDecision)}</div>
        ${override}
        <div class="manual-controls">
          <label for="decision-${escapeHtml(application.id)}">ORGANIZER DECISION</label>
          <select id="decision-${escapeHtml(application.id)}" data-decision-id="${escapeHtml(application.id)}">
            ${options}
          </select>
        </div>
      </aside>
    </article>`;
}

function render() {
  const summary = summarizeApplications(state.applications);
  const evaluated = [...summary.evaluated].sort((a, b) => b.score - a.score);
  const visible = filteredApplications(evaluated);

  elements.metrics.total.textContent = summary.metrics.total;
  elements.metrics.invite.textContent = summary.metrics.decisions.Invite || 0;
  elements.metrics.review.textContent = summary.metrics.decisions.Review || 0;
  elements.metrics.average.textContent = summary.metrics.averageScore;
  elements.visibleCount.textContent = `${visible.length} visible`;
  elements.grid.innerHTML = visible.map(applicationCard).join("");
  elements.empty.hidden = visible.length !== 0;

  debouncedUpdateQueueSummary(visible.length, summary.metrics);

  document.querySelectorAll("[data-decision-id]").forEach((select) => {
    select.addEventListener("change", handleDecisionChange);
  });
}

async function handleDecisionChange(event) {
  const id = event.currentTarget.dataset.decisionId;
  const manualDecision = event.currentTarget.value;
  try {
    if (state.backendAvailable) {
      const result = await apiRequest(`/api/applications/${encodeURIComponent(id)}/decision`, {
        method: "PATCH",
        body: JSON.stringify({ manualDecision, reason: "Decision changed in the Community Memory review desk" }),
      });
      state.applications = state.applications.map((application) =>
        application.id === id ? result.application : application,
      );
    } else {
      state.applications = state.applications.map((application) =>
        application.id === id
          ? { ...application, manualDecision, finalDecision: manualDecision || application.recommendation }
          : application,
      );
      persistApplications();
    }
    render();
    showToast(manualDecision ? "Organizer decision recorded with an audit event." : "Recommendation restored as final decision.");
  } catch (error) {
    showToast(`Decision was not saved: ${error.message}`);
  }
}

function resetFilters() {
  state.filter = "All";
  state.search = "";
  elements.search.value = "";
  elements.filters.forEach((button) => button.classList.toggle("is-active", button.dataset.filter === "All"));
  render();
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const application = {
    id: `local-${Date.now()}`,
    name: data.get("name"),
    role: data.get("role"),
    city: data.get("city"),
    experience: data.get("experience"),
    motivation: data.get("motivation"),
    availableHours: Number(data.get("availableHours")),
    proofUrl: data.get("proofUrl"),
    buildCommitment: data.get("buildCommitment") === "on",
    manualDecision: "",
  };

  try {
    if (state.backendAvailable) {
      const created = await apiRequest("/api/applications", {
        method: "POST",
        body: JSON.stringify({ ...application, dataClassification: "synthetic-demo" }),
      });
      state.applications = [...state.applications, created];
    } else {
      state.applications = [...state.applications, application];
      persistApplications();
    }
    event.currentTarget.reset();
    resetFilters();
    document.querySelector("#application-queue").scrollIntoView({ behavior: "smooth" });
    showToast(
      state.storageMode === "mongodb"
        ? "Synthetic application scored and stored in MongoDB."
        : "Synthetic application scored in demo mode.",
    );
  } catch (error) {
    showToast(`Application was not saved: ${error.message}`);
  }
}

function localMemorySearch(query) {
  const terms = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  return seedMemories.filter((memory) => {
    const haystack = [memory.event, memory.city, memory.title, memory.summary, ...(memory.takeaways || []), ...(memory.tags || [])]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

function renderMemories(memories) {
  elements.memoryResults.innerHTML = memories
    .map(
      (memory) => `
        <article class="memory-card">
          <div class="memory-kicker"><span>${escapeHtml(memory.city)}</span><span>${escapeHtml(memory.event)}</span></div>
          <h3>${escapeHtml(memory.title)}</h3>
          <p>${escapeHtml(memory.summary)}</p>
          <ul>${(memory.takeaways || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          <div class="memory-tags">${(memory.tags || []).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}</div>
        </article>`,
    )
    .join("");
  elements.memoryMeta.textContent = memories.length
    ? `${memories.length} synthetic memories · ${state.searchMode.replaceAll("-", " ")}`
    : "No synthetic memories matched. Try a broader query.";
}

async function searchCommunityMemory(query) {
  try {
    if (state.backendAvailable) {
      const response = await apiRequest(`/api/memory/search?q=${encodeURIComponent(query)}`);
      state.searchMode = response.searchMode;
      updateDataMode();
      renderMemories(response.results);
    } else {
      renderMemories(localMemorySearch(query));
    }
  } catch (error) {
    renderMemories([]);
    elements.memoryMeta.textContent = `Memory search unavailable: ${error.message}`;
  }
}

function exportEvidence() {
  const summary = summarizeApplications(state.applications);
  const payload = {
    generatedAt: new Date().toISOString(),
    ruleVersion: RULE_VERSION,
    dataClassification: "synthetic-demo",
    metrics: summary.metrics,
    records: summary.evaluated.map((application) => ({
      id: application.id,
      name: application.name,
      role: application.role,
      city: application.city,
      score: application.score,
      recommendation: application.recommendation,
      manualDecision: application.manualDecision || null,
      finalDecision: application.finalDecision,
      reasons: application.reasons,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `eventops-evidence-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Evidence snapshot exported locally.");
}

let toastTimer;
function showToast(message) {
  // Record the timestamp so updateQueueSummary can suppress any summary that
  // fires within SUMMARY_SUPPRESSION_MS of this action announcement.
  lastActionTimestamp = Date.now();
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 3200);
}

// ---------------------------------------------------------------------------
// Announcement coordinator state
// ---------------------------------------------------------------------------
// Tracks when the most recent action-priority (toast) announcement fired so
// that updateQueueSummary can suppress a competing polite announcement within
// the SUMMARY_SUPPRESSION_MS window defined in scoring.mjs.
let lastActionTimestamp = 0;

// Tracks the last text successfully written to #queue-summary so identical
// consecutive summaries are not re-announced on re-renders that produce no
// visible state change.
let lastSummaryText = "";

// ---------------------------------------------------------------------------

// Debounce helper: delays fn by ms after the last call, preventing rapid-fire
// announcements to screen readers while the user types in the search box.
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Write the queue summary into the ARIA live region — but only if the
// coordinator determines the message should be delivered right now.
// Called through a debounced wrapper so keystrokes don't produce a new
// announcement on every character — only after typing pauses.
function updateQueueSummary(visibleCount, metrics) {
  const text = computeFilterSummary({
    visibleCount,
    totalCount: metrics.total,
    activeFilter: state.filter,
    decisions: metrics.decisions,
    overrides: metrics.overrides,
  });

  const decision = scheduleAnnouncement({
    message: text,
    priority: PRIORITY_SUMMARY,
    lastActionTimestamp,
    now: Date.now(),
    lastDeliveredText: lastSummaryText,
  });

  if (decision.action !== "deliver") return;

  lastSummaryText = text;

  // Clear then set in the same microtask so AT always sees a fresh update,
  // even when the text is identical (e.g., resetting to the same filter).
  elements.queueSummary.textContent = "";
  // A brief setTimeout lets the DOM register the empty state before the new
  // content is inserted, which improves re-announcement in some screen readers.
  setTimeout(() => {
    elements.queueSummary.textContent = text;
  }, 0);
}

const debouncedUpdateQueueSummary = debounce(updateQueueSummary, 400);

elements.search.addEventListener("input", (event) => {
  state.search = event.currentTarget.value.trim();
  render();
});

elements.filters.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    elements.filters.forEach((item) => item.classList.toggle("is-active", item === button));
    render();
  });
});

elements.resetFilters.addEventListener("click", resetFilters);
elements.form.addEventListener("submit", handleFormSubmit);
elements.memoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchCommunityMemory(elements.memoryQuery.value);
});
elements.exportButton.addEventListener("click", exportEvidence);
elements.resetData.addEventListener("click", () => {
  if (state.backendAvailable) {
    showToast("Server-backed demo data is reset with the seed command, not from the browser.");
    return;
  }
  state.applications = structuredClone(seedApplications);
  localStorage.removeItem(storageKey);
  resetFilters();
  showToast("Demo data reset to the synthetic seed set.");
});

render();
connectBackend();

