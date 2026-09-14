import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  CHANGELOG_ADOPTION_COMMIT,
  CHANGELOG_PUBLICATION_NOT_BEFORE,
} from "../constraints.mjs";
import {
  extractDatedVersions,
  htmlDiffUrl,
  loadEntries,
  mergePublication,
  renderChangelog,
  synchronizePublicationEntries,
  validateEntry,
  validatePublication,
  validateState,
} from "../records.mjs";
import { sampleEntry, sha, specifications } from "./helpers.mjs";

function publication(overrides = {}) {
  const current = "https://www.w3.org/TR/2026/WD-lws10-core-20260902/";
  const previous = "https://www.w3.org/TR/2026/WD-lws10-core-20260821/";
  return {
    $schema: "../publication.schema.json",
    schemaVersion: 1,
    id: "lws10-core--2026-09-02",
    specification: "lws10-core",
    publishedAt: "2026-09-02",
    thisVersion: current,
    previousVersion: previous,
    diff: htmlDiffUrl(previous, current),
    sourceCommits: [sha("c")],
    entries: ["pr-42--lws10-core"],
    echidnaRuns: [
      {
        id: 123,
        attempt: 1,
        url: "https://github.com/w3c/lws-protocol/actions/runs/123/attempts/1",
        workflowId: 12,
        workflowFile: "echidna-core.yml",
        headCommit: sha("c"),
        completedAt: "2026-09-02T12:45:00Z",
      },
    ],
    ...overrides,
  };
}

test("validates an entry and its publication", () => {
  assert.deepEqual(validateEntry(sampleEntry(), specifications), []);
  assert.deepEqual(validatePublication(publication(), specifications), []);
});

test("rejects visibility that contradicts a correction class", () => {
  const errors = validateEntry(
    sampleEntry({ classification: { class: 1, public: true } }),
    specifications,
  );
  assert.match(errors.join("\n"), /public visibility/);
});

test("rejects schema extensions and identifiers that contradict provenance", () => {
  const entry = sampleEntry({ id: "pr-999--lws10-core", surprise: true });
  const errors = validateEntry(entry, specifications);
  assert.match(errors.join("\n"), /unexpected fields: surprise/);
  assert.match(errors.join("\n"), /id does not match its pull-request source/);
});

test("rejects inconsistent publication provenance without throwing", () => {
  const malformed = publication({
    id: "lws10-core--2026-09-01",
    echidnaRuns: [null, publication().echidnaRuns[0]],
  });
  const errors = validatePublication(malformed, specifications);
  assert.match(errors.join("\n"), /publication id does not match/);
  assert.match(errors.join("\n"), /each Echidna run must be an object/);

  const missingHead = validatePublication(publication({ sourceCommits: [sha("d")] }), specifications);
  assert.match(missingHead.join("\n"), /run head must appear in sourceCommits/);
});

test("validates the durable reconciliation watermark", () => {
  assert.deepEqual(
    validateState({
      $schema: "./state.schema.json",
      schemaVersion: 1,
      adoptionCommit: CHANGELOG_ADOPTION_COMMIT,
      publicationNotBefore: CHANGELOG_PUBLICATION_NOT_BEFORE,
    }),
    [],
  );
  assert.match(
    validateState({
      $schema: "./state.schema.json",
      schemaVersion: 1,
      adoptionCommit: CHANGELOG_ADOPTION_COMMIT,
      publicationNotBefore: "2099-01-01T00:00:00Z",
    }).join("\n"),
    /trusted baseline/,
  );
});

test("rejects unexpected and symbolic-link ledger files", () => {
  const unexpectedRoot = mkdtempSync(join(tmpdir(), "lws-ledger-unexpected-"));
  mkdirSync(join(unexpectedRoot, "changes", "entries"), { recursive: true });
  writeFileSync(join(unexpectedRoot, "changes", "entries", "notes.txt"), "not ledger data");
  assert.throws(() => loadEntries(unexpectedRoot), /Unexpected files/);

  const linkRoot = mkdtempSync(join(tmpdir(), "lws-ledger-link-"));
  mkdirSync(join(linkRoot, "changes", "entries"), { recursive: true });
  symlinkSync("missing", join(linkRoot, "changes", "entries", ".gitkeep"));
  assert.throws(() => loadEntries(linkRoot), /regular ledger file/);
});

test("renders only implementer-facing classes and escapes untrusted prose", () => {
  const publicEntry = sampleEntry({
    source: { title: "Add [unsafe](https://example.test) title" },
    summary: { text: "Implement `<script>` and **trust me**." },
  });
  const privateEntry = sampleEntry({
    id: "pr-43--lws10-core",
    classification: { class: 1, public: false },
    source: { pullRequest: 43, mergeCommit: sha("d") },
  });
  const rendered = renderChangelog([privateEntry, publicEntry], [publication()], specifications);
  assert.match(rendered, /Correction Class 3/);
  assert.doesNotMatch(rendered, /pr-43/);
  assert.match(rendered, /Add \\\[unsafe\\\]/);
  assert.match(rendered, /&lt;script&gt;/);
  assert.match(rendered, /changes from the previous publication/);
});

test("batches same-day publication runs and synchronizes late entries", () => {
  const second = publication({
    sourceCommits: [sha("d")],
    entries: [],
    echidnaRuns: [
      {
        id: 124,
        attempt: 1,
        url: "https://github.com/w3c/lws-protocol/actions/runs/124/attempts/1",
        workflowId: 12,
        workflowFile: "echidna-core.yml",
        headCommit: sha("d"),
        completedAt: "2026-09-02T15:45:00Z",
      },
    ],
  });
  const merged = mergePublication(publication(), second);
  const late = sampleEntry({
    id: "pr-43--lws10-core",
    source: { pullRequest: 43, mergeCommit: sha("d") },
  });
  synchronizePublicationEntries([sampleEntry(), late], [merged]);
  assert.deepEqual(merged.sourceCommits, [sha("c"), sha("d")]);
  assert.deepEqual(merged.entries, ["pr-42--lws10-core", "pr-43--lws10-core"]);
  assert.equal(merged.echidnaRuns.length, 2);
});

test("maps every unpublished ancestor to its first publication", () => {
  const first = sampleEntry({
    id: "pr-40--lws10-core",
    source: { pullRequest: 40, mergeCommit: sha("a") },
  });
  const second = sampleEntry({
    id: "pr-41--lws10-core",
    source: { pullRequest: 41, mergeCommit: sha("b") },
  });
  const manifest = publication({ sourceCommits: [sha("c")], entries: [] });
  synchronizePublicationEntries(
    [first, second],
    [manifest],
    (candidate, descendant) => descendant === sha("c") && [sha("a"), sha("b")].includes(candidate),
  );
  assert.deepEqual(manifest.entries, ["pr-40--lws10-core", "pr-41--lws10-core"]);
  assert.deepEqual(manifest.sourceCommits, [sha("a"), sha("b"), sha("c")]);
});

test("extracts and sorts dated versions from W3C history HTML", () => {
  const html = `
    <a href="https://www.w3.org/TR/2026/WD-lws10-core-20260821/">old</a>
    <a href="https://www.w3.org/TR/2026/WD-lws10-core-20260902/">new</a>
    <a href="https://www.w3.org/TR/unrelated/">ignore</a>`;
  assert.deepEqual(extractDatedVersions(html, "lws10-core"), [
    "https://www.w3.org/TR/2026/WD-lws10-core-20260902/",
    "https://www.w3.org/TR/2026/WD-lws10-core-20260821/",
  ]);
});
