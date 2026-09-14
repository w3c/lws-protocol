import assert from "node:assert/strict";
import test from "node:test";
import {
  commitParents,
  isGeneratedPath,
  proposalDecision,
  proposeCandidate,
} from "../propose.mjs";
import { sha } from "./helpers.mjs";

test("plans no-op, draft, update, and cleanup states without reopening an empty PR", () => {
  assert.deepEqual(
    proposalDecision({ candidateTree: "base", baseTree: "base", branchTree: null, pull: null }),
    { action: "noop" },
  );
  assert.deepEqual(
    proposalDecision({ candidateTree: "new", baseTree: "base", branchTree: null, pull: null }),
    { action: "update", preRedraft: false, closeAfterPush: false },
  );
  assert.deepEqual(
    proposalDecision({
      candidateTree: "edited",
      baseTree: "base",
      branchTree: "edited",
      pull: { draft: false },
    }),
    { action: "ensure", redraft: false },
  );
  assert.deepEqual(
    proposalDecision({
      candidateTree: "new",
      baseTree: "base",
      branchTree: "edited",
      pull: { draft: false },
    }),
    { action: "update", preRedraft: true, closeAfterPush: false },
  );
  assert.deepEqual(
    proposalDecision({
      candidateTree: "base",
      baseTree: "base",
      branchTree: "edited",
      pull: { draft: false },
    }),
    { action: "update", preRedraft: true, closeAfterPush: true },
  );
  assert.deepEqual(
    proposalDecision({
      candidateTree: "base",
      baseTree: "base",
      branchTree: "base",
      pull: null,
    }),
    { action: "close" },
  );
});

test("uses a merge parent only when main diverged and restricts branch scope", () => {
  assert.deepEqual(commitParents(sha("a"), null, true), [sha("a")]);
  assert.deepEqual(commitParents(sha("a"), sha("b"), true), [sha("b")]);
  assert.deepEqual(commitParents(sha("a"), sha("b"), false), [sha("b"), sha("a")]);
  assert.equal(isGeneratedPath("CHANGELOG.md"), true);
  assert.equal(isGeneratedPath("changes/entries/pr-1.json"), true);
  assert.equal(isGeneratedPath("README.md"), false);
});

function proposerGit(events, { rejectPush = false } = {}) {
  return (_root, arguments_) => {
    const command = arguments_.join(" ");
    if (arguments_[0] === "fetch") {
      return { status: 0, output: "" };
    }
    if (command === "rev-parse FETCH_HEAD") {
      return { status: 0, output: sha("a") };
    }
    if (command === "rev-parse refs/remotes/origin/automation/changelog") {
      return { status: 0, output: sha("b") };
    }
    if (command === `merge-base ${sha("a")} ${sha("b")}`) {
      return { status: 0, output: sha("9") };
    }
    if (arguments_[0] === "diff") {
      return { status: 0, output: "" };
    }
    if (command === `rev-parse ${sha("b")}^{tree}`) {
      return { status: 0, output: sha("d") };
    }
    if (arguments_[0] === "add") {
      return { status: 0, output: "" };
    }
    if (command === "write-tree") {
      return { status: 0, output: sha("c") };
    }
    if (command === `rev-parse ${sha("a")}^{tree}`) {
      return { status: 0, output: sha("e") };
    }
    if (arguments_[0] === "merge-base" && arguments_[1] === "--is-ancestor") {
      return { status: 0, output: "" };
    }
    if (arguments_[0] === "commit-tree") {
      return { status: 0, output: sha("f") };
    }
    if (arguments_[0] === "push") {
      events.push({ type: "push", arguments_ });
      if (rejectPush) {
        throw new Error("lease rejected");
      }
      return { status: 0, output: "" };
    }
    throw new Error(`Unexpected git command: ${command}`);
  };
}

test("returns a ready PR to draft before an exact-lease branch update", async () => {
  const events = [];
  await proposeCandidate({
    root: "/unused",
    repository: "w3c/lws-protocol",
    token: "test-token",
    baseCommit: sha("a"),
    expectedBranch: sha("b"),
    body: "review this",
    gitImplementation: proposerGit(events),
    openPullRequestImplementation: async () => ({ draft: false, node_id: "PR_node" }),
    convertPullRequestToDraftImplementation: async () => {
      events.push({ type: "redraft" });
    },
    ensureDraftPullRequestImplementation: async (options) => {
      events.push({ type: "ensure", options });
    },
  });
  assert.deepEqual(events.map((event) => event.type), ["redraft", "push", "ensure"]);
  const push = events.find((event) => event.type === "push");
  assert.ok(
    push.arguments_.includes(
      `--force-with-lease=refs/heads/automation/changelog:${sha("b")}`,
    ),
  );
});

test("a concurrent branch update rejects the lease and never publishes the candidate", async () => {
  const events = [];
  await assert.rejects(
    proposeCandidate({
      root: "/unused",
      repository: "w3c/lws-protocol",
      token: "test-token",
      baseCommit: sha("a"),
      expectedBranch: sha("b"),
      body: "review this",
      gitImplementation: proposerGit(events, { rejectPush: true }),
      openPullRequestImplementation: async () => ({ draft: true, node_id: "PR_node" }),
      ensureDraftPullRequestImplementation: async () => {
        events.push({ type: "ensure" });
      },
    }),
    /lease rejected/,
  );
  assert.deepEqual(events.map((event) => event.type), ["push"]);
});
