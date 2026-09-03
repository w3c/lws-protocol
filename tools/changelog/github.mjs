const API_VERSION = "2026-03-10";
const MAX_RESPONSE_CHARACTERS = 5_000_000;

function cleanErrorBody(value) {
  return value.replace(/[\r\n]+/g, " ").slice(0, 300);
}

export async function githubJson(path, token, options = {}) {
  if (!token) {
    throw new Error("GITHUB_TOKEN is required for GitHub API access.");
  }
  const url = new URL(path, "https://api.github.com");
  if (url.origin !== "https://api.github.com") {
    throw new Error("Refusing a GitHub API request to an unexpected origin.");
  }
  const response = await fetch(url, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(15_000),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": "w3c-lws-changelog",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = cleanErrorBody(await response.text());
    throw new Error(`GitHub API ${response.status} for ${url.pathname}: ${body}`);
  }
  const body = await response.text();
  if (body.length > MAX_RESPONSE_CHARACTERS) {
    throw new Error(`GitHub API response is too large for ${url.pathname}.`);
  }
  return JSON.parse(body);
}

export function assertRepository(repository) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? "")) {
    throw new Error("GITHUB_REPOSITORY must have the form owner/repository.");
  }
  return repository;
}

export async function listPullRequestFiles(repository, number, token) {
  const files = [];
  for (let page = 1; ; page += 1) {
    const batch = await githubJson(
      `/repos/${repository}/pulls/${number}/files?per_page=100&page=${page}`,
      token,
    );
    files.push(...batch);
    if (batch.length < 100) {
      return files;
    }
    if (page >= 30) {
      throw new Error("Pull request exceeds the supported 3,000-file API limit.");
    }
  }
}

export async function pullRequestForCommit(repository, commit, token) {
  const pulls = await githubJson(`/repos/${repository}/commits/${commit}/pulls`, token);
  const mergedToMain = pulls.filter(
    (pull) => pull.merged_at && pull.base?.ref === "main",
  );
  const exact = mergedToMain.filter((pull) => pull.merge_commit_sha === commit);
  if (exact.length === 1) {
    return exact[0];
  }
  if (exact.length > 1) {
    throw new Error(`Commit ${commit} is the merge result of more than one pull request.`);
  }
  const completePulls = [];
  for (const pull of mergedToMain) {
    const complete = await githubJson(`/repos/${repository}/pulls/${pull.number}`, token);
    if (complete.merged_at && complete.base?.ref === "main") {
      completePulls.push(complete);
    }
  }
  const completeExact = completePulls.filter((pull) => pull.merge_commit_sha === commit);
  if (completeExact.length === 1) {
    return completeExact[0];
  }
  if (completeExact.length > 1 || completePulls.length > 1) {
    throw new Error(`Commit ${commit} has ambiguous merged pull-request provenance.`);
  }
  // GitHub associates every landed commit with a rebase-merged pull request, but
  // merge_commit_sha identifies only the final rebased commit. A single merged
  // association is therefore the safe fallback for earlier commits in that PR.
  return completePulls[0] ?? null;
}

export async function directPushDetails(repository, before, after, token) {
  const commit = await githubJson(`/repos/${repository}/commits/${after}`, token);
  const usableBefore = /^[0-9a-f]{40}$/.test(before) && !/^0+$/.test(before)
    ? before
    : commit.parents?.[0]?.sha;
  if (!usableBefore) {
    throw new Error("Cannot determine the parent commit for a direct push.");
  }
  const comparison = await githubJson(
    `/repos/${repository}/compare/${usableBefore}...${after}`,
    token,
  );
  if (!Array.isArray(comparison.files)) {
    throw new Error("GitHub comparison did not include a changed-file list.");
  }
  if (comparison.files.length >= 300) {
    throw new Error(
      "Direct push touches at least GitHub's 300-file comparison limit; classify it manually.",
    );
  }
  return { commit, comparison, before: usableBefore };
}

const MAX_FILTERED_RUNS = 900;

async function workflowRunsInWindow(repository, workflowFile, start, end, token) {
  const queryForPage = (page) =>
    new URLSearchParams({
      branch: "main",
      event: "push",
      created: `${start}..${end}`,
      per_page: "100",
      page: String(page),
    });
  const workflowPath = encodeURIComponent(workflowFile);
  const first = await githubJson(
    `/repos/${repository}/actions/workflows/${workflowPath}/runs?${queryForPage(1)}`,
    token,
  );
  const totalCount = Number(first.total_count);
  if (!Number.isSafeInteger(totalCount) || totalCount < 0) {
    throw new Error(`GitHub returned an invalid run count for ${workflowFile}.`);
  }
  if (totalCount > MAX_FILTERED_RUNS) {
    const startTime = Date.parse(start);
    const endTime = Date.parse(end);
    if (endTime - startTime < 2_000) {
      throw new Error(`More than ${MAX_FILTERED_RUNS} workflow runs share one reconciliation window.`);
    }
    const midpoint = startTime + Math.floor((endTime - startTime) / 2);
    return [
      ...(await workflowRunsInWindow(
        repository,
        workflowFile,
        new Date(startTime).toISOString(),
        new Date(midpoint).toISOString(),
        token,
      )),
      ...(await workflowRunsInWindow(
        repository,
        workflowFile,
        new Date(midpoint + 1).toISOString(),
        new Date(endTime).toISOString(),
        token,
      )),
    ];
  }
  const runs = Array.isArray(first.workflow_runs) ? [...first.workflow_runs] : [];
  const pages = Math.ceil(totalCount / 100);
  for (let page = 2; page <= pages; page += 1) {
    const result = await githubJson(
      `/repos/${repository}/actions/workflows/${workflowPath}/runs?${queryForPage(page)}`,
      token,
    );
    if (!Array.isArray(result.workflow_runs)) {
      throw new Error(`GitHub returned malformed workflow runs for ${workflowFile}.`);
    }
    runs.push(...result.workflow_runs);
  }
  return runs;
}

function assertWorkflowRun(run, workflow, workflowId, attempt) {
  const expectedPath = `.github/workflows/${workflow.file}`;
  if (
    !Number.isSafeInteger(run.id) ||
    run.id < 1 ||
    run.workflow_id !== workflowId ||
    run.name !== workflow.name ||
    (typeof run.path !== "string" || run.path.split("@", 1)[0] !== expectedPath) ||
    run.event !== "push" ||
    run.head_branch !== "main" ||
    !/^[0-9a-f]{40}$/.test(run.head_sha ?? "") ||
    run.run_attempt !== attempt
  ) {
    throw new Error(
      `GitHub returned inconsistent provenance for ${workflow.file} run ${run.id}, attempt ${attempt}.`,
    );
  }
}

export async function listSuccessfulWorkflowRuns(
  repository,
  workflows,
  notBefore,
  token,
  now = new Date(),
) {
  const startTime = Date.parse(notBefore);
  const endTime = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime > endTime) {
    throw new Error("Workflow reconciliation requires a valid bounded time range.");
  }
  const successful = new Map();
  for (const workflow of workflows) {
    if (
      !workflow ||
      typeof workflow.name !== "string" ||
      typeof workflow.file !== "string" ||
      !/^echidna-[a-z0-9-]+\.yml$/.test(workflow.file)
    ) {
      throw new Error("Workflow reconciliation requires registered workflow names and files.");
    }
    const workflowPath = encodeURIComponent(workflow.file);
    const metadata = await githubJson(
      `/repos/${repository}/actions/workflows/${workflowPath}`,
      token,
    );
    const expectedPath = `.github/workflows/${workflow.file}`;
    if (
      !Number.isSafeInteger(metadata.id) ||
      metadata.id < 1 ||
      metadata.name !== workflow.name ||
      metadata.path !== expectedPath
    ) {
      throw new Error(`Registered workflow ${workflow.file} does not match GitHub metadata.`);
    }
    const runs = await workflowRunsInWindow(
      repository,
      workflow.file,
      new Date(startTime).toISOString(),
      new Date(endTime).toISOString(),
      token,
    );
    for (const run of runs) {
      const latestAttempt = run.run_attempt ?? 1;
      if (!Number.isSafeInteger(latestAttempt) || latestAttempt < 1) {
        throw new Error(`GitHub returned an invalid attempt count for workflow run ${run.id}.`);
      }
      for (let attempt = 1; attempt <= latestAttempt; attempt += 1) {
        const candidate =
          attempt === latestAttempt
            ? run
            : await githubJson(
                `/repos/${repository}/actions/runs/${run.id}/attempts/${attempt}`,
                token,
              );
        assertWorkflowRun(candidate, workflow, metadata.id, attempt);
        if (candidate.conclusion !== "success") {
          continue;
        }
        if (!Number.isFinite(Date.parse(candidate.updated_at))) {
          throw new Error(`GitHub returned an invalid completion time for workflow run ${run.id}.`);
        }
        const key = `${candidate.id}:${attempt}`;
        successful.set(key, {
          ...candidate,
          attempt,
          workflowId: metadata.id,
          workflowFile: workflow.file,
        });
      }
    }
  }
  return [...successful.values()].sort(
    (left, right) =>
      left.updated_at.localeCompare(right.updated_at) ||
      left.id - right.id ||
      left.attempt - right.attempt,
  );
}
