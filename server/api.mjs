const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function sendJson(response, status, payload) {
  response.writeHead(status, JSON_HEADERS).end(JSON.stringify(payload));
}

async function readJson(request, maxBytes = 32_768) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) throw new Error("Request body is too large");
  }
  return body ? JSON.parse(body) : {};
}

export function validateSyntheticApplication(application) {
  const required = ["name", "role", "city", "motivation"];
  for (const field of required) {
    if (!String(application[field] || "").trim()) throw new Error(`Missing required field: ${field}`);
  }
  if (application.dataClassification !== "synthetic-demo") {
    throw new Error("Records must be explicitly classified as synthetic-demo");
  }
  return {
    name: String(application.name).trim().slice(0, 120),
    role: String(application.role).trim().slice(0, 120),
    city: String(application.city).trim().slice(0, 80),
    experience: String(application.experience || "Beginner").trim().slice(0, 40),
    motivation: String(application.motivation).trim().slice(0, 2_000),
    availableHours: Math.max(1, Math.min(24, Number(application.availableHours) || 1)),
    proofUrl: String(application.proofUrl || "").trim().slice(0, 500),
    buildCommitment: application.buildCommitment === true,
    manualDecision: "",
  };
}

export function createApiHandler(store) {
  return async function handleApi(request, response, url) {
    try {
      if (request.method === "GET" && url.pathname === "/api/status") {
        sendJson(response, 200, await store.status());
        return true;
      }

      if (request.method === "GET" && url.pathname === "/api/applications") {
        sendJson(
          response,
          200,
          await store.listApplications({
            query: url.searchParams.get("query") || "",
            decision: url.searchParams.get("decision") || "All",
            city: url.searchParams.get("city") || "",
          }),
        );
        return true;
      }

      if (request.method === "POST" && url.pathname === "/api/applications") {
        const application = validateSyntheticApplication(await readJson(request));
        sendJson(response, 201, await store.createApplication(application));
        return true;
      }

      const decisionMatch = url.pathname.match(/^\/api\/applications\/([^/]+)\/decision$/);
      if (request.method === "PATCH" && decisionMatch) {
        const body = await readJson(request);
        const result = await store.updateDecision(decodeURIComponent(decisionMatch[1]), {
          manualDecision: String(body.manualDecision || ""),
          reason: String(body.reason || "Organizer review").slice(0, 500),
        });
        if (!result) sendJson(response, 404, { error: "Application not found" });
        else sendJson(response, 200, result);
        return true;
      }

      if (request.method === "GET" && url.pathname === "/api/insights") {
        sendJson(response, 200, await store.insights());
        return true;
      }

      if (request.method === "GET" && url.pathname === "/api/memory/search") {
        const results = await store.searchMemories(url.searchParams.get("q") || "");
        sendJson(response, 200, { query: url.searchParams.get("q") || "", searchMode: store.searchMode, results });
        return true;
      }

      return false;
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : /Missing|required|Unsupported|synthetic|too large/.test(error.message) ? 400 : 500;
      sendJson(response, status, { error: status === 500 ? "Request failed" : error.message });
      return true;
    }
  };
}
