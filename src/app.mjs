import { seedApplications } from "./data.mjs";
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
};

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
  localStorage.setItem(storageKey, JSON.stringify(state.applications));
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

function handleDecisionChange(event) {
  const id = event.currentTarget.dataset.decisionId;
  state.applications = state.applications.map((application) =>
    application.id === id ? { ...application, manualDecision: event.currentTarget.value } : application,
  );
  persistApplications();
  render();
  showToast(event.currentTarget.value ? "Organizer decision recorded." : "Recommendation restored as final decision.");
}

function resetFilters() {
  state.filter = "All";
  state.search = "";
  elements.search.value = "";
  elements.filters.forEach((button) => button.classList.toggle("is-active", button.dataset.filter === "All"));
  render();
}

function handleFormSubmit(event) {
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

  state.applications = [...state.applications, application];
  persistApplications();
  event.currentTarget.reset();
  resetFilters();
  document.querySelector("#application-queue").scrollIntoView({ behavior: "smooth" });
  showToast("Synthetic application scored locally. No packets left the browser.");
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
elements.exportButton.addEventListener("click", exportEvidence);
elements.resetData.addEventListener("click", () => {
  state.applications = structuredClone(seedApplications);
  localStorage.removeItem(storageKey);
  resetFilters();
  showToast("Demo data reset to the synthetic seed set.");
});

render();

