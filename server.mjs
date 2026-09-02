import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { createApiHandler } from "./server/api.mjs";
import { MemoryEventStore } from "./server/memory-store.mjs";
import { MongoEventStore } from "./server/mongo-store.mjs";
import { seedApplications } from "./src/data.mjs";
import { seedMemories } from "./src/memory-data.mjs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const root = new URL(".", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1");
const port = Number(process.env.PORT || process.argv[2]) || 4173;

const store = process.env.MONGODB_URI
  ? new MongoEventStore({
      uri: process.env.MONGODB_URI,
      databaseName: process.env.MONGODB_DATABASE || "eventops_community_memory",
      searchIndex: process.env.MONGODB_SEARCH_INDEX || "eventops_memory_search",
    })
  : new MemoryEventStore();

await store.connect();
await store.seed({ applications: seedApplications, memories: seedMemories });
const handleApi = createApiHandler(store);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  if (requestUrl.pathname.startsWith("/api/")) {
    const handled = await handleApi(request, response, requestUrl);
    if (!handled) response.writeHead(404, JSON_HEADERS).end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const requestPath = decodeURIComponent(requestUrl.pathname);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = normalize(join(root, relativePath));

  if (!filePath.startsWith(normalize(root))) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`EventOps Community Memory running at http://localhost:${port} (${store.mode})`);
});

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await store.close();
    server.close(() => process.exit(0));
  });
}
