import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  collectPush,
  reconcileChanges,
  recordPublication,
  summaryForPullRequest,
} from "../collect.mjs";
import { makeRepository, sampleEntry, sha, specifications } from "./helpers.mjs";

const validBody = `
<!-- changelog-summary -->
Servers expose a new storage control.
## Correction class
<!-- changelog-class-start -->
- [ ] **Class 1**
- [ ] **Class 2**
- [x] **Class 3**
- [ ] **Class 4**
<!-- changelog-class-end -->
- [ ] **Include Class 2 in the public changelog**
## Test impact
<!-- changelog-tests-start -->
- [x] **Tests added**
- [ ] **Tests updated**
- [ ] **Tests not needed**
- [ ] **Tests tracked separately**
<!-- changelog-tests-end -->
<!-- changelog-test-rationale -->
## Working Group record
<!-- changelog-wg-record -->
https://www.w3.org/2026/09/01-lws-minutes.html#resolution01
`;

test("fails open to a pending human summary when AI reaches its deadline", async () => {
  const summary = await summaryForPullRequest({
    pullRequest: { number: 42, title: "A specification change" },
    specification: "lws10-core",
    spec: specifications["lws10-core"],
    metadata: {
      public: true,
      correctionClass: 3,
      summary: "Servers expose a new storage control.",
    },
    files: [],
    environment: { CHANGELOG_AI_ENABLED: "true" },
    summarizeImplementation: async () => {
      throw new DOMException("The operation timed out", "TimeoutError");
    },
  });
  assert.equal(summary.status, "pending");
  assert.match(summary.evidenceGaps[0], /maintainer review required/);
});

test("collects deterministic evidence for a merged pull request without AI", async (context) => {
  const root = mkdtempSync(join(tmpdir(), "lws-changelog-"));
  makeRepository(root);
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith(`/commits/${sha("c")}/pulls`)) {
      return Response.json([
        {
          number: 42,
          title: "Define container frobnication",
          body: validBody,
          html_url: "https://github.com/w3c/lws-protocol/pull/42",
          user: { login: "contributor" },
          merged_at: "2026-09-02T12:30:00Z",
          merge_commit_sha: sha("c"),
          base: { ref: "main", sha: sha("a") },
          head: { sha: sha("b") },
        },
      ]);
    }
    if (path.endsWith("/pulls/42/files")) {
      return Response.json([
        {
          filename: "lws10-core/index.html",
          status: "modified",
          additions: 3,
          deletions: 1,
          patch: "@@ change",
        },
      ]);
    }
    throw new Error(`Unexpected request ${url}`);
  };
  const [entry] = await collectPush({
    root,
    specifications,
    event: {
      after: sha("c"),
      repository: { full_name: "w3c/lws-protocol" },
    },
    token: "test-token",
    environment: { CHANGELOG_AI_ENABLED: "false" },
  });
  assert.equal(entry.id, "pr-42--lws10-core");
  assert.equal(entry.classification.class, 3);
  assert.equal(entry.summary.status, "pending");
  assert.deepEqual(entry.source.changedFiles, ["lws10-core/index.html"]);
  assert.equal(
    JSON.parse(readFileSync(join(root, "changes", "entries", `${entry.id}.json`))).source.mergeCommit,
    sha("c"),
  );

  const recordPath = join(root, "changes", "entries", `${entry.id}.json`);
  const tampered = JSON.parse(readFileSync(recordPath));
  tampered.source.author = "fabricated-author";
  writeFileSync(recordPath, `${JSON.stringify(tampered, null, 2)}\n`);
  const [reconciled] = await collectPush({
    root,
    specifications,
    event: {
      after: sha("c"),
      repository: { full_name: "w3c/lws-protocol" },
    },
    token: "test-token",
    environment: { CHANGELOG_AI_ENABLED: "false" },
  });
  assert.equal(reconciled.source.author, "contributor");
  assert.equal(JSON.parse(readFileSync(recordPath)).source.author, "contributor");
});

test("keeps a direct specification push as an unclassified ledger record", async (context) => {
  const root = mkdtempSync(join(tmpdir(), "lws-direct-push-"));
  makeRepository(root);
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  let associatedPullRequest = false;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith(`/commits/${sha("e")}/pulls`)) {
      return Response.json(
        associatedPullRequest
          ? [
              {
                number: 44,
                title: "Emergency specification correction",
                body: validBody,
                html_url: "https://github.com/w3c/lws-protocol/pull/44",
                user: { login: "editor" },
                merged_at: "2026-09-03T09:00:00Z",
                base: { ref: "main", sha: sha("d") },
                head: { sha: sha("f") },
              },
            ]
          : [],
      );
    }
    if (path.endsWith("/pulls/44")) {
      return Response.json({
        number: 44,
        title: "Emergency specification correction",
        body: validBody,
        html_url: "https://github.com/w3c/lws-protocol/pull/44",
        user: { login: "editor" },
        merged_at: "2026-09-03T09:00:00Z",
        merge_commit_sha: sha("e"),
        base: { ref: "main", sha: sha("d") },
        head: { sha: sha("f") },
      });
    }
    if (path.endsWith(`/commits/${sha("e")}`)) {
      return Response.json({
        html_url: `https://github.com/w3c/lws-protocol/commit/${sha("e")}`,
        author: { login: "editor" },
        parents: [{ sha: sha("d") }],
        commit: {
          message: "Emergency specification correction",
          author: { name: "Editor" },
          committer: { date: "2026-09-03T09:00:00Z" },
        },
      });
    }
    if (path.includes(`/compare/${sha("d")}...${sha("e")}`)) {
      return Response.json({
        files: [{ filename: "lws10-core/index.html", status: "modified" }],
      });
    }
    if (path.endsWith("/pulls/44/files")) {
      return Response.json([{ filename: "lws10-core/index.html", status: "modified" }]);
    }
    throw new Error(`Unexpected request ${url}`);
  };
  const [entry] = await collectPush({
    root,
    specifications,
    event: {
      before: sha("d"),
      after: sha("e"),
      repository: { full_name: "w3c/lws-protocol" },
    },
    token: "test-token",
  });
  assert.equal(entry.id, `commit-${sha("e").slice(0, 12)}--lws10-core`);
  assert.equal(entry.classification.class, "unclassified");
  assert.equal(entry.classification.public, false);

  const provisionalPath = join(root, "changes", "entries", `${entry.id}.json`);
  const editedProvisional = JSON.parse(readFileSync(provisionalPath));
  editedProvisional.classification = { class: 4, selectedBy: "maintainer", public: true };
  editedProvisional.review = {
    tests: { status: "updated", rationale: "Updated after editor review." },
    workingGroupRecord: "https://www.w3.org/2026/09/03-lws-minutes.html#resolution01",
  };
  editedProvisional.summary = {
    status: "edited",
    text: "Editors clarified the emergency correction.",
    implementationConsiderations: [],
    evidenceGaps: [],
  };
  writeFileSync(provisionalPath, `${JSON.stringify(editedProvisional, null, 2)}\n`);
  associatedPullRequest = true;
  const [reconciled] = await collectPush({
    root,
    specifications,
    event: {
      before: sha("d"),
      after: sha("e"),
      repository: { full_name: "w3c/lws-protocol" },
    },
    token: "test-token",
    environment: { CHANGELOG_AI_ENABLED: "false" },
  });
  assert.equal(reconciled.id, "pr-44--lws10-core");
  assert.equal(reconciled.classification.class, 4);
  assert.equal(reconciled.summary.text, "Editors clarified the emergency correction.");
  assert.equal(
    existsSync(join(root, "changes", "entries", `${entry.id}.json`)),
    false,
  );
});

test("records a publication from trusted workflow provenance", async () => {
  const root = mkdtempSync(join(tmpdir(), "lws-publication-"));
  makeRepository(root);
  const current = "https://www.w3.org/TR/2026/WD-lws10-core-20260902/";
  const previous = "https://www.w3.org/TR/2026/WD-lws10-core-20260821/";
  const result = await recordPublication({
    root,
    specifications,
    event: {
      workflow_run: {
        id: 123,
        run_attempt: 1,
        name: "Echidna lws-core",
        workflow_id: 12,
        path: ".github/workflows/echidna-core.yml",
        conclusion: "success",
        event: "push",
        head_branch: "main",
        head_sha: sha("c"),
        html_url: "https://github.com/w3c/lws-protocol/actions/runs/123",
        updated_at: "2026-09-02T12:45:00Z",
      },
    },
    fetchImplementation: async () =>
      new Response(`<a href="${previous}">old</a><a href="${current}">new</a>`),
    sleeper: async () => {},
  });
  assert.equal(result.thisVersion, current);
  assert.equal(result.previousVersion, previous);
  assert.match(result.diff, /doc1=/);
});

test("a later publication includes changes from a skipped publication run", async () => {
  const root = mkdtempSync(join(tmpdir(), "lws-publication-gap-"));
  makeRepository(root);
  const first = sampleEntry({
    id: "pr-40--lws10-core",
    source: { pullRequest: 40, mergeCommit: sha("b") },
  });
  const second = sampleEntry({
    id: "pr-41--lws10-core",
    source: { pullRequest: 41, mergeCommit: sha("c") },
  });
  for (const entry of [first, second]) {
    writeFileSync(
      join(root, "changes", "entries", `${entry.id}.json`),
      `${JSON.stringify(entry, null, 2)}\n`,
    );
  }
  const current = "https://www.w3.org/TR/2026/WD-lws10-core-20260902/";
  const previous = "https://www.w3.org/TR/2026/WD-lws10-core-20260821/";
  const result = await recordPublication({
    root,
    specifications,
    event: {
      workflow_run: {
        id: 125,
        run_attempt: 1,
        name: "Echidna lws-core",
        workflow_id: 12,
        path: ".github/workflows/echidna-core.yml",
        conclusion: "success",
        event: "push",
        head_branch: "main",
        head_sha: sha("c"),
        html_url: "https://github.com/w3c/lws-protocol/actions/runs/125",
        run_started_at: "2026-09-01T23:59:59Z",
        updated_at: "2026-09-02T00:01:00Z",
      },
    },
    fetchImplementation: async () =>
      new Response(`<a href="${previous}">old</a><a href="${current}">new</a>`),
    sleeper: async () => {},
    ancestorCheck: (candidate, descendant) =>
      descendant === sha("c") && [sha("b"), sha("c")].includes(candidate),
  });
  assert.deepEqual(result.entries, ["pr-40--lws10-core", "pr-41--lws10-core"]);

  const manifestPath = join(root, "changes", "publications", `${result.id}.json`);
  const tampered = JSON.parse(readFileSync(manifestPath));
  tampered.entries = ["pr-41--lws10-core"];
  tampered.sourceCommits = [sha("c")];
  writeFileSync(manifestPath, `${JSON.stringify(tampered, null, 2)}\n`);
  const repaired = await recordPublication({
    root,
    specifications,
    event: {
      workflow_run: {
        id: 125,
        run_attempt: 1,
        name: "Echidna lws-core",
        workflow_id: 12,
        path: ".github/workflows/echidna-core.yml",
        conclusion: "success",
        event: "push",
        head_branch: "main",
        head_sha: sha("c"),
        html_url: "https://github.com/w3c/lws-protocol/actions/runs/125",
        run_started_at: "2026-09-01T23:59:59Z",
        updated_at: "2026-09-02T00:01:00Z",
      },
    },
    fetchImplementation: async () =>
      new Response(`<a href="${previous}">old</a><a href="${current}">new</a>`),
    sleeper: async () => {},
    ancestorCheck: (candidate, descendant) =>
      descendant === sha("c") && [sha("b"), sha("c")].includes(candidate),
  });
  assert.deepEqual(repaired.entries, ["pr-40--lws10-core", "pr-41--lws10-core"]);
  assert.deepEqual(repaired.sourceCommits, [sha("b"), sha("c")]);
});

test("reconciliation processes commits skipped by a replaced queued run", async () => {
  const root = mkdtempSync(join(tmpdir(), "lws-reconciliation-"));
  makeRepository(root);
  const seen = [];
  const recorded = await reconcileChanges({
    root,
    specifications,
    repository: "w3c/lws-protocol",
    targetCommit: sha("c"),
    token: "test-token",
    commitRangeImplementation: () => [
      { commit: sha("b"), parent: sha("a") },
      { commit: sha("c"), parent: sha("b") },
    ],
    collectImplementation: async ({ event }) => {
      seen.push(event.after);
      return [{ id: `commit-${event.after.slice(0, 12)}--lws10-core` }];
    },
  });
  assert.equal(recorded, 2);
  assert.deepEqual(seen, [sha("b"), sha("c")]);
  const state = JSON.parse(readFileSync(join(root, "changes", "state.json")));
  assert.equal(state.adoptionCommit.length, 40);
});
