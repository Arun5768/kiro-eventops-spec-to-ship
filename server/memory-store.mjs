import { evaluateApplication } from "../src/scoring.mjs";

const DECISIONS = new Set(["", "Invite", "Review", "Waitlist"]);

function clone(value) {
  return structuredClone(value);
}

function matchesMemory(memory, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    memory.event,
    memory.city,
    memory.title,
    memory.summary,
    ...(memory.takeaways || []),
    ...(memory.tags || []),
  ]
    .join(" ")
    .toLowerCase();
  return needle.split(/\s+/).every((term) => haystack.includes(term));
}

export class MemoryEventStore {
  constructor({ applications = [], memories = [] } = {}) {
    this.mode = "memory";
    this.searchMode = "local-token-search";
    this.applications = applications.map((application) => evaluateApplication(clone(application)));
    this.memories = clone(memories);
    this.audit = [];
  }

  async connect() {}

  async close() {}

  async seed({ applications = [], memories = [] }) {
    if (!this.applications.length) {
      this.applications = applications.map((application) => evaluateApplication(clone(application)));
    }
    if (!this.memories.length) this.memories = clone(memories);
    return { applications: this.applications.length, memories: this.memories.length };
  }

  async status() {
    return {
      ok: true,
      mode: this.mode,
      searchMode: this.searchMode,
      database: null,
      privacy: "synthetic-demo-only",
    };
  }

  async listApplications({ query = "", decision = "All", city = "" } = {}) {
    const needle = String(query).trim().toLowerCase();
    return clone(
      this.applications.filter((application) => {
        const matchesQuery =
          !needle || `${application.name} ${application.role} ${application.city}`.toLowerCase().includes(needle);
        const matchesDecision = decision === "All" || application.finalDecision === decision;
        const matchesCity = !city || application.city.toLowerCase() === city.toLowerCase();
        return matchesQuery && matchesDecision && matchesCity;
      }),
    );
  }

  async createApplication(application) {
    const evaluated = evaluateApplication({
      ...clone(application),
      id: application.id || `syn-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      dataClassification: "synthetic-demo",
    });
    this.applications.push(evaluated);
    return clone(evaluated);
  }

  async updateDecision(id, { manualDecision = "", reason = "Organizer review" } = {}) {
    if (!DECISIONS.has(manualDecision)) throw new Error("Unsupported decision");
    const application = this.applications.find((item) => item.id === id);
    if (!application) return null;

    const previousDecision = application.finalDecision;
    application.manualDecision = manualDecision;
    application.finalDecision = manualDecision || application.recommendation;
    const auditEntry = {
      id: `audit-${crypto.randomUUID()}`,
      applicationId: id,
      previousDecision,
      finalDecision: application.finalDecision,
      reason,
      actor: "demo-organizer",
      createdAt: new Date().toISOString(),
    };
    this.audit.push(auditEntry);
    return { application: clone(application), audit: clone(auditEntry) };
  }

  async insights() {
    const byCity = new Map();
    const byDecision = { Invite: 0, Review: 0, Waitlist: 0 };
    for (const application of this.applications) {
      byCity.set(application.city, (byCity.get(application.city) || 0) + 1);
      byDecision[application.finalDecision] = (byDecision[application.finalDecision] || 0) + 1;
    }
    return {
      totalApplications: this.applications.length,
      averageScore: this.applications.length
        ? Math.round(this.applications.reduce((total, item) => total + item.score, 0) / this.applications.length)
        : 0,
      overrides: this.applications.filter((item) => item.manualDecision).length,
      auditEvents: this.audit.length,
      byDecision,
      byCity: [...byCity.entries()]
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city)),
    };
  }

  async searchMemories(query) {
    return clone(this.memories.filter((memory) => matchesMemory(memory, query)).slice(0, 8));
  }
}
