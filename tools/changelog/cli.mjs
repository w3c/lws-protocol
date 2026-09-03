#!/usr/bin/env node

import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectPush, reconcileRepository, recordPublication } from "./collect.mjs";
import { assertRepository, listPullRequestFiles } from "./github.mjs";
import { parsePullRequestMetadata, specificationsForFiles } from "./metadata.mjs";
import {
  gitIsAncestor,
  loadEntries,
  loadPublications,
  loadSpecifications,
  loadState,
  renderChangelog,
  synchronizePublicationEntries,
  validateEntry,
  validatePublication,
  validateState,
  writeTextAtomic,
} from "./records.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function eventFromDisk() {
  const path = option("--event") || process.env.GITHUB_EVENT_PATH;
  if (!path) {
    throw new Error("Pass --event or set GITHUB_EVENT_PATH.");
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function collectValidationErrors(root, specifications) {
  const entries = loadEntries(root);
  const publications = loadPublications(root);
  const errors = [
    ...validateState(loadState(root)),
    ...entries.flatMap(({ path, value }) => validateEntry(value, specifications, path)),
    ...publications.flatMap(({ path, value }) => validatePublication(value, specifications, path)),
  ];
  const entryMap = new Map(entries.map(({ value }) => [value.id, value]));
  const publishedEntries = new Set();
  const publicationRuns = new Set();
  for (const { path, value: publication } of publications) {
    for (const id of publication.entries) {
      const entry = entryMap.get(id);
      if (!entry) {
        errors.push(`${path}: references unknown entry ${id}`);
      } else if (entry.specification !== publication.specification) {
        errors.push(`${path}: entry ${id} belongs to another specification`);
      } else if (!publication.sourceCommits.includes(entry.source.mergeCommit)) {
        errors.push(`${path}: entry ${id} does not match a source commit`);
      }
      if (publishedEntries.has(id)) {
        errors.push(`${path}: entry ${id} is assigned to more than one first publication`);
      }
      publishedEntries.add(id);
    }
    for (const run of publication.echidnaRuns ?? []) {
      const key = `${run?.id}:${run?.attempt}`;
      if (publicationRuns.has(key)) {
        errors.push(
          `${path}: Echidna run ${run?.id}, attempt ${run?.attempt} is assigned to more than one publication`,
        );
      }
      publicationRuns.add(key);
    }
  }
  if (errors.length === 0) {
    const expected = structuredClone(publications.map(({ value }) => value));
    try {
      synchronizePublicationEntries(
        entries.map(({ value }) => value),
        expected,
        (candidate, descendant) => gitIsAncestor(root, candidate, descendant),
      );
      const expectedById = new Map(expected.map((publication) => [publication.id, publication]));
      for (const { path, value: publication } of publications) {
        const candidate = expectedById.get(publication.id);
        if (
          JSON.stringify(publication.entries) !== JSON.stringify(candidate.entries) ||
          JSON.stringify(publication.sourceCommits) !== JSON.stringify(candidate.sourceCommits)
        ) {
          errors.push(`${path}: publication entry assignments are not the deterministic first mapping`);
        }
      }
    } catch (error) {
      errors.push(`publication ancestry validation failed: ${error.message}`);
    }
  }
  return { entries, publications, errors };
}

function render(root, specifications, checkOnly = false) {
  const { entries, publications, errors } = collectValidationErrors(root, specifications);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  const markdown = renderChangelog(
    entries.map(({ value }) => value),
    publications.map(({ value }) => value),
    specifications,
  );
  const path = resolve(root, "CHANGELOG.md");
  if (checkOnly) {
    if (lstatSync(path).isSymbolicLink()) {
      throw new Error("Refusing to validate a symbolic-link CHANGELOG.md.");
    }
    const current = readFileSync(path, "utf8");
    if (current !== markdown) {
      throw new Error("CHANGELOG.md is stale; run `node tools/changelog/cli.mjs render`.");
    }
    return;
  }
  writeTextAtomic(path, markdown);
}

async function validatePullRequest(root, specifications) {
  const event = eventFromDisk();
  const pullRequest = event.pull_request;
  if (!pullRequest) {
    throw new Error("validate-pr requires a pull_request event.");
  }
  const repository = assertRepository(event.repository?.full_name || process.env.GITHUB_REPOSITORY);
  const files = await listPullRequestFiles(repository, pullRequest.number, process.env.GITHUB_TOKEN);
  const affected = specificationsForFiles(files, specifications);
  if (affected.length === 0) {
    console.log("No registered specification files changed; changelog metadata is not required.");
    return;
  }
  const metadata = parsePullRequestMetadata(pullRequest.body ?? "");
  if (metadata.errors.length > 0) {
    throw new Error(metadata.errors.join("\n"));
  }
  console.log(
    `Changelog metadata is valid for ${affected.join(", ")} (Correction Class ${metadata.correctionClass}).`,
  );
}

async function main() {
  const command = process.argv[2];
  const root = resolve(option("--root") || process.cwd());
  const specifications = loadSpecifications(root);
  switch (command) {
    case "validate-pr":
      await validatePullRequest(root, specifications);
      break;
    case "collect": {
      const entries = await collectPush({
        root,
        specifications,
        event: eventFromDisk(),
        token: process.env.GITHUB_TOKEN,
      });
      render(root, specifications);
      console.log(`Recorded ${entries.length} specification change(s).`);
      break;
    }
    case "publication": {
      const publication = await recordPublication({
        root,
        specifications,
        event: eventFromDisk(),
      });
      render(root, specifications);
      console.log(`Recorded publication ${publication.id}.`);
      break;
    }
    case "reconcile": {
      const targetCommit = option("--target");
      if (!/^[0-9a-f]{40}$/.test(targetCommit ?? "")) {
        throw new Error("reconcile requires --target with the checked-out main commit hash.");
      }
      const repository = assertRepository(process.env.GITHUB_REPOSITORY);
      const result = await reconcileRepository({
        root,
        specifications,
        repository,
        targetCommit,
        token: process.env.GITHUB_TOKEN,
      });
      render(root, specifications);
      console.log(
        `Reconciled ${result.entries} change record(s) and ${result.publications} publication run(s).`,
      );
      break;
    }
    case "render":
      render(root, specifications);
      console.log("Rendered CHANGELOG.md.");
      break;
    case "validate":
      render(root, specifications, true);
      console.log("Changelog records and generated Markdown are valid.");
      break;
    default:
      throw new Error(
        "Usage: cli.mjs <validate-pr|collect|publication|reconcile|render|validate> [options]",
      );
  }
}

main().catch((error) => {
  const message = String(error.message)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
  console.error(`::error title=LWS changelog::${message}`);
  process.exitCode = 1;
});
