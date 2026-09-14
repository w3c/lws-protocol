import assert from "node:assert/strict";
import test from "node:test";
import { parsePullRequestMetadata, specificationsForFiles } from "../metadata.mjs";
import { specifications } from "./helpers.mjs";

function body({ correctionClass = 3, test = "Tests added", class2Public = false } = {}) {
  return `
## Change summary
<!-- changelog-summary -->
Servers expose a new storage control.

## Correction class
<!-- changelog-class-start -->
- [${correctionClass === 1 ? "x" : " "}] **Class 1** — editorial
- [${correctionClass === 2 ? "x" : " "}] **Class 2** — compatible
- [${correctionClass === 3 ? "x" : " "}] **Class 3** — new
- [${correctionClass === 4 ? "x" : " "}] **Class 4** — incompatible
<!-- changelog-class-end -->
- [${class2Public ? "x" : " "}] **Include Class 2 in the public changelog** because it matters

## Test impact
<!-- changelog-tests-start -->
- [${test === "Tests added" ? "x" : " "}] **Tests added**
- [${test === "Tests updated" ? "x" : " "}] **Tests updated**
- [${test === "Tests not needed" ? "x" : " "}] **Tests not needed**
- [${test === "Tests tracked separately" ? "x" : " "}] **Tests tracked separately**
<!-- changelog-tests-end -->
<!-- changelog-test-rationale -->
Covered in https://github.com/web-platform-tests/wpt/pull/1

## Working Group record
<!-- changelog-wg-record -->
https://www.w3.org/2026/09/01-lws-minutes.html#resolution01
`;
}

test("parses a complete Class 3 record", () => {
  const metadata = parsePullRequestMetadata(body());
  assert.deepEqual(metadata.errors, []);
  assert.equal(metadata.correctionClass, 3);
  assert.equal(metadata.tests.status, "added");
  assert.equal(metadata.public, true);
  assert.equal(metadata.summary, "Servers expose a new storage control.");
});

test("Class 2 visibility is explicit", () => {
  assert.equal(parsePullRequestMetadata(body({ correctionClass: 2 })).public, false);
  assert.equal(
    parsePullRequestMetadata(body({ correctionClass: 2, class2Public: true })).public,
    true,
  );
});

test("rejects inconsistent or missing selections", () => {
  const inconsistent = parsePullRequestMetadata(body({ correctionClass: 3, class2Public: true }));
  assert.match(inconsistent.errors.join("\n"), /Class 2 public-changelog option/);
  const missing = parsePullRequestMetadata("");
  assert.match(missing.errors.join("\n"), /exactly one correction class/);
  assert.match(missing.errors.join("\n"), /change summary/);
});

test("rejects metadata that cannot fit in a ledger record", () => {
  const tooLong = parsePullRequestMetadata(
    body().replace(
      "Covered in https://github.com/web-platform-tests/wpt/pull/1",
      "x".repeat(1001),
    ),
  );
  assert.match(tooLong.errors.join("\n"), /test rationale at or below 1,000/);

  const untrustedRecord = parsePullRequestMetadata(
    body().replace(
      "https://www.w3.org/2026/09/01-lws-minutes.html#resolution01",
      "https://attacker.example/fake-resolution",
    ),
  );
  assert.match(untrustedRecord.errors.join("\n"), /W3C or w3c\/lws-protocol URL/);
});

test("detects all registered specifications touched by a PR", () => {
  assert.deepEqual(
    specificationsForFiles(
      [
        { filename: "README.md" },
        { filename: "lws10-vocab/vocabulary.yml" },
        { filename: "lws10-core/index.html" },
        { filename: "lws10-core/operations.md" },
        {
          filename: "lws10-core/moved-from-vocab.md",
          previous_filename: "lws10-vocab/moved-to-core.md",
        },
      ],
      specifications,
    ),
    ["lws10-core", "lws10-vocab"],
  );
});
