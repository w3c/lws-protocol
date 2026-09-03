export const limits = Object.freeze({
  sourceTitle: 300,
  sourceAuthor: 100,
  changeSummary: 1200,
  testRationale: 1000,
  workingGroupRecord: 1000,
  summaryItem: 400,
  summaryItems: 5,
});

export const CHANGELOG_ADOPTION_COMMIT = "602ca1917b45450163400a43edaf961cec20873e";
export const CHANGELOG_PUBLICATION_NOT_BEFORE = "2026-09-03T00:00:00Z";

export function isWorkingGroupRecordUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) {
      return false;
    }
    if (url.hostname === "w3.org" || url.hostname.endsWith(".w3.org")) {
      return true;
    }
    return (
      url.hostname === "github.com" &&
      /^\/w3c\/lws-protocol\/(?:issues|pull|discussions)\/[1-9][0-9]*\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}
