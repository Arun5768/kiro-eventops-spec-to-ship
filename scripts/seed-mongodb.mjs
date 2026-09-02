import { existsSync } from "node:fs";
import { MongoEventStore } from "../server/mongo-store.mjs";
import { seedApplications } from "../src/data.mjs";
import { seedMemories } from "../src/memory-data.mjs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

if (!process.env.MONGODB_URI) {
  console.error("Set MONGODB_URI before running pnpm seed:mongo.");
  process.exit(1);
}

const store = new MongoEventStore({
  uri: process.env.MONGODB_URI,
  databaseName: process.env.MONGODB_DATABASE || "eventops_community_memory",
  searchIndex: process.env.MONGODB_SEARCH_INDEX || "eventops_memory_search",
});

try {
  await store.connect();
  const counts = await store.seed({ applications: seedApplications, memories: seedMemories });
  console.log(`Seeded ${counts.applications} applications and ${counts.memories} event memories.`);
} finally {
  await store.close();
}
