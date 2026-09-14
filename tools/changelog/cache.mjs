#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertRepository, githubJson } from "./github.mjs";

const BRANCH = "automation/changelog";
const SHA = /^[0-9a-f]{40}$/;

function git(root, arguments_) {
  const result = spawnSync("git", arguments_, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `git ${arguments_[0]} failed: ${String(result.stderr || result.stdout).trim().slice(0, 500)}`,
    );
  }
  return result.stdout;
}

function changedPaths(root, fromCommit, toCommit) {
  return git(root, ["diff", "--name-only", "-z", `${fromCommit}..${toCommit}`])
    .split("\0")
    .filter(Boolean);
}

function isAutomationPath(path) {
  return (
    path === "CHANGELOG.md" ||
    path.startsWith("changes/entries/") ||
    path.startsWith("changes/publications/")
  );
}

function isLedgerRecord(path) {
  return (
    (path.startsWith("changes/entries/") || path.startsWith("changes/publications/")) &&
    !path.endsWith("/.gitkeep")
  );
}

export function mergeAutomationCache({ root, mainCommit, branchCommit }) {
  if (!SHA.test(mainCommit ?? "") || !SHA.test(branchCommit ?? "")) {
    throw new Error("Cache merging requires full main and branch hashes.");
  }
  const mergeBase = git(root, ["merge-base", mainCommit, branchCommit]).trim();
  if (!SHA.test(mergeBase)) {
    throw new Error("Cannot determine the automation branch merge base.");
  }
  const branchChanges = changedPaths(root, mergeBase, branchCommit);
  const unexpected = branchChanges.filter((path) => !isAutomationPath(path));
  if (unexpected.length > 0) {
    throw new Error(`Automation branch contains out-of-scope paths: ${unexpected.join(", ")}`);
  }
  const branchRecords = branchChanges.filter(isLedgerRecord);
  const mainRecords = new Set(
    changedPaths(root, mergeBase, mainCommit).filter(isLedgerRecord),
  );
  const conflicts = branchRecords.filter((path) => mainRecords.has(path));
  if (conflicts.length > 0) {
    throw new Error(
      `Main and the open changelog draft both changed ledger records: ${conflicts.join(", ")}`,
    );
  }
  for (let offset = 0; offset < branchRecords.length; offset += 100) {
    git(root, [
      "restore",
      `--source=${branchCommit}`,
      "--worktree",
      "--",
      ...branchRecords.slice(offset, offset + 100),
    ]);
  }
  return branchRecords;
}

export async function shouldRestoreAutomationCache({
  repository,
  branchCommit,
  token,
  githubImplementation = githubJson,
}) {
  if (repository !== "w3c/lws-protocol" || !SHA.test(branchCommit ?? "")) {
    throw new Error("Cache restoration requires the expected repository and a full branch hash.");
  }
  const query = new URLSearchParams({
    state: "open",
    head: `w3c:${BRANCH}`,
    base: "main",
    per_page: "10",
  });
  const pulls = await githubImplementation(`/repos/${repository}/pulls?${query}`, token);
  if (!Array.isArray(pulls) || pulls.length > 1) {
    throw new Error("Expected at most one open changelog automation pull request.");
  }
  if (pulls.length === 0) {
    return false;
  }
  const pull = pulls[0];
  if (
    pull.head?.sha !== branchCommit ||
    pull.head?.ref !== BRANCH ||
    pull.head?.repo?.full_name !== repository ||
    pull.base?.ref !== "main"
  ) {
    throw new Error("The open changelog pull request does not match the captured branch.");
  }
  return true;
}

async function main() {
  const repository = assertRepository(process.env.GITHUB_REPOSITORY);
  const branchCommit = process.env.EXPECTED_BRANCH_SHA;
  const restore = await shouldRestoreAutomationCache({
    repository,
    branchCommit,
    token: process.env.GITHUB_TOKEN,
  });
  if (restore) {
    mergeAutomationCache({
      root: process.cwd(),
      mainCommit: process.env.GENERATED_BASE_SHA,
      branchCommit,
    });
  }
  process.stdout.write(restore ? "true" : "false");
}

function reportFailure(error) {
  const message = String(error.message)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
  console.error(`::error title=LWS changelog cache::${message}`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(reportFailure);
}
