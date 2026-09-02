export const seedMemories = [
  {
    id: "memory-001",
    event: "Synthetic Bhopal Builder Lab",
    city: "Bhopal",
    title: "Scope the artifact before opening the editor",
    summary:
      "Teams moved faster when every project began with one user, one painful workflow, and one observable definition of done.",
    takeaways: [
      "Use a five-minute scope card before implementation.",
      "Ask teams to demo evidence, not slides.",
      "Keep a visible parking lot for ideas outside the sprint.",
    ],
    tags: ["workshop", "facilitation", "scope", "demo"],
    occurredAt: "2026-06-14T10:00:00.000Z",
    dataClassification: "synthetic-demo",
  },
  {
    id: "memory-002",
    event: "Synthetic Indore Data Clinic",
    city: "Indore",
    title: "Broken queries teach more than perfect walkthroughs",
    summary:
      "A debugging clinic produced better questions than a lecture because participants had to inspect documents, indexes, and query plans.",
    takeaways: [
      "Seed one realistic failure for each team.",
      "Require an explain-plan screenshot with the fix.",
      "End with a short failure-and-recovery retrospective.",
    ],
    tags: ["mongodb", "queries", "indexes", "debugging"],
    occurredAt: "2026-07-19T10:00:00.000Z",
    dataClassification: "synthetic-demo",
  },
  {
    id: "memory-003",
    event: "Synthetic Central India Community Sprint",
    city: "Bhopal",
    title: "Human overrides need a reason and an audit trail",
    summary:
      "Reviewers trusted recommendations more when the system preserved both the machine score and the organizer's final decision.",
    takeaways: [
      "Never overwrite the original recommendation.",
      "Record who changed the decision, when, and why.",
      "Review override patterns after every cohort.",
    ],
    tags: ["governance", "audit", "community-ops", "trust"],
    occurredAt: "2026-08-09T10:00:00.000Z",
    dataClassification: "synthetic-demo",
  },
  {
    id: "memory-004",
    event: "Synthetic MongoDB Vector Search Workshop",
    city: "Indore",
    title: "Search should return the lesson, not just the event title",
    summary:
      "Organizers need to retrieve reusable lessons across notes, takeaways, tags, and cities instead of browsing a folder of recap documents.",
    takeaways: [
      "Search the summary and takeaways together.",
      "Show why each result matched.",
      "Keep a text-index fallback for local workshops.",
    ],
    tags: ["mongodb-search", "knowledge-base", "vector-search", "eventops"],
    occurredAt: "2026-08-23T10:00:00.000Z",
    dataClassification: "synthetic-demo",
  },
];
