export const RULE_VERSION = "eventops-demo-v1";

const roleWeights = new Map([
  ["developer", 20],
  ["engineer", 20],
  ["builder", 20],
  ["designer", 12],
  ["product", 12],
  ["community", 12],
  ["founder", 12],
]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

function hasValidProof(value) {
  const proof = normalizeText(value);
  if (!proof) return false;

  try {
    const url = new URL(proof);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function roleScore(role) {
  const normalizedRole = normalizeText(role).toLowerCase();
  for (const [keyword, points] of roleWeights) {
    if (normalizedRole.includes(keyword)) return points;
  }
  return 5;
}

export function recommendationForScore(score) {
  if (score >= 70) return "Invite";
  if (score >= 45) return "Review";
  return "Waitlist";
}

export function evaluateApplication(application = {}) {
  const reasons = [];
  let score = 0;

  const motivationLength = normalizeText(application.motivation).length;
  if (motivationLength >= 120) {
    score += 25;
    reasons.push("Specific motivation with enough detail to review (+25)");
  } else if (motivationLength >= 60) {
    score += 15;
    reasons.push("Useful motivation, though still concise (+15)");
  } else {
    reasons.push("Motivation needs more detail (+0)");
  }

  const availableHours = normalizeHours(application.availableHours);
  if (availableHours >= 6) {
    score += 20;
    reasons.push("Availability supports a complete build session (+20)");
  } else if (availableHours >= 3) {
    score += 10;
    reasons.push("Partial but workable availability (+10)");
  } else if (availableHours < 2) {
    score -= 15;
    reasons.push("Very limited availability (-15)");
  } else {
    reasons.push("Availability is below the preferred range (+0)");
  }

  const rolePoints = roleScore(application.role);
  score += rolePoints;
  reasons.push(
    rolePoints === 20
      ? "Direct builder fit (+20)"
      : rolePoints === 12
        ? "Cross-functional event fit (+12)"
        : "Role adds useful cohort variety (+5)",
  );

  if (normalizeText(application.experience).toLowerCase() === "beginner") {
    score += 10;
    reasons.push("Beginner learning opportunity (+10)");
  }

  if (hasValidProof(application.proofUrl)) {
    score += 15;
    reasons.push("Shared existing proof of initiative (+15)");
  } else {
    reasons.push("No reviewable proof link (+0)");
  }

  if (application.buildCommitment === true) {
    score += 10;
    reasons.push("Committed to build and demo (+10)");
  } else {
    reasons.push("Build-and-demo commitment not confirmed (+0)");
  }

  score = Math.max(0, Math.min(100, score));
  const recommendation = recommendationForScore(score);
  const manualDecision = normalizeText(application.manualDecision);

  return {
    ...application,
    availableHours,
    score,
    recommendation,
    reasons,
    finalDecision: manualDecision || recommendation,
  };
}

export function summarizeApplications(applications = []) {
  const evaluated = applications.map(evaluateApplication);
  const decisions = { Invite: 0, Review: 0, Waitlist: 0 };

  for (const application of evaluated) {
    decisions[application.finalDecision] = (decisions[application.finalDecision] || 0) + 1;
  }

  const averageScore = evaluated.length
    ? Math.round(evaluated.reduce((total, item) => total + item.score, 0) / evaluated.length)
    : 0;

  return {
    evaluated,
    metrics: {
      total: evaluated.length,
      averageScore,
      decisions,
      overrides: evaluated.filter((item) => Boolean(item.manualDecision)).length,
    },
  };
}

// ---------------------------------------------------------------------------
// Announcement coordinator — pure scheduling logic (no DOM access)
// ---------------------------------------------------------------------------

/** Priority level for visible user-action confirmations (toast messages). */
export const PRIORITY_ACTION = "action";

/** Priority level for background queue-state summaries. */
export const PRIORITY_SUMMARY = "summary";

/**
 * Milliseconds after a PRIORITY_ACTION announcement during which a
 * PRIORITY_SUMMARY announcement is suppressed.
 *
 * Set to 200 ms beyond the 400 ms debounce so any summary that was already
 * queued before the action fired is also caught.
 */
export const SUMMARY_SUPPRESSION_MS = 600;

/**
 * Decides whether an announcement should be delivered, suppressed, or
 * deduplicated. Pure function — no side effects, no DOM access.
 *
 * @param {object} params
 * @param {string} params.message              - The text to announce.
 * @param {string} params.priority             - PRIORITY_ACTION or PRIORITY_SUMMARY.
 * @param {number} params.lastActionTimestamp  - ms-epoch of the most recent action announcement (0 if none).
 * @param {number} params.now                  - Current ms-epoch timestamp.
 * @param {string} params.lastDeliveredText    - Last text successfully written to the summary region.
 * @returns {{ action: "deliver"|"suppress"|"deduplicate", message: string }}
 */
export function scheduleAnnouncement({ message, priority, lastActionTimestamp, now, lastDeliveredText }) {
  const safeNow = Number.isFinite(now) && now >= 0 ? now : 0;
  const safeLastAction = Number.isFinite(lastActionTimestamp) && lastActionTimestamp > 0 ? lastActionTimestamp : 0;
  const safeMessage = typeof message === "string" ? message : "";
  const safeLastDelivered = typeof lastDeliveredText === "string" ? lastDeliveredText : "";

  // Action-priority messages always deliver — they are the toast and take no
  // guard from the summary suppression window.
  if (priority === PRIORITY_ACTION) {
    return { action: "deliver", message: safeMessage };
  }

  // 0 is the sentinel meaning "no action has ever fired". Never suppress in
  // that case regardless of how small now is (e.g. synthetic test timestamps).
  // elapsed === 0 means the action and the summary share the exact same
  // timestamp — this is a genuine same-moment action and must suppress.
  // Negative elapsed means now < lastAction (clock inversion); do not suppress.
  const elapsed = safeLastAction === 0 ? Infinity : safeNow - safeLastAction;
  if (elapsed >= 0 && elapsed < SUMMARY_SUPPRESSION_MS) {
    return { action: "suppress", message: safeMessage };
  }

  // Skip re-announcing identical consecutive text so a filter reset to the
  // same state does not produce a redundant announcement.
  if (safeMessage === safeLastDelivered) {
    return { action: "deduplicate", message: safeMessage };
  }

  return { action: "deliver", message: safeMessage };
}

// ---------------------------------------------------------------------------

/**
 * Returns a concise, screen-reader-friendly summary of the current queue view.
 * Pure function: no DOM access, no side effects.
 *
 * @param {object} params
 * @param {number} params.visibleCount   - Number of applications currently shown.
 * @param {number} params.totalCount     - Total applications in the queue.
 * @param {string} params.activeFilter   - The active decision filter ("All", "Invite", "Review", "Waitlist").
 * @param {object} params.decisions      - Counts keyed by decision label.
 * @param {number} params.overrides      - Number of manual override decisions.
 * @returns {string} A plain-text announcement suitable for an ARIA live region.
 */
export function computeFilterSummary({ visibleCount, totalCount, activeFilter, decisions, overrides }) {
  const safeVisible = Number.isFinite(visibleCount) && visibleCount >= 0 ? visibleCount : 0;
  const safeTotal = Number.isFinite(totalCount) && totalCount >= 0 ? totalCount : 0;
  const filter = typeof activeFilter === "string" && activeFilter.trim() ? activeFilter.trim() : "All";
  const safeDecisions = decisions && typeof decisions === "object" ? decisions : {};
  const safeOverrides = Number.isFinite(overrides) && overrides >= 0 ? overrides : 0;

  const invite = safeDecisions.Invite ?? 0;
  const review = safeDecisions.Review ?? 0;
  const waitlist = safeDecisions.Waitlist ?? 0;

  const filterLabel = filter === "All" ? "all decisions" : `filter: ${filter}`;
  const visibleLabel = safeVisible === 1 ? "1 application" : `${safeVisible} applications`;
  const overrideLabel =
    safeOverrides === 0
      ? "no manual overrides"
      : safeOverrides === 1
        ? "1 manual override"
        : `${safeOverrides} manual overrides`;

  if (safeTotal === 0) {
    return "Queue is empty.";
  }

  if (safeVisible === 0) {
    return `No applications match ${filterLabel}. Queue total: ${safeTotal}.`;
  }

  return (
    `Showing ${visibleLabel} for ${filterLabel}. ` +
    `Queue: ${invite} invite, ${review} review, ${waitlist} waitlist. ` +
    `${overrideLabel}.`
  );
}

