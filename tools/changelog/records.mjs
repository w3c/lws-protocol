import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import {
  CHANGELOG_ADOPTION_COMMIT,
  CHANGELOG_PUBLICATION_NOT_BEFORE,
  isWorkingGroupRecordUrl,
  limits,
} from "./constraints.mjs";

const SHA = /^[0-9a-f]{40}$/;
const ENTRY_ID = /^(pr-[0-9]+|commit-[0-9a-f]{12})--lws[0-9a-z-]+$/;
const PUBLICATION_ID = /^lws[0-9a-z-]+--[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function readJson(path) {
  if (lstatSync(path).isSymbolicLink()) {
    throw new Error(`Refusing to read symbolic link ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadSpecifications(root) {
  const registry = readJson(join(root, "changes", "specifications.json"));
  if (registry.schemaVersion !== 1 || !registry.specifications) {
    throw new Error("Unsupported or malformed specification registry.");
  }
  const workflowFiles = new Set();
  for (const [name, specification] of Object.entries(registry.specifications)) {
    const workflow = specification?.publicationWorkflow;
    const workflowFile = specification?.publicationWorkflowFile;
    if ((workflow === null) !== (workflowFile === null)) {
      throw new Error(`Specification ${name} must register both publication workflow fields or neither.`);
    }
    if (workflow !== null) {
      if (
        typeof workflow !== "string" ||
        !workflow.trim() ||
        typeof workflowFile !== "string" ||
        !/^echidna-[a-z0-9-]+\.yml$/.test(workflowFile)
      ) {
        throw new Error(`Specification ${name} has invalid publication workflow provenance.`);
      }
      if (workflowFiles.has(workflowFile)) {
        throw new Error(`Publication workflow file ${workflowFile} is registered more than once.`);
      }
      workflowFiles.add(workflowFile);
    }
  }
  return registry.specifications;
}

function jsonFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }
  const status = lstatSync(directory);
  if (status.isSymbolicLink() || !status.isDirectory()) {
    throw new Error(`Expected a real directory at ${directory}`);
  }
  const names = readdirSync(directory).sort();
  const unexpected = names.filter((name) => name !== ".gitkeep" && !name.endsWith(".json"));
  if (unexpected.length > 0) {
    throw new Error(`Unexpected files in ${directory}: ${unexpected.join(", ")}`);
  }
  for (const name of names) {
    const path = join(directory, name);
    const entry = lstatSync(path);
    if (entry.isSymbolicLink() || !entry.isFile()) {
      throw new Error(`Expected a regular ledger file at ${path}`);
    }
  }
  return names
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => join(directory, name));
}

export function loadEntries(root) {
  return jsonFiles(join(root, "changes", "entries")).map((path) => ({
    path,
    value: readJson(path),
  }));
}

export function loadPublications(root) {
  return jsonFiles(join(root, "changes", "publications")).map((path) => ({
    path,
    value: readJson(path),
  }));
}

export function loadState(root) {
  return readJson(join(root, "changes", "state.json"));
}

function validDateTime(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isLwsActionsRunUrl(value, id, attempt) {
  try {
    const url = new URL(value);
    return (
      url.origin === "https://github.com" &&
      !url.username &&
      !url.password &&
      url.pathname === `/w3c/lws-protocol/actions/runs/${id}/attempts/${attempt}` &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function isSortedUnique(values) {
  return (
    Array.isArray(values) &&
    new Set(values).size === values.length &&
    values.every((value, index) => index === 0 || values[index - 1] < value)
  );
}

function rejectUnexpectedKeys(value, allowed, label, fail) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
    return;
  }
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    fail(`${label} contains unexpected fields: ${unexpected.join(", ")}`);
  }
}

function isLwsSourceUrl(value, kind, pullRequest) {
  try {
    const url = new URL(value);
    if (
      url.origin !== "https://github.com" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return false;
    }
    if (kind === "pull_request") {
      return url.pathname === `/w3c/lws-protocol/pull/${pullRequest}`;
    }
    return /^\/w3c\/lws-protocol\/commit\/[0-9a-f]{40}$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function isDatedW3cVersion(value, shortName) {
  try {
    const url = new URL(value);
    return (
      url.origin === "https://www.w3.org" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      new RegExp(`^/TR/[0-9]{4}/[^/]*${escapeRegExp(shortName)}-[0-9]{8}/$`).test(url.pathname)
    );
  } catch {
    return false;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function publicationDateFromUrl(value) {
  const match = /-([0-9]{4})([0-9]{2})([0-9]{2})\/$/.exec(new URL(value).pathname);
  if (!match) {
    throw new Error(`Cannot obtain a publication date from ${value}`);
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function htmlDiffUrl(previousVersion, thisVersion) {
  const url = new URL("https://services.w3.org/htmldiff");
  url.searchParams.set("doc1", previousVersion);
  url.searchParams.set("doc2", thisVersion);
  return url.toString();
}

export function validateEntry(entry, specifications, path = "entry") {
  const errors = [];
  const fail = (message) => errors.push(`${path}: ${message}`);
  rejectUnexpectedKeys(
    entry,
    ["$schema", "schemaVersion", "id", "specification", "classification", "source", "review", "summary"],
    "entry",
    fail,
  );
  if (entry?.$schema !== "../entry.schema.json" || entry?.schemaVersion !== 1) {
    fail("unsupported schema declaration");
  }
  if (!ENTRY_ID.test(entry?.id ?? "")) {
    fail("invalid id");
  }
  if (!Object.hasOwn(specifications, entry?.specification ?? "")) {
    fail("unknown specification");
  }
  if (path !== "entry" && basename(path) !== `${entry?.id}.json`) {
    fail("filename must match the record id");
  }

  const classification = entry?.classification ?? {};
  rejectUnexpectedKeys(classification, ["class", "selectedBy", "public"], "classification", fail);
  const validClass = [1, 2, 3, 4, "unclassified"].includes(classification.class);
  if (!validClass) {
    fail("invalid correction class");
  }
  if (!["author", "maintainer", "unavailable"].includes(classification.selectedBy)) {
    fail("invalid classification authority");
  }
  if (
    (classification.class === "unclassified" && classification.selectedBy !== "unavailable") ||
    (classification.class !== "unclassified" && classification.selectedBy === "unavailable")
  ) {
    fail("classification authority is inconsistent with the correction class");
  }
  const expectedPublic =
    classification.class === 3 ||
    classification.class === 4 ||
    (classification.class === 2 && classification.public === true);
  if (typeof classification.public !== "boolean" || classification.public !== expectedPublic) {
    fail("public visibility is inconsistent with the correction class");
  }

  const source = entry?.source ?? {};
  rejectUnexpectedKeys(
    source,
    [
      "kind",
      "pullRequest",
      "title",
      "url",
      "author",
      "mergedAt",
      "baseCommit",
      "headCommit",
      "mergeCommit",
      "changedFiles",
    ],
    "source",
    fail,
  );
  if (!["pull_request", "direct_push"].includes(source.kind)) {
    fail("invalid source kind");
  }
  if (source.kind === "pull_request" && (!Number.isInteger(source.pullRequest) || source.pullRequest < 1)) {
    fail("pull-request source requires a pull-request number");
  }
  if (source.kind === "direct_push" && source.pullRequest !== undefined) {
    fail("direct-push source may not contain a pull-request number");
  }
  if (
    typeof source.title !== "string" ||
    !source.title.trim() ||
    source.title.length > limits.sourceTitle
  ) {
    fail("invalid source title");
  }
  if (!isLwsSourceUrl(source.url, source.kind, source.pullRequest)) {
    fail("invalid source URL");
  }
  if (
    typeof source.author !== "string" ||
    !source.author.trim() ||
    source.author.length > limits.sourceAuthor
  ) {
    fail("invalid source author");
  }
  if (!validDateTime(source.mergedAt)) {
    fail("invalid merge timestamp");
  }
  for (const name of ["baseCommit", "headCommit", "mergeCommit"]) {
    if (!SHA.test(source[name] ?? "")) {
      fail(`invalid ${name}`);
    }
  }
  if (
    !isSortedUnique(source.changedFiles) ||
    source.changedFiles.length === 0 ||
    source.changedFiles.some((name) => typeof name !== "string")
  ) {
    fail("changedFiles must be a non-empty, sorted, unique array");
  } else if (source.changedFiles.some((name) => !name.startsWith(`${entry.specification}/`))) {
    fail("changedFiles contains a path outside the entry's specification");
  }
  if (source.kind === "pull_request") {
    if (entry.id !== `pr-${source.pullRequest}--${entry.specification}`) {
      fail("entry id does not match its pull-request source");
    }
  } else if (
    typeof source.mergeCommit === "string" &&
    entry.id !== `commit-${source.mergeCommit.slice(0, 12)}--${entry.specification}`
  ) {
    fail("entry id does not match its direct-push source");
  }

  const review = entry?.review ?? {};
  rejectUnexpectedKeys(review, ["tests", "workingGroupRecord"], "review", fail);
  const tests = review.tests ?? {};
  rejectUnexpectedKeys(tests, ["status", "rationale"], "tests", fail);
  if (!["added", "updated", "not_needed", "tracked_separately", "unavailable"].includes(tests.status)) {
    fail("invalid test status");
  }
  if (typeof tests.rationale !== "string" || tests.rationale.length > limits.testRationale) {
    fail("invalid test rationale");
  }
  if (
    ["not_needed", "tracked_separately"].includes(tests.status) &&
    (typeof tests.rationale !== "string" || !tests.rationale.trim())
  ) {
    fail("the selected test status requires a rationale");
  }
  const wgRecord = review.workingGroupRecord;
  if (
    wgRecord !== null &&
    (typeof wgRecord !== "string" ||
      wgRecord.length > limits.workingGroupRecord ||
      !isWorkingGroupRecordUrl(wgRecord))
  ) {
    fail("invalid Working Group record URL");
  }
  if ([3, 4].includes(classification.class) && !isWorkingGroupRecordUrl(wgRecord)) {
    fail("Class 3 and Class 4 records require Working Group evidence");
  }

  const summary = entry?.summary ?? {};
  rejectUnexpectedKeys(
    summary,
    ["status", "text", "implementationConsiderations", "evidenceGaps", "generator"],
    "summary",
    fail,
  );
  if (!["pending", "generated", "edited"].includes(summary.status)) {
    fail("invalid summary status");
  }
  if (typeof summary.text !== "string" || summary.text.length > limits.changeSummary) {
    fail("invalid summary text");
  }
  for (const name of ["implementationConsiderations", "evidenceGaps"]) {
    if (
      !Array.isArray(summary[name]) ||
      summary[name].length > limits.summaryItems ||
      summary[name].some((item) => typeof item !== "string" || item.length > limits.summaryItem)
    ) {
      fail(`invalid ${name}`);
    }
  }
  if (summary.generator !== undefined) {
    rejectUnexpectedKeys(
      summary.generator,
      ["provider", "model", "responseId", "generatedAt"],
      "summary generator",
      fail,
    );
    if (
      summary.generator?.provider !== "openai" ||
      typeof summary.generator?.model !== "string" ||
      !summary.generator.model ||
      typeof summary.generator?.responseId !== "string" ||
      !summary.generator.responseId ||
      !validDateTime(summary.generator?.generatedAt)
    ) {
      fail("invalid summary generator provenance");
    }
  }
  if (summary.status === "generated") {
    if (summary.generator === undefined) {
      fail("generated summaries require generator provenance");
    }
    if (typeof summary.text !== "string" || !summary.text.trim()) {
      fail("generated summaries may not be empty");
    }
  }
  return errors;
}

export function validatePublication(publication, specifications, path = "publication") {
  const errors = [];
  const fail = (message) => errors.push(`${path}: ${message}`);
  rejectUnexpectedKeys(
    publication,
    [
      "$schema",
      "schemaVersion",
      "id",
      "specification",
      "publishedAt",
      "thisVersion",
      "previousVersion",
      "diff",
      "sourceCommits",
      "entries",
      "echidnaRuns",
    ],
    "publication",
    fail,
  );
  if (publication?.$schema !== "../publication.schema.json" || publication?.schemaVersion !== 1) {
    fail("unsupported schema declaration");
  }
  if (!PUBLICATION_ID.test(publication?.id ?? "")) {
    fail("invalid id");
  }
  const spec = specifications[publication?.specification];
  if (!spec) {
    fail("unknown specification");
  }
  if (path !== "publication" && basename(path) !== `${publication?.id}.json`) {
    fail("filename must match the record id");
  }
  if (spec) {
    if (!isDatedW3cVersion(publication.thisVersion, spec.shortName)) {
      fail("invalid current W3C dated-version URL");
    }
    if (!isDatedW3cVersion(publication.previousVersion, spec.shortName)) {
      fail("invalid previous W3C dated-version URL");
    }
  }
  try {
    if (publication.publishedAt !== publicationDateFromUrl(publication.thisVersion)) {
      fail("publishedAt does not match thisVersion");
    }
    if (publication.diff !== htmlDiffUrl(publication.previousVersion, publication.thisVersion)) {
      fail("HTMLDiff URL is not canonical");
    }
    if (publicationDateFromUrl(publication.previousVersion) >= publication.publishedAt) {
      fail("previousVersion must predate thisVersion");
    }
  } catch (error) {
    fail(error.message);
  }
  if (
    typeof publication?.specification === "string" &&
    typeof publication?.publishedAt === "string" &&
    publication.id !== `${publication.specification}--${publication.publishedAt}`
  ) {
    fail("publication id does not match its specification and date");
  }
  if (
    !isSortedUnique(publication.sourceCommits) ||
    publication.sourceCommits.length === 0 ||
    publication.sourceCommits.some((commit) => !SHA.test(commit))
  ) {
    fail("sourceCommits must contain sorted, unique, full commit hashes");
  }
  if (
    !isSortedUnique(publication.entries) ||
    publication.entries.some((entry) => typeof entry !== "string" || !ENTRY_ID.test(entry))
  ) {
    fail("entries must be a sorted, unique array");
  }
  const validRuns = [];
  if (!Array.isArray(publication.echidnaRuns) || publication.echidnaRuns.length === 0) {
    fail("echidnaRuns must be a non-empty array");
  } else {
    const runKeys = new Set();
    for (const run of publication.echidnaRuns) {
      if (!run || typeof run !== "object" || Array.isArray(run)) {
        fail("each Echidna run must be an object");
        continue;
      }
      validRuns.push(run);
      rejectUnexpectedKeys(
        run,
        ["id", "attempt", "url", "workflowId", "workflowFile", "headCommit", "completedAt"],
        "Echidna run",
        fail,
      );
      const runKey = `${run.id}:${run.attempt}`;
      if (
        !Number.isSafeInteger(run.id) ||
        run.id < 1 ||
        !Number.isSafeInteger(run.attempt) ||
        run.attempt < 1 ||
        runKeys.has(runKey)
      ) {
        fail("Echidna run id/attempt pairs must be unique positive integers");
      }
      runKeys.add(runKey);
      if (
        !isLwsActionsRunUrl(run.url, run.id, run.attempt) ||
        !Number.isSafeInteger(run.workflowId) ||
        run.workflowId < 1 ||
        run.workflowFile !== spec?.publicationWorkflowFile ||
        !SHA.test(run.headCommit ?? "") ||
        !validDateTime(run.completedAt)
      ) {
        fail("invalid Echidna run provenance");
      }
    }
    if (
      validRuns.some(
        (run, index, runs) =>
          index > 0 &&
          (runs[index - 1].id > run.id ||
            (runs[index - 1].id === run.id && runs[index - 1].attempt >= run.attempt)),
      )
    ) {
      fail("Echidna runs must be sorted by id and attempt");
    }
    if (validRuns.some((run) => !publication.sourceCommits?.includes(run.headCommit))) {
      fail("every Echidna run head must appear in sourceCommits");
    }
  }
  return errors;
}

export function validateState(state, path = "changes/state.json") {
  const errors = [];
  const fail = (message) => errors.push(`${path}: ${message}`);
  rejectUnexpectedKeys(
    state,
    ["$schema", "schemaVersion", "adoptionCommit", "publicationNotBefore"],
    "state",
    fail,
  );
  if (state?.$schema !== "./state.schema.json" || state?.schemaVersion !== 1) {
    fail("unsupported schema declaration");
  }
  if (!SHA.test(state?.adoptionCommit ?? "")) {
    fail("invalid adoptionCommit");
  }
  if (state?.adoptionCommit !== CHANGELOG_ADOPTION_COMMIT) {
    fail("adoptionCommit does not match the policy's trusted baseline");
  }
  if (!validDateTime(state?.publicationNotBefore)) {
    fail("invalid publicationNotBefore timestamp");
  }
  if (state?.publicationNotBefore !== CHANGELOG_PUBLICATION_NOT_BEFORE) {
    fail("publicationNotBefore does not match the policy's trusted baseline");
  }
  return errors;
}

export function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  if (lstatSync(dirname(path)).isSymbolicLink() || !lstatSync(dirname(path)).isDirectory()) {
    throw new Error(`Refusing to write through non-directory path ${dirname(path)}`);
  }
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
  renameSync(temporary, path);
}

export function writeTextAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  if (lstatSync(dirname(path)).isSymbolicLink() || !lstatSync(dirname(path)).isDirectory()) {
    throw new Error(`Refusing to write through non-directory path ${dirname(path)}`);
  }
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value, { encoding: "utf8", mode: 0o644 });
  renameSync(temporary, path);
}

export function mergePublication(existing, incoming) {
  if (!existing) {
    return incoming;
  }
  for (const name of ["id", "specification", "publishedAt", "thisVersion", "previousVersion", "diff"]) {
    if (existing[name] !== incoming[name]) {
      throw new Error(`Publication ${incoming.id} conflicts on ${name}.`);
    }
  }
  const runKey = (run) => `${run.id}:${run.attempt}`;
  const incomingRuns = new Map(incoming.echidnaRuns.map((run) => [runKey(run), run]));
  for (const run of existing.echidnaRuns) {
    const candidate = incomingRuns.get(runKey(run));
    if (candidate && !isDeepStrictEqual(run, candidate)) {
      throw new Error(
        `Publication ${incoming.id} conflicts on Echidna run ${run.id}, attempt ${run.attempt}.`,
      );
    }
  }
  return {
    ...existing,
    sourceCommits: [...new Set([...existing.sourceCommits, ...incoming.sourceCommits])].sort(),
    entries: [...new Set([...existing.entries, ...incoming.entries])].sort(),
    echidnaRuns: [...existing.echidnaRuns, ...incoming.echidnaRuns]
      .filter((run, index, runs) => runs.findIndex((candidate) => runKey(candidate) === runKey(run)) === index)
      .sort((left, right) => left.id - right.id || left.attempt - right.attempt),
  };
}

export function gitIsAncestor(root, candidate, descendant) {
  if (!SHA.test(candidate) || !SHA.test(descendant)) {
    throw new Error("Git ancestry checks require full commit hashes.");
  }
  if (candidate === descendant) {
    return true;
  }
  const result = spawnSync("git", ["merge-base", "--is-ancestor", candidate, descendant], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status === 0) {
    return true;
  }
  if (result.status === 1) {
    return false;
  }
  throw new Error(`Git ancestry check failed: ${String(result.stderr).trim().slice(0, 300)}`);
}

export function synchronizePublicationEntries(
  entries,
  publications,
  ancestorCheck = (candidate, descendant) => candidate === descendant,
) {
  for (const publication of publications) {
    publication.entries = [];
    publication.sourceCommits = [
      ...new Set(publication.echidnaRuns.map((run) => run.headCommit)),
    ].sort();
  }
  const assigned = new Set();
  const ordered = [...publications].sort(
    (left, right) => left.publishedAt.localeCompare(right.publishedAt) || left.id.localeCompare(right.id),
  );
  const unassigned = entries
    .filter((entry) => !assigned.has(entry.id))
    .sort(
      (left, right) => left.source.mergedAt.localeCompare(right.source.mergedAt) || left.id.localeCompare(right.id),
    );

  for (const entry of unassigned) {
    const publication = ordered.find(
      (candidate) =>
        candidate.specification === entry.specification &&
        candidate.echidnaRuns.some(
          (run) =>
            entry.source.mergeCommit === run.headCommit ||
            ancestorCheck(entry.source.mergeCommit, run.headCommit),
        ),
    );
    if (publication) {
      publication.entries = [...new Set([...publication.entries, entry.id])].sort();
      publication.sourceCommits = [
        ...new Set([...publication.sourceCommits, entry.source.mergeCommit]),
      ].sort();
      assigned.add(entry.id);
    }
  }
  return publications;
}

export function extractDatedVersions(html, shortName) {
  const escaped = escapeRegExp(shortName);
  const matches = [
    ...html.matchAll(new RegExp(`https://www\\.w3\\.org/TR/[0-9]{4}/[^\"'<>\\s]*${escaped}-[0-9]{8}/`, "g")),
  ].map((match) => match[0]);
  return [...new Set(matches)].sort((left, right) =>
    publicationDateFromUrl(right).localeCompare(publicationDateFromUrl(left)),
  );
}

function escapeMarkdown(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([`*_{}\[\]()#+!|~])/g, "\\$1")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function publicationByEntry(publications) {
  const result = new Map();
  for (const publication of publications) {
    for (const entry of publication.entries) {
      result.set(entry, publication);
    }
  }
  return result;
}

export function renderChangelog(entries, publications, specifications) {
  const visible = entries
    .filter((entry) => entry.classification.public)
    .sort((left, right) =>
      right.source.mergedAt.localeCompare(left.source.mergedAt) || left.id.localeCompare(right.id),
    );
  const lines = [
    "# LWS implementer changelog",
    "",
    "This is a generated view of reviewed change records. Class 3 and Class 4 changes",
    "are included; Class 2 changes appear only when specifically marked as useful to",
    "implementers. Class 1 changes remain available in the",
    "[evidence ledger](https://github.com/w3c/lws-protocol/blob/main/changes/README.md).",
    "",
  ];
  if (visible.length === 0) {
    lines.push("_No implementer-facing changes have been recorded since this policy was adopted._", "");
    return lines.join("\n");
  }

  const publicationMap = publicationByEntry(publications);
  for (const [specification, spec] of Object.entries(specifications)) {
    const specEntries = visible.filter((entry) => entry.specification === specification);
    if (specEntries.length === 0) {
      continue;
    }
    lines.push(`## ${escapeMarkdown(spec.title)}`, "");
    for (const entry of specEntries) {
      const date = entry.source.mergedAt.slice(0, 10);
      const recordLink = `https://github.com/w3c/lws-protocol/blob/main/changes/entries/${entry.id}.json`;
      const compare = `https://github.com/w3c/lws-protocol/compare/${entry.source.baseCommit}...${entry.source.headCommit}`;
      lines.push(`### ${date} — [${escapeMarkdown(entry.source.title)}](${entry.source.url})`, "");
      lines.push(
        `Correction Class ${entry.classification.class} · [source comparison](${compare}) · [record](${recordLink})`,
        "",
      );
      if (entry.summary.status === "pending") {
        lines.push("_Summary pending maintainer review._", "");
      } else {
        lines.push(escapeMarkdown(entry.summary.text), "");
      }
      if (entry.summary.implementationConsiderations.length > 0) {
        lines.push("Implementation considerations:", "");
        for (const note of entry.summary.implementationConsiderations) {
          lines.push(`- ${escapeMarkdown(note)}`);
        }
        lines.push("");
      }
      if (entry.summary.evidenceGaps.length > 0) {
        lines.push("Evidence to check:", "");
        for (const gap of entry.summary.evidenceGaps) {
          lines.push(`- ${escapeMarkdown(gap)}`);
        }
        lines.push("");
      }
      const publication = publicationMap.get(entry.id);
      if (publication) {
        lines.push(
          `Published as [${publication.publishedAt}](${publication.thisVersion}) · [changes from the previous publication](${publication.diff})`,
          "",
        );
      }
    }
  }
  return lines.join("\n");
}
