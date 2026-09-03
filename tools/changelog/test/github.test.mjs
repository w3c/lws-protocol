import assert from "node:assert/strict";
import test from "node:test";
import {
  githubJson,
  listSuccessfulWorkflowRuns,
  pullRequestForCommit,
} from "../github.mjs";
import { sha } from "./helpers.mjs";

test("sends JSON API mutations with the correct media type", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers["Content-Type"], "application/json");
    return Response.json({ ok: true });
  };
  await githubJson("/graphql", "test-token", {
    method: "POST",
    body: JSON.stringify({ query: "query { viewer { login } }" }),
  });
});

test("attributes an earlier commit in a single rebase-merged pull request", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  const earlierCommit = sha("d");
  const finalCommit = sha("e");
  const pull = {
    number: 77,
    merged_at: "2026-09-03T12:00:00Z",
    merge_commit_sha: finalCommit,
    base: { ref: "main", sha: sha("a") },
    head: { sha: sha("b") },
  };
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith(`/commits/${earlierCommit}/pulls`)) {
      return Response.json([pull]);
    }
    if (path.endsWith("/pulls/77")) {
      return Response.json(pull);
    }
    throw new Error(`Unexpected request ${url}`);
  };
  assert.equal(
    (await pullRequestForCommit("w3c/lws-protocol", earlierCommit, "test-token")).number,
    77,
  );
});

test("binds publication evidence to a workflow file and preserves successful rerun attempts", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  const common = {
    id: 123,
    workflow_id: 12,
    name: "Echidna lws-core",
    path: ".github/workflows/echidna-core.yml@main",
    event: "push",
    head_branch: "main",
    head_sha: sha("c"),
    run_started_at: "2026-09-03T12:00:00Z",
  };
  globalThis.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/actions/workflows/echidna-core.yml")) {
      return Response.json({
        id: 12,
        name: "Echidna lws-core",
        path: ".github/workflows/echidna-core.yml",
      });
    }
    if (parsed.pathname.endsWith("/actions/workflows/echidna-core.yml/runs")) {
      assert.equal(parsed.searchParams.get("branch"), "main");
      assert.equal(parsed.searchParams.get("event"), "push");
      assert.match(parsed.searchParams.get("created"), /^2026-09-03T00:00:00\.000Z\.\./);
      return Response.json({
        total_count: 1,
        workflow_runs: [
          {
            ...common,
            run_attempt: 2,
            conclusion: "failure",
            updated_at: "2026-09-03T12:10:00Z",
          },
        ],
      });
    }
    if (parsed.pathname.endsWith("/actions/runs/123/attempts/1")) {
      return Response.json({
        ...common,
        run_attempt: 1,
        conclusion: "success",
        updated_at: "2026-09-03T12:05:00Z",
      });
    }
    throw new Error(`Unexpected request ${url}`);
  };
  const runs = await listSuccessfulWorkflowRuns(
    "w3c/lws-protocol",
    [{ name: "Echidna lws-core", file: "echidna-core.yml" }],
    "2026-09-03T00:00:00Z",
    "test-token",
    new Date("2026-09-04T00:00:00Z"),
  );
  assert.equal(runs.length, 1);
  assert.equal(runs[0].attempt, 1);
  assert.equal(runs[0].workflowId, 12);
  assert.equal(runs[0].workflowFile, "echidna-core.yml");
});
