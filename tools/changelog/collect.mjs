import { spawnSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import {
  assertRepository,
  directPushDetails,
  listSuccessfulWorkflowRuns,
  listPullRequestFiles,
  pullRequestForCommit,
} from "./github.mjs";
import { parsePullRequestMetadata, pathsForFile, specificationsForFiles } from "./metadata.mjs";
import {
  gitIsAncestor,
  loadEntries,
  loadPublications,
  loadState,
  mergePublication,
  synchronizePublicationEntries,
  validateEntry,
  validatePublication,
  validateState,
  writeJsonAtomic,
} from "./records.mjs";
import { buildSummaryInput, summarizeChange } from "./summarize.mjs";

function truncate(value, length) {
  return String(value ?? "").slice(0, length);
}

function pendingSummary(metadata, evidenceGaps = []) {
  return {
    status: "pending",
    text: truncate(metadata.summary, 1200),
    implementationConsiderations: [],
    evidenceGaps: evidenceGaps.slice(0, 5).map((gap) => truncate(gap, 400)),
  };
}

function existingEntries(root) {
  return new Map(loadEntries(root).map(({ value }) => [value.id, value]));
}

function preserveEditorialReview(draft, prior) {
  return {
    ...draft,
    classification: prior.classification,
    review: prior.review,
    summary: prior.summary,
  };
}

function hasHumanEditorialReview(entry) {
  return (
    entry.classification?.class !== "unclassified" ||
    entry.classification?.selectedBy !== "unavailable" ||
    entry.classification?.public !== false ||
    entry.review?.tests?.status !== "unavailable" ||
    Boolean(entry.review?.tests?.rationale) ||
    entry.review?.workingGroupRecord !== null ||
    entry.summary?.status === "edited"
  );
}

function filesForSpecification(files, specification) {
  return files.filter((file) =>
    pathsForFile(file).some((filename) => filename.startsWith(`${specification}/`)),
  );
}

function changedPathsForSpecification(files, specification) {
  return [
    ...new Set(
      files
        .flatMap(pathsForFile)
        .filter((filename) => filename.startsWith(`${specification}/`)),
    ),
  ].sort();
}

export async function summaryForPullRequest({
  pullRequest,
  specification,
  spec,
  metadata,
  files,
  environment = process.env,
  summarizeImplementation = summarizeChange,
}) {
  if (environment.CHANGELOG_AI_ENABLED !== "true" || !metadata.public) {
    return pendingSummary(metadata, ["Automated summary not enabled; maintainer review required."]);
  }
  try {
    const input = buildSummaryInput({
      pullRequest,
      specification,
      specificationTitle: spec.title,
      metadata,
      files,
    });
    return await summarizeImplementation(input, environment);
  } catch (error) {
    console.warn(`Automated summary unavailable: ${error.message}`);
    return pendingSummary(metadata, ["Automated summary unavailable; maintainer review required."]);
  }
}

function writeEntriesAndSynchronize(root, entries, specifications, obsoleteIds = []) {
  const validated = entries.map((entry) => ({ entry, errors: validateEntry(entry, specifications) }));
  const errors = validated.flatMap((result) => result.errors);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  for (const entry of entries) {
    writeJsonAtomic(join(root, "changes", "entries", `${entry.id}.json`), entry);
  }
  for (const id of obsoleteIds) {
    const path = join(root, "changes", "entries", `${id}.json`);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }

  const allEntries = loadEntries(root).map(({ value }) => value);
  const publications = loadPublications(root).map(({ value }) => value);
  synchronizePublicationEntries(allEntries, publications, (candidate, descendant) =>
    gitIsAncestor(root, candidate, descendant),
  );
  for (const publication of publications) {
    writeJsonAtomic(join(root, "changes", "publications", `${publication.id}.json`), publication);
  }
}

async function collectPullRequest({ root, specifications, repository, commit, pullRequest, token, environment }) {
  const files = await listPullRequestFiles(repository, pullRequest.number, token);
  const affected = specificationsForFiles(files, specifications);
  const metadata = parsePullRequestMetadata(pullRequest.body ?? "");
  const oldEntries = existingEntries(root);
  const entries = [];
  const obsoleteIds = [];

  for (const specification of affected) {
    const id = `pr-${pullRequest.number}--${specification}`;
    const canonicalPrior = oldEntries.get(id);
    const provisionalId = `commit-${commit.slice(0, 12)}--${specification}`;
    const provisional = oldEntries.get(provisionalId);
    const prior = canonicalPrior ?? (provisional && hasHumanEditorialReview(provisional) ? provisional : null);
    if (provisional) {
      obsoleteIds.push(provisionalId);
    }
    const specFiles = filesForSpecification(files, specification);
    const usableMetadata = metadata.errors.length === 0;
    const draft = {
      $schema: "../entry.schema.json",
      schemaVersion: 1,
      id,
      specification,
      classification: usableMetadata
        ? {
            class: metadata.correctionClass,
            selectedBy: "author",
            public: metadata.public,
          }
        : { class: "unclassified", selectedBy: "unavailable", public: false },
      source: {
        kind: "pull_request",
        pullRequest: pullRequest.number,
        title: truncate(pullRequest.title, 300),
        url: pullRequest.html_url,
        author: truncate(pullRequest.user?.login || "unknown", 100),
        mergedAt: pullRequest.merged_at,
        baseCommit: pullRequest.base.sha,
        headCommit: pullRequest.head.sha,
        mergeCommit: commit,
        changedFiles: changedPathsForSpecification(specFiles, specification),
      },
      review: usableMetadata
        ? {
            tests: metadata.tests,
            workingGroupRecord: metadata.workingGroupRecord,
          }
        : {
            tests: { status: "unavailable", rationale: "" },
            workingGroupRecord: null,
          },
      summary: pendingSummary(metadata, metadata.errors),
    };

    if (prior) {
      entries.push(preserveEditorialReview(draft, prior));
      continue;
    }
    if (usableMetadata) {
      draft.summary = await summaryForPullRequest({
        pullRequest,
        specification,
        spec: specifications[specification],
        metadata,
        files: specFiles,
        environment,
      });
    }
    entries.push(draft);
  }
  writeEntriesAndSynchronize(root, entries, specifications, obsoleteIds);
  return entries;
}

async function collectDirectPush({ root, specifications, repository, event, token }) {
  const details = await directPushDetails(repository, event.before, event.after, token);
  const files = details.comparison.files ?? [];
  const affected = specificationsForFiles(files, specifications);
  const oldEntries = existingEntries(root);
  const entries = [];
  for (const specification of affected) {
    const id = `commit-${event.after.slice(0, 12)}--${specification}`;
    const prior = oldEntries.get(id);
    const specFiles = filesForSpecification(files, specification);
    const entry = {
      $schema: "../entry.schema.json",
      schemaVersion: 1,
      id,
      specification,
      classification: { class: "unclassified", selectedBy: "unavailable", public: false },
      source: {
        kind: "direct_push",
        title: truncate(details.commit.commit?.message?.split("\n", 1)[0] || "Direct push", 300),
        url: details.commit.html_url,
        author: truncate(
          details.commit.author?.login || details.commit.commit?.author?.name || event.pusher?.name || "unknown",
          100,
        ),
        mergedAt: details.commit.commit?.committer?.date,
        baseCommit: details.before,
        headCommit: event.after,
        mergeCommit: event.after,
        changedFiles: changedPathsForSpecification(specFiles, specification),
      },
      review: {
        tests: { status: "unavailable", rationale: "" },
        workingGroupRecord: null,
      },
      summary: pendingSummary(
        { summary: "" },
        ["Direct push has no pull-request changelog metadata; maintainer classification required."],
      ),
    };
    entries.push(prior ? preserveEditorialReview(entry, prior) : entry);
  }
  writeEntriesAndSynchronize(root, entries, specifications);
  return entries;
}

export async function collectPush({ root, specifications, event, token, environment = process.env }) {
  const repository = assertRepository(event.repository?.full_name || environment.GITHUB_REPOSITORY);
  const commit = event.after;
  if (!/^[0-9a-f]{40}$/.test(commit ?? "")) {
    throw new Error("Push event does not contain a full after commit hash.");
  }
  const pullRequest = await pullRequestForCommit(repository, commit, token);
  if (pullRequest) {
    return collectPullRequest({
      root,
      specifications,
      repository,
      commit,
      pullRequest,
      token,
      environment,
    });
  }
  return collectDirectPush({ root, specifications, repository, event, token });
}

function gitOutput(root, arguments_) {
  const result = spawnSync("git", arguments_, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Git command failed: ${String(result.stderr).trim().slice(0, 300)}`);
  }
  return result.stdout.trim();
}

export function commitsBetween(root, fromCommit, toCommit) {
  if (!/^[0-9a-f]{40}$/.test(fromCommit) || !/^[0-9a-f]{40}$/.test(toCommit)) {
    throw new Error("Commit reconciliation requires full commit hashes.");
  }
  if (fromCommit === toCommit) {
    return [];
  }
  if (!gitIsAncestor(root, fromCommit, toCommit)) {
    throw new Error("The changelog watermark is not an ancestor of the target main commit.");
  }
  const output = gitOutput(root, [
    "rev-list",
    "--reverse",
    "--first-parent",
    "--parents",
    `${fromCommit}..${toCommit}`,
  ]);
  if (!output) {
    return [];
  }
  return output.split("\n").map((line) => {
    const [commit, parent] = line.trim().split(/\s+/);
    if (!/^[0-9a-f]{40}$/.test(commit) || !/^[0-9a-f]{40}$/.test(parent)) {
      throw new Error(`Cannot determine first-parent provenance for ${line}.`);
    }
    return { commit, parent };
  });
}

export async function reconcileChanges({
  root,
  specifications,
  repository,
  targetCommit,
  token,
  environment = process.env,
  commitRangeImplementation = commitsBetween,
  collectImplementation = collectPush,
}) {
  const state = loadState(root);
  const stateErrors = validateState(state);
  if (stateErrors.length > 0) {
    throw new Error(stateErrors.join("\n"));
  }
  const commits = commitRangeImplementation(root, state.adoptionCommit, targetCommit);
  let recorded = 0;
  const expectedEntryIds = new Set();
  for (const { commit, parent } of commits) {
    const entries = await collectImplementation({
      root,
      specifications,
      event: {
        before: parent,
        after: commit,
        repository: { full_name: repository },
      },
      token,
      environment,
    });
    recorded += entries.length;
    for (const entry of entries) {
      if (entry && typeof entry.id === "string") {
        expectedEntryIds.add(entry.id);
      }
    }
  }
  const unexpectedEntries = loadEntries(root)
    .map(({ value }) => value.id)
    .filter((id) => !expectedEntryIds.has(id));
  if (unexpectedEntries.length > 0) {
    throw new Error(
      `The reconciliation cache contains entries absent from main history: ${unexpectedEntries.join(", ")}`,
    );
  }
  return recorded;
}

export class PublicationPendingError extends Error {}

function workflowFileFromRun(run) {
  if (typeof run.workflowFile === "string") {
    return run.workflowFile;
  }
  if (typeof run.path !== "string") {
    return null;
  }
  const path = run.path.split("@", 1)[0];
  const match = /^\.github\/workflows\/(echidna-[a-z0-9-]+\.yml)$/.exec(path);
  return match?.[1] ?? null;
}

export async function recordPublication({
  root,
  specifications,
  event,
  fetchImplementation = fetch,
  sleeper = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ancestorCheck = (candidate, descendant) => gitIsAncestor(root, candidate, descendant),
  historyAttempts = 6,
  historyCache = null,
}) {
  const run = event.workflow_run;
  if (!run || run.conclusion !== "success" || run.event !== "push" || run.head_branch !== "main") {
    throw new Error("Publication records require a successful Echidna push run on main.");
  }
  const workflowFile = workflowFileFromRun(run);
  const attempt = run.attempt ?? run.run_attempt;
  const specification = Object.keys(specifications).find(
    (name) =>
      specifications[name].publicationWorkflow === run.name &&
      specifications[name].publicationWorkflowFile === workflowFile,
  );
  if (!specification) {
    throw new Error(`No specification is registered for workflow ${run.name} at ${workflowFile}.`);
  }
  const spec = specifications[specification];
  const expectedDates = new Set(
    [run.run_started_at, run.updated_at]
      .filter((value) => typeof value === "string" && !Number.isNaN(Date.parse(value)))
      .map((value) => value.slice(0, 10)),
  );
  if (
    expectedDates.size === 0 ||
    !/^[0-9a-f]{40}$/.test(run.head_sha ?? "") ||
    !Number.isSafeInteger(run.id) ||
    run.id < 1 ||
    !Number.isSafeInteger(attempt) ||
    attempt < 1 ||
    !Number.isSafeInteger(run.workflowId ?? run.workflow_id) ||
    (run.workflowId ?? run.workflow_id) < 1
  ) {
    throw new Error("Echidna run provenance is incomplete.");
  }
  let versions = [];
  let versionIndex = -1;
  if (!Number.isSafeInteger(historyAttempts) || historyAttempts < 1 || historyAttempts > 6) {
    throw new Error("Publication history attempts must be between one and six.");
  }
  for (let historyAttempt = 0; historyAttempt < historyAttempts; historyAttempt += 1) {
    versions = historyAttempt === 0 ? historyCache?.get(spec.shortName) ?? [] : [];
    if (versions.length === 0) {
      const history = new URL(`https://www.w3.org/standards/history/${spec.shortName}/`);
      const response = await fetchImplementation(history, {
        headers: { "User-Agent": "w3c-lws-changelog" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        throw new Error(`W3C publication history returned HTTP ${response.status}.`);
      }
      const { extractDatedVersions } = await import("./records.mjs");
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > 2_000_000) {
        throw new Error("W3C publication history response is too large.");
      }
      const body = await response.text();
      if (body.length > 2_000_000) {
        throw new Error("W3C publication history response is too large.");
      }
      versions = extractDatedVersions(body, spec.shortName);
      historyCache?.set(spec.shortName, versions);
    }
    const { publicationDateFromUrl } = await import("./records.mjs");
    versionIndex = versions.findIndex((version) =>
      expectedDates.has(publicationDateFromUrl(version)),
    );
    if (versionIndex >= 0 && versions[versionIndex + 1]) {
      break;
    }
    if (historyAttempt < historyAttempts - 1) {
      await sleeper(8_000);
    }
  }
  if (versionIndex < 0 || !versions[versionIndex + 1]) {
    throw new PublicationPendingError(
      `Publication history for ${spec.shortName} does not yet expose a dated result for this run.`,
    );
  }

  const { htmlDiffUrl, publicationDateFromUrl } = await import("./records.mjs");
  const thisVersion = versions[versionIndex];
  const previousVersion = versions[versionIndex + 1];
  const publishedAt = publicationDateFromUrl(thisVersion);
  const id = `${specification}--${publishedAt}`;
  const incoming = {
    $schema: "../publication.schema.json",
    schemaVersion: 1,
    id,
    specification,
    publishedAt,
    thisVersion,
    previousVersion,
    diff: htmlDiffUrl(previousVersion, thisVersion),
    sourceCommits: [run.head_sha],
    entries: [],
    echidnaRuns: [
      {
        id: run.id,
        attempt,
        url: `https://github.com/w3c/lws-protocol/actions/runs/${run.id}/attempts/${attempt}`,
        workflowId: run.workflowId ?? run.workflow_id,
        workflowFile,
        headCommit: run.head_sha,
        completedAt: run.updated_at,
      },
    ],
  };
  const publications = loadPublications(root).map(({ value }) => value);
  const existingIndex = publications.findIndex((publication) => publication.id === id);
  publications.splice(
    existingIndex < 0 ? publications.length : existingIndex,
    existingIndex < 0 ? 0 : 1,
    mergePublication(existingIndex < 0 ? null : publications[existingIndex], incoming),
  );
  const entries = loadEntries(root).map(({ value }) => value);
  synchronizePublicationEntries(entries, publications, ancestorCheck);
  for (const publication of publications) {
    const errors = validatePublication(publication, specifications);
    if (errors.length > 0) {
      throw new Error(errors.join("\n"));
    }
    writeJsonAtomic(
      join(root, "changes", "publications", `${publication.id}.json`),
      publication,
    );
  }
  return publications.find((publication) => publication.id === id);
}

export async function reconcilePublications({
  root,
  specifications,
  repository,
  token,
  listRunsImplementation = listSuccessfulWorkflowRuns,
  recordImplementation = recordPublication,
}) {
  const state = loadState(root);
  const workflows = Object.values(specifications)
    .filter((specification) => specification.publicationWorkflow !== null)
    .map((specification) => ({
      name: specification.publicationWorkflow,
      file: specification.publicationWorkflowFile,
    }));
  const runs = await listRunsImplementation(
    repository,
    workflows,
    state.publicationNotBefore,
    token,
  );
  const existingRuns = loadPublications(root).flatMap(({ value }) => value.echidnaRuns);
  const runKey = (run) => `${run.id}:${run.attempt}`;
  const expectedRunKeys = new Set(runs.map(runKey));
  const unexpectedRunKeys = existingRuns.map(runKey).filter((key) => !expectedRunKeys.has(key));
  if (unexpectedRunKeys.length > 0) {
    throw new Error(
      `The reconciliation cache contains unknown Echidna run attempts: ${[
        ...new Set(unexpectedRunKeys),
      ].join(", ")}`,
    );
  }
  const previouslyRecorded = new Set(existingRuns.map(runKey));
  const historyCache = new Map();
  let recorded = 0;
  for (const run of runs) {
    const key = runKey(run);
    try {
      await recordImplementation({
        root,
        specifications,
        event: { workflow_run: run },
        historyAttempts: 1,
        historyCache,
      });
      if (!previouslyRecorded.has(key)) {
        recorded += 1;
      }
    } catch (error) {
      if (error instanceof PublicationPendingError && !previouslyRecorded.has(key)) {
        console.warn(
          `Publication reconciliation pending for run ${run.id}, attempt ${run.attempt}: ${error.message}`,
        );
        continue;
      }
      throw error;
    }
  }
  const runCounts = new Map();
  for (const run of loadPublications(root).flatMap(({ value }) => value.echidnaRuns)) {
    const key = runKey(run);
    runCounts.set(key, (runCounts.get(key) ?? 0) + 1);
  }
  const duplicateRunKeys = [...runCounts].filter(([, count]) => count > 1).map(([key]) => key);
  if (duplicateRunKeys.length > 0) {
    throw new Error(
      `Echidna run attempts assigned to multiple publications: ${duplicateRunKeys.join(", ")}`,
    );
  }
  return recorded;
}

export async function reconcileRepository(options) {
  const entries = await reconcileChanges(options);
  const publications = await reconcilePublications(options);
  return { entries, publications };
}
