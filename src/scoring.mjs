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

