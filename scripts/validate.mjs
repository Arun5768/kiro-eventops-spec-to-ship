import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1");
const requiredFiles = [
  "index.html",
  "styles.css",
  "src/app.mjs",
  "src/scoring.mjs",
  "src/data.mjs",
  "tests/scoring.test.mjs",
  "tests/summary.test.mjs",
  "tests/announcement.test.mjs",
  ".kiro/specs/community-eventops/requirements.md",
  ".kiro/specs/community-eventops/design.md",
  ".kiro/specs/community-eventops/tasks.md",
  ".kiro/specs/announcement-coordination/requirements.md",
  ".kiro/specs/announcement-coordination/design.md",
  ".kiro/specs/announcement-coordination/tasks.md",
  "docs/announcement-coordination-feedback.md",
  "docs/kiro-product-feedback.md",
  ".kiro/steering/product.md",
  ".kiro/steering/tech.md",
  ".kiro/steering/structure.md",
  ".kiro/hooks/verify-on-save.json",
  "community-eventops-power/plugin.json",
  "community-eventops-power/skills/spec-to-ship/SKILL.md",
];

const failures = [];

for (const file of requiredFiles) {
  try {
    await access(join(root, file));
  } catch {
    failures.push(`Missing required file: ${file}`);
  }
}

const hook = JSON.parse(await readFile(join(root, ".kiro/hooks/verify-on-save.json"), "utf8"));
if (hook.version !== "v1" || !Array.isArray(hook.hooks) || hook.hooks[0]?.trigger !== "PostFileSave") {
  failures.push("Kiro verification hook does not match the v1 PostFileSave schema.");
}

const plugin = JSON.parse(await readFile(join(root, "community-eventops-power/plugin.json"), "utf8"));
for (const field of ["$schema", "name", "version", "description", "author", "keywords"]) {
  if (!plugin[field]) failures.push(`Power manifest is missing ${field}.`);
}

const requirements = await readFile(join(root, ".kiro/specs/community-eventops/requirements.md"), "utf8");
for (const marker of ["## User stories", "Acceptance criteria", "## Non-goals", "## Success measures", "R8"]) {
  if (!requirements.includes(marker)) failures.push(`Requirements are missing: ${marker}`);
}

const announcementReqs = await readFile(join(root, ".kiro/specs/announcement-coordination/requirements.md"), "utf8");
for (const marker of ["AC1", "AC2", "AC3", "AC4", "AC5", "scheduleAnnouncement", "SUMMARY_SUPPRESSION_MS"]) {
  if (!announcementReqs.includes(marker))
    failures.push(`Announcement-coordination requirements are missing: ${marker}`);
}

const scoringSource = await readFile(join(root, "src/scoring.mjs"), "utf8");
for (const exportName of ["scheduleAnnouncement", "PRIORITY_ACTION", "PRIORITY_SUMMARY", "SUMMARY_SUPPRESSION_MS"]) {
  if (!scoringSource.includes(`export`) || !scoringSource.includes(exportName))
    failures.push(`src/scoring.mjs is missing export: ${exportName}`);
}

const html = await readFile(join(root, "index.html"), "utf8");
if (!html.toLowerCase().includes("synthetic")) failures.push("The interface must label synthetic data.");
if (!html.includes('aria-live="polite"')) failures.push("The interface needs an ARIA live status region.");
if (!html.includes('id="queue-summary"')) failures.push("The interface is missing the #queue-summary live region (R8).");

if (failures.length) {
  console.error("Validation failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validation passed: ${requiredFiles.length} project artifacts verified.`);
}

