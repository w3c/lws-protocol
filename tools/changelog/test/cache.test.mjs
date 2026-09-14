import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { mergeAutomationCache, shouldRestoreAutomationCache } from "../cache.mjs";
import { sha } from "./helpers.mjs";

test("restores editorial cache only for the exact open rolling pull request", async () => {
  const options = {
    repository: "w3c/lws-protocol",
    branchCommit: sha("a"),
    token: "test-token",
  };
  assert.equal(
    await shouldRestoreAutomationCache({
      ...options,
      githubImplementation: async () => [],
    }),
    false,
  );
  assert.equal(
    await shouldRestoreAutomationCache({
      ...options,
      githubImplementation: async () => [
        {
          head: {
            sha: sha("a"),
            ref: "automation/changelog",
            repo: { full_name: "w3c/lws-protocol" },
          },
          base: { ref: "main" },
        },
      ],
    }),
    true,
  );
});

test("rejects a pull request whose head changed after branch capture", async () => {
  await assert.rejects(
    shouldRestoreAutomationCache({
      repository: "w3c/lws-protocol",
      branchCommit: sha("a"),
      token: "test-token",
      githubImplementation: async () => [
        {
          head: {
            sha: sha("b"),
            ref: "automation/changelog",
            repo: { full_name: "w3c/lws-protocol" },
          },
          base: { ref: "main" },
        },
      ],
    }),
    /does not match the captured branch/,
  );
});

function runGit(root, arguments_) {
  const result = spawnSync("git", arguments_, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function divergentLedger(mainPath, branchPath) {
  const root = mkdtempSync(join(tmpdir(), "lws-cache-merge-"));
  runGit(root, ["init", "--initial-branch=main"]);
  runGit(root, ["config", "user.name", "Test"]);
  runGit(root, ["config", "user.email", "test@example.test"]);
  runGit(root, ["config", "commit.gpgsign", "false"]);
  mkdirSync(join(root, "changes", "entries"), { recursive: true });
  for (const name of ["a.json", "b.json"]) {
    writeFileSync(join(root, "changes", "entries", name), `base ${name}\n`);
  }
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "-m", "base"]);
  const base = runGit(root, ["rev-parse", "HEAD"]);
  runGit(root, ["switch", "--create", "automation/changelog"]);
  writeFileSync(join(root, branchPath), "branch edit\n");
  runGit(root, ["add", branchPath]);
  runGit(root, ["commit", "-m", "branch edit"]);
  const branchCommit = runGit(root, ["rev-parse", "HEAD"]);
  runGit(root, ["switch", "main"]);
  assert.equal(runGit(root, ["rev-parse", "HEAD"]), base);
  writeFileSync(join(root, mainPath), "main edit\n");
  runGit(root, ["add", mainPath]);
  runGit(root, ["commit", "-m", "main edit"]);
  return { root, mainCommit: runGit(root, ["rev-parse", "HEAD"]), branchCommit };
}

test("combines non-overlapping draft edits without overwriting a newer main correction", () => {
  const repository = divergentLedger(
    "changes/entries/a.json",
    "changes/entries/b.json",
  );
  assert.deepEqual(mergeAutomationCache(repository), ["changes/entries/b.json"]);
  assert.equal(readFileSync(join(repository.root, "changes/entries/a.json"), "utf8"), "main edit\n");
  assert.equal(readFileSync(join(repository.root, "changes/entries/b.json"), "utf8"), "branch edit\n");
});

test("fails closed when main and the open draft edit the same ledger record", () => {
  const repository = divergentLedger(
    "changes/entries/a.json",
    "changes/entries/a.json",
  );
  assert.throws(() => mergeAutomationCache(repository), /both changed ledger records/);
});
