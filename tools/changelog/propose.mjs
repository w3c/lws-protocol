#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { assertRepository, githubJson } from "./github.mjs";

const BRANCH = "automation/changelog";
const TITLE = "chore: update the LWS implementer changelog";
const GENERATED_PATHS = ["CHANGELOG.md", "changes/entries", "changes/publications"];
const SHA = /^[0-9a-f]{40}$/;

export function git(root, arguments_, { allowedStatuses = [0], input } = {}) {
  const result = spawnSync("git", arguments_, {
    cwd: root,
    encoding: "utf8",
    input,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "github-actions[bot]",
      GIT_AUTHOR_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com",
      GIT_COMMITTER_NAME: "github-actions[bot]",
      GIT_COMMITTER_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com",
    },
  });
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(
      `git ${arguments_[0]} failed: ${String(result.stderr || result.stdout).trim().slice(0, 500)}`,
    );
  }
  return { status: result.status, output: result.stdout.trim() };
}

export function isGeneratedPath(path) {
  return (
    path === "CHANGELOG.md" ||
    path.startsWith("changes/entries/") ||
    path.startsWith("changes/publications/")
  );
}

function assertBranchScope(root, baseCommit, branchCommit, gitImplementation) {
  const mergeBase = gitImplementation(root, ["merge-base", baseCommit, branchCommit]).output;
  const changed = gitImplementation(
    root,
    ["diff", "--name-only", "-z", `${mergeBase}..${branchCommit}`],
  ).output
    .split("\0")
    .filter(Boolean);
  const unexpected = changed.filter((path) => !isGeneratedPath(path));
  if (unexpected.length > 0) {
    throw new Error(`Automation branch contains out-of-scope paths: ${unexpected.join(", ")}`);
  }
}

async function openPullRequest(repository, token) {
  const query = new URLSearchParams({
    state: "open",
    head: "w3c:automation/changelog",
    base: "main",
    per_page: "10",
  });
  const pulls = await githubJson(`/repos/${repository}/pulls?${query}`, token);
  if (pulls.length > 1) {
    throw new Error("More than one open changelog automation pull request exists.");
  }
  return pulls[0] ?? null;
}

async function closePullRequest(repository, token) {
  const pull = await openPullRequest(repository, token);
  if (pull) {
    await githubJson(`/repos/${repository}/pulls/${pull.number}`, token, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed" }),
    });
  }
}

async function convertPullRequestToDraft(repository, token, pull) {
  const result = await githubJson("/graphql", token, {
    method: "POST",
    body: JSON.stringify({
      query:
        "mutation($id: ID!) { convertPullRequestToDraft(input: { pullRequestId: $id }) " +
        "{ pullRequest { isDraft } } }",
      variables: { id: pull.node_id },
    }),
  });
  if (result.errors || result.data?.convertPullRequestToDraft?.pullRequest?.isDraft !== true) {
    throw new Error("GitHub did not convert the changelog pull request back to draft.");
  }
}

async function ensureDraftPullRequest({ repository, token, body, redraft }) {
  const pull = await openPullRequest(repository, token);
  if (!pull) {
    await githubJson(`/repos/${repository}/pulls`, token, {
      method: "POST",
      body: JSON.stringify({ title: TITLE, head: BRANCH, base: "main", body, draft: true }),
    });
    return;
  }
  await githubJson(`/repos/${repository}/pulls/${pull.number}`, token, {
    method: "PATCH",
    body: JSON.stringify({ title: TITLE, body }),
  });
  if (redraft && pull.draft !== true) {
    await convertPullRequestToDraft(repository, token, pull);
  }
}

export function proposalDecision({ candidateTree, baseTree, branchTree, pull }) {
  if (candidateTree === baseTree && (branchTree === null || candidateTree === branchTree)) {
    return { action: branchTree === null ? "noop" : "close" };
  }
  if (candidateTree === branchTree) {
    return { action: "ensure", redraft: false };
  }
  return {
    action: "update",
    preRedraft: pull !== null && pull.draft !== true,
    closeAfterPush: candidateTree === baseTree,
  };
}

export function commitParents(baseCommit, expectedBranch, branchContainsBase) {
  if (!expectedBranch) {
    return [baseCommit];
  }
  return branchContainsBase ? [expectedBranch] : [expectedBranch, baseCommit];
}

export async function proposeCandidate({
  root,
  repository,
  token,
  baseCommit,
  expectedBranch,
  body,
  gitImplementation = git,
  openPullRequestImplementation = openPullRequest,
  closePullRequestImplementation = closePullRequest,
  ensureDraftPullRequestImplementation = ensureDraftPullRequest,
  convertPullRequestToDraftImplementation = convertPullRequestToDraft,
  beforePush = async () => {},
}) {
  if (!SHA.test(baseCommit ?? "") || (expectedBranch !== null && !SHA.test(expectedBranch))) {
    throw new Error("The proposer requires validated captured commit hashes.");
  }

  gitImplementation(root, ["fetch", "--no-tags", "origin", "main"]);
  const currentMain = gitImplementation(root, ["rev-parse", "FETCH_HEAD"]).output;
  if (currentMain !== baseCommit) {
    throw new Error("main advanced after generation; a later reconciliation will retry safely.");
  }

  let branchTree = null;
  if (expectedBranch) {
    gitImplementation(root, [
      "fetch",
      "--no-tags",
      "origin",
      `refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}`,
    ]);
    const actualBranch = gitImplementation(
      root,
      ["rev-parse", `refs/remotes/origin/${BRANCH}`],
    ).output;
    if (actualBranch !== expectedBranch) {
      throw new Error("The automation branch changed after generation; retrying will preserve it.");
    }
    assertBranchScope(root, baseCommit, expectedBranch, gitImplementation);
    branchTree = gitImplementation(root, ["rev-parse", `${expectedBranch}^{tree}`]).output;
  } else {
    const probe = gitImplementation(
      root,
      ["ls-remote", "--exit-code", "--heads", "origin", `refs/heads/${BRANCH}`],
      { allowedStatuses: [0, 2] },
    );
    if (probe.status === 0) {
      throw new Error("The automation branch appeared after generation; retrying will preserve it.");
    }
  }

  gitImplementation(root, ["add", "-A", "--", ...GENERATED_PATHS]);
  const candidateTree = gitImplementation(root, ["write-tree"]).output;
  const baseTree = gitImplementation(root, ["rev-parse", `${baseCommit}^{tree}`]).output;
  const pull = expectedBranch
    ? await openPullRequestImplementation(repository, token)
    : null;
  const decision = proposalDecision({ candidateTree, baseTree, branchTree, pull });
  if (decision.action === "noop") {
    return;
  }
  if (decision.action === "close") {
    await closePullRequestImplementation(repository, token);
    return;
  }
  if (decision.action === "ensure") {
    await ensureDraftPullRequestImplementation({
      repository,
      token,
      body,
      redraft: false,
    });
    return;
  }
  if (decision.preRedraft) {
    await convertPullRequestToDraftImplementation(repository, token, pull);
  }
  let containsBase = true;
  if (expectedBranch) {
    containsBase = gitImplementation(
      root,
      ["merge-base", "--is-ancestor", baseCommit, expectedBranch],
      { allowedStatuses: [0, 1] },
    ).status === 0;
  }
  const parents = commitParents(baseCommit, expectedBranch, containsBase);
  const commitArguments = ["commit-tree", candidateTree];
  for (const parent of parents) {
    commitArguments.push("-p", parent);
  }
  const commit = gitImplementation(root, commitArguments, {
    input: "chore: update LWS changelog\n",
  }).output;
  await beforePush();
  const lease = expectedBranch
    ? `--force-with-lease=refs/heads/${BRANCH}:${expectedBranch}`
    : `--force-with-lease=refs/heads/${BRANCH}:`;
  gitImplementation(root, ["push", lease, "origin", `${commit}:refs/heads/${BRANCH}`]);

  if (decision.closeAfterPush) {
    await closePullRequestImplementation(repository, token);
    return;
  }
  await ensureDraftPullRequestImplementation({
    repository,
    token,
    body,
    redraft: true,
  });
}

async function main() {
  const root = resolve(process.cwd());
  const repository = assertRepository(process.env.GITHUB_REPOSITORY);
  if (repository !== "w3c/lws-protocol") {
    throw new Error("The changelog proposer only operates on w3c/lws-protocol.");
  }
  await proposeCandidate({
    root,
    repository,
    token: process.env.GITHUB_TOKEN,
    baseCommit: process.env.GENERATED_BASE_SHA,
    expectedBranch: process.env.EXPECTED_BRANCH_SHA || null,
    body: readFileSync(join(root, ".github", "changelog-pr-body.md"), "utf8"),
  });
}

function reportFailure(error) {
  const message = String(error.message)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
  console.error(`::error title=LWS changelog proposal::${message}`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(reportFailure);
}
