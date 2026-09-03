import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CHANGELOG_ADOPTION_COMMIT,
  CHANGELOG_PUBLICATION_NOT_BEFORE,
} from "../constraints.mjs";

export const sha = (character) => character.repeat(40);

export const specifications = {
  "lws10-core": {
    title: "Linked Web Storage Protocol 1.0",
    shortName: "lws10-core",
    publicationWorkflow: "Echidna lws-core",
    publicationWorkflowFile: "echidna-core.yml",
    initialPublication: "https://www.w3.org/TR/2026/WD-lws10-core-20260331/",
  },
  "lws10-vocab": {
    title: "Linked Web Storage Vocabulary",
    shortName: "lws10-vocab",
    publicationWorkflow: null,
    publicationWorkflowFile: null,
    initialPublication: "https://www.w3.org/TR/2026/DNOTE-lws10-vocab-20260714/",
  },
};

export function sampleEntry(overrides = {}) {
  const entry = {
    $schema: "../entry.schema.json",
    schemaVersion: 1,
    id: "pr-42--lws10-core",
    specification: "lws10-core",
    classification: { class: 3, selectedBy: "author", public: true },
    source: {
      kind: "pull_request",
      pullRequest: 42,
      title: "Define container frobnication",
      url: "https://github.com/w3c/lws-protocol/pull/42",
      author: "contributor",
      mergedAt: "2026-09-02T12:30:00Z",
      baseCommit: sha("a"),
      headCommit: sha("b"),
      mergeCommit: sha("c"),
      changedFiles: ["lws10-core/index.html"],
    },
    review: {
      tests: { status: "added", rationale: "" },
      workingGroupRecord: "https://www.w3.org/2026/09/01-lws-minutes.html#resolution01",
    },
    summary: {
      status: "edited",
      text: "Servers now expose the frobnication control.",
      implementationConsiderations: ["Reject unsupported control values."],
      evidenceGaps: [],
    },
  };
  return {
    ...entry,
    ...overrides,
    classification: { ...entry.classification, ...overrides.classification },
    source: { ...entry.source, ...overrides.source },
    review: {
      ...entry.review,
      ...overrides.review,
      tests: { ...entry.review.tests, ...overrides.review?.tests },
    },
    summary: { ...entry.summary, ...overrides.summary },
  };
}

export function makeRepository(root, stateOverrides = {}) {
  mkdirSync(join(root, "changes", "entries"), { recursive: true });
  mkdirSync(join(root, "changes", "publications"), { recursive: true });
  writeFileSync(
    join(root, "changes", "specifications.json"),
    `${JSON.stringify({ schemaVersion: 1, specifications }, null, 2)}\n`,
  );
  writeFileSync(join(root, "CHANGELOG.md"), "");
  writeFileSync(
    join(root, "changes", "state.json"),
    `${JSON.stringify(
      {
        $schema: "./state.schema.json",
        schemaVersion: 1,
        adoptionCommit: CHANGELOG_ADOPTION_COMMIT,
        publicationNotBefore: CHANGELOG_PUBLICATION_NOT_BEFORE,
        ...stateOverrides,
      },
      null,
      2,
    )}\n`,
  );
}
