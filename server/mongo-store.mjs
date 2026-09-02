import { MongoClient, ServerApiVersion } from "mongodb";
import { evaluateApplication } from "../src/scoring.mjs";

const DECISIONS = new Set(["", "Invite", "Review", "Waitlist"]);

function withoutMongoId(document) {
  if (!document) return document;
  const { _id, ...rest } = document;
  return rest;
}

export class MongoEventStore {
  constructor({ uri, databaseName = "eventops_community_memory", searchIndex = "eventops_memory_search" }) {
    if (!uri) throw new Error("MONGODB_URI is required for MongoDB mode");
    this.mode = "mongodb";
    this.databaseName = databaseName;
    this.searchIndex = searchIndex;
    this.searchMode = "atlas-search";
    this.client = new MongoClient(uri, {
      appName: "eventops-community-memory",
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
      serverSelectionTimeoutMS: 5000,
    });
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(this.databaseName);
    this.applications = this.db.collection("applications");
    this.memories = this.db.collection("event_memories");
    this.audit = this.db.collection("decision_audit");
    await this.db.command({ ping: 1 });
    await Promise.all([
      this.applications.createIndex({ id: 1 }, { unique: true }),
      this.applications.createIndex({ city: 1, finalDecision: 1, score: -1 }),
      this.memories.createIndex({ id: 1 }, { unique: true }),
      this.memories.createIndex(
        { title: "text", summary: "text", takeaways: "text", tags: "text", city: "text" },
        { name: "eventops_memory_text" },
      ),
      this.audit.createIndex({ applicationId: 1, createdAt: -1 }),
    ]);
  }

  async close() {
    await this.client.close();
  }

  async seed({ applications = [], memories = [] }) {
    const evaluatedApplications = applications.map((application) => ({
      ...evaluateApplication(application),
      dataClassification: "synthetic-demo",
      updatedAt: new Date(),
    }));

    if (evaluatedApplications.length) {
      await this.applications.bulkWrite(
        evaluatedApplications.map((application) => ({
          updateOne: {
            filter: { id: application.id },
            update: { $set: application, $setOnInsert: { createdAt: new Date() } },
            upsert: true,
          },
        })),
      );
    }

    if (memories.length) {
      await this.memories.bulkWrite(
        memories.map((memory) => ({
          updateOne: {
            filter: { id: memory.id },
            update: {
              $set: { ...memory, occurredAt: new Date(memory.occurredAt), updatedAt: new Date() },
              $setOnInsert: { createdAt: new Date() },
            },
            upsert: true,
          },
        })),
      );
    }

    return {
      applications: await this.applications.countDocuments(),
      memories: await this.memories.countDocuments(),
    };
  }

  async status() {
    await this.db.command({ ping: 1 });
    return {
      ok: true,
      mode: this.mode,
      searchMode: this.searchMode,
      database: this.databaseName,
      privacy: "synthetic-demo-only",
    };
  }

  async listApplications({ query = "", decision = "All", city = "" } = {}) {
    const filter = {};
    if (query) {
      const escaped = String(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["name", "role", "city"].map((field) => ({ [field]: { $regex: escaped, $options: "i" } }));
    }
    if (decision !== "All") filter.finalDecision = decision;
    if (city) filter.city = city;
    const documents = await this.applications.find(filter, { projection: { _id: 0 } }).sort({ score: -1, id: 1 }).toArray();
    return documents;
  }

  async createApplication(application) {
    const evaluated = evaluateApplication({
      ...application,
      id: application.id || `syn-${crypto.randomUUID()}`,
      dataClassification: "synthetic-demo",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.applications.insertOne(evaluated);
    return withoutMongoId(evaluated);
  }

  async updateDecision(id, { manualDecision = "", reason = "Organizer review" } = {}) {
    if (!DECISIONS.has(manualDecision)) throw new Error("Unsupported decision");
    const current = await this.applications.findOne({ id });
    if (!current) return null;

    const finalDecision = manualDecision || current.recommendation;
    await this.applications.updateOne(
      { id },
      { $set: { manualDecision, finalDecision, updatedAt: new Date() } },
    );

    const auditEntry = {
      id: `audit-${crypto.randomUUID()}`,
      applicationId: id,
      previousDecision: current.finalDecision,
      finalDecision,
      reason,
      actor: "demo-organizer",
      createdAt: new Date(),
    };
    await this.audit.insertOne(auditEntry);
    const application = await this.applications.findOne({ id }, { projection: { _id: 0 } });
    return { application, audit: withoutMongoId(auditEntry) };
  }

  async insights() {
    const [overview = {}] = await this.applications
      .aggregate([
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalApplications: { $sum: 1 },
                  averageScore: { $avg: "$score" },
                  overrides: { $sum: { $cond: [{ $ne: ["$manualDecision", ""] }, 1, 0] } },
                },
              },
            ],
            byDecision: [{ $group: { _id: "$finalDecision", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
            byCity: [{ $group: { _id: "$city", count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
          },
        },
      ])
      .toArray();

    const totals = overview.totals?.[0] || { totalApplications: 0, averageScore: 0, overrides: 0 };
    return {
      ...totals,
      averageScore: Math.round(totals.averageScore || 0),
      auditEvents: await this.audit.countDocuments(),
      byDecision: Object.fromEntries((overview.byDecision || []).map((item) => [item._id, item.count])),
      byCity: (overview.byCity || []).map((item) => ({ city: item._id, count: item.count })),
    };
  }

  async searchMemories(query) {
    const cleaned = String(query || "").trim();
    if (!cleaned) {
      return this.memories.find({}, { projection: { _id: 0 } }).sort({ occurredAt: -1 }).limit(8).toArray();
    }

    try {
      const results = await this.memories
        .aggregate([
          {
            $search: {
              index: this.searchIndex,
              compound: {
                should: [
                  { text: { query: cleaned, path: ["title", "summary", "takeaways", "tags"], fuzzy: { maxEdits: 1 } } },
                  { text: { query: cleaned, path: "city", score: { boost: { value: 2 } } } },
                ],
                minimumShouldMatch: 1,
              },
            },
          },
          { $limit: 8 },
          { $project: { _id: 0, id: 1, event: 1, city: 1, title: 1, summary: 1, takeaways: 1, tags: 1, occurredAt: 1, score: { $meta: "searchScore" } } },
        ])
        .toArray();
      this.searchMode = "atlas-search";
      return results;
    } catch (error) {
      const results = await this.memories
        .find({ $text: { $search: cleaned } }, { projection: { _id: 0, score: { $meta: "textScore" } } })
        .sort({ score: { $meta: "textScore" } })
        .limit(8)
        .toArray();
      this.searchMode = "mongodb-text-fallback";
      return results;
    }
  }
}
