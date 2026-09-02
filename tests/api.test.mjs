import test from "node:test";
import assert from "node:assert/strict";

import { validateSyntheticApplication } from "../server/api.mjs";

const application = {
  name: "Tara Demo",
  role: "Developer",
  city: "Bhopal",
  motivation: "A synthetic record for the MongoDB community workshop.",
  availableHours: 5,
  dataClassification: "synthetic-demo",
};

test("API accepts an explicitly classified synthetic record", () => {
  const validated = validateSyntheticApplication(application);
  assert.equal(validated.name, "Tara Demo");
  assert.equal(validated.manualDecision, "");
});

test("API rejects a missing data classification", () => {
  const { dataClassification, ...unclassified } = application;
  assert.throws(() => validateSyntheticApplication(unclassified), /explicitly classified/);
});

test("API rejects a non-synthetic classification", () => {
  assert.throws(
    () => validateSyntheticApplication({ ...application, dataClassification: "real-applicant" }),
    /explicitly classified/,
  );
});
