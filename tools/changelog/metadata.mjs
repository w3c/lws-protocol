import { isWorkingGroupRecordUrl, limits } from "./constraints.mjs";

const CLASS_START = "<!-- changelog-class-start -->";
const CLASS_END = "<!-- changelog-class-end -->";
const TESTS_START = "<!-- changelog-tests-start -->";
const TESTS_END = "<!-- changelog-tests-end -->";

const testStatuses = new Map([
  ["Tests added", "added"],
  ["Tests updated", "updated"],
  ["Tests not needed", "not_needed"],
  ["Tests tracked separately", "tracked_separately"],
]);

function between(value, start, end) {
  const startIndex = value.indexOf(start);
  const endIndex = value.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) {
    return null;
  }
  return value.slice(startIndex + start.length, endIndex);
}

function checkedLabels(section) {
  if (section === null) {
    return [];
  }
  return [...section.matchAll(/^\s*-\s*\[[xX]\]\s*\*\*(.+?)\*\*/gm)].map(
    (match) => match[1].trim(),
  );
}

function fieldAfterMarker(body, marker) {
  const markerIndex = body.indexOf(marker);
  if (markerIndex < 0) {
    return "";
  }
  const tail = body.slice(markerIndex + marker.length);
  const section = tail.split(/^##\s+/m, 1)[0];
  return section.replace(/<!--[\s\S]*?-->/g, "").trim();
}

function firstUrl(value) {
  const match = value.match(/https:\/\/[^\s<>]+/);
  return match ? match[0].replace(/[),.;]+$/, "") : null;
}

export function parsePullRequestMetadata(body = "") {
  const errors = [];
  const classLabels = checkedLabels(between(body, CLASS_START, CLASS_END));
  const selectedClasses = classLabels
    .map((label) => /^Class\s+([1-4])\b/.exec(label))
    .filter(Boolean)
    .map((match) => Number(match[1]));

  if (selectedClasses.length !== 1) {
    errors.push("Select exactly one correction class (Class 1, 2, 3, or 4).");
  }

  const checkedTests = checkedLabels(between(body, TESTS_START, TESTS_END));
  const selectedTests = checkedTests
    .map((label) => testStatuses.get(label))
    .filter(Boolean);

  if (selectedTests.length !== 1) {
    errors.push("Select exactly one test-impact option.");
  }

  const correctionClass = selectedClasses.length === 1 ? selectedClasses[0] : null;
  const testStatus = selectedTests.length === 1 ? selectedTests[0] : null;
  const includeClass2 = /^\s*-\s*\[[xX]\]\s*\*\*Include Class 2 in the public changelog\*\*/m.test(
    body,
  );
  const summary = fieldAfterMarker(body, "<!-- changelog-summary -->");
  const testRationale = fieldAfterMarker(body, "<!-- changelog-test-rationale -->");
  const workingGroupText = fieldAfterMarker(body, "<!-- changelog-wg-record -->");
  const workingGroupRecord = firstUrl(workingGroupText);

  if (!summary) {
    errors.push("Add an implementer-facing change summary after the changelog summary marker.");
  }
  if (summary.length > limits.changeSummary) {
    errors.push("Keep the change summary at or below 1,200 characters.");
  }
  if (testRationale.length > limits.testRationale) {
    errors.push("Keep the test rationale at or below 1,000 characters.");
  }
  if (["not_needed", "tracked_separately"].includes(testStatus) && !testRationale) {
    errors.push("Add a test rationale or tracking URL after the test-rationale marker.");
  }
  if (
    workingGroupRecord &&
    (workingGroupRecord.length > limits.workingGroupRecord ||
      !isWorkingGroupRecordUrl(workingGroupRecord))
  ) {
    errors.push("Use a W3C or w3c/lws-protocol URL for the Working Group record.");
  }
  if ([3, 4].includes(correctionClass) && !workingGroupRecord) {
    errors.push("Class 3 and Class 4 changes require a W3C or w3c/lws-protocol Working Group record.");
  }
  if (includeClass2 && correctionClass !== 2) {
    errors.push("The Class 2 public-changelog option may only be selected for a Class 2 change.");
  }

  return {
    correctionClass,
    includeClass2,
    public: correctionClass === 3 || correctionClass === 4 || (correctionClass === 2 && includeClass2),
    summary,
    tests: {
      status: testStatus,
      rationale: testRationale,
    },
    workingGroupRecord,
    errors,
  };
}

export function isSpecificationPath(filename, specifications) {
  const directory = filename.split("/", 1)[0];
  return Object.hasOwn(specifications, directory);
}

export function pathsForFile(file) {
  if (typeof file === "string") {
    return [file];
  }
  return [file.filename, file.previous_filename].filter(Boolean);
}

export function specificationsForFiles(files, specifications) {
  return [
    ...new Set(
      files
        .flatMap(pathsForFile)
        .filter((filename) => isSpecificationPath(filename, specifications))
        .map((filename) => filename.split("/", 1)[0]),
    ),
  ].sort();
}
