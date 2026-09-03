# LWS changelog policy

This directory is the evidence ledger behind the generated, implementer-focused
[`CHANGELOG.md`](../CHANGELOG.md). It records every specification change after it
lands on `main`, while keeping editorial judgment and publication approval with
the Working Group.

## What is recorded

Each changed specification receives one record under
`entries/`. A multi-specification pull request therefore produces more than one
record. Records contain the pull request or direct-push identity, commit hashes,
the human-selected W3C correction class, test information, the Working Group
record, and a summary. Source fields are rebuilt from GitHub and are read-only;
classification, review evidence, and summary fields are editor-curated.

The public changelog includes:

- every Class 3 and Class 4 change;
- a Class 2 change only when its author or an editor marks it as materially
  useful to implementers; and
- no Class 1 or unclassified change.

All records remain in the ledger even when they are not rendered publicly.
Reverts add records; they do not rewrite history. The correction class is always
selected by a person and is never inferred by the summarizer.

## Lifecycle and authority

1. The pull request template collects the correction class, test impact, a
   concise source summary, and any required Working Group discussion or
   resolution URL.
2. `Changelog metadata` checks those fields on pull requests that modify a
   registered specification.
3. After a change lands on `main`, `Maintain changelog` deterministically
   captures its GitHub evidence. If configured, OpenAI proposes a structured
   implementer summary from bounded textual patches.
4. The workflow opens or updates `automation/changelog` as a **draft** pull
   request. A model failure leaves an explicit pending summary instead of
   dropping the change. The workflow never commits to `main` and never merges
   its own pull request.
5. Editors check the class, source comparison, summary, implementation notes,
   tests, and Working Group evidence. Human edits use summary status `edited`.
   Normal repository review then controls the merge.
6. After a successful Echidna publication, the same workflow records the
   current and previous dated `/TR/` versions and emits a W3C HTMLDiff link.
   More than one merge may map to the same dated publication.

The workflow replays every first-parent commit after the fixed policy-adoption
baseline in `state.json`, rather than assuming that every GitHub event is
delivered or trusting the automation branch as evidence. Restored records are
checked against GitHub again, and unexpected records are rejected. It also
scans every successful attempt of each registered Echidna workflow file since
policy adoption. GitHub may replace an older pending concurrency run; the next
surviving run, or the hourly safety-net run, therefore recovers the omitted
work.

The automation branch is used as an editorial cache only while its draft pull
request is open. Once that pull request is merged or closed, `main` is
authoritative; a leftover branch cannot overwrite a later editorial correction
on `main`. While the draft is open, non-overlapping ledger edits from the draft
and `main` are combined. If both sides change the same record, reconciliation
stops for explicit editor resolution rather than choosing one silently.

The merge commit is authoritative for source provenance. The dated W3C
Technical Report is authoritative for a publication. JSON files are the curated
changelog data, and `CHANGELOG.md` is always a generated view.

The HTMLDiff URL deliberately retains `doc1` and `doc2` query parameters. It can
be used directly and is compatible with Pierre-Antoine's browser helper for
navigating the two compared documents. The helper itself is not executed in CI.

## Generated pull request review

Before marking an automation pull request ready, an editor should confirm:

- the correction class reflects the Working Group's decision;
- the source comparison and changed-file list are complete;
- the summary states only observable requirements or behaviour;
- implementation considerations are supported by the change;
- missing evidence is resolved or called out; and
- publication mappings and HTMLDiff endpoints are correct, when present.

The automation branch is fixed so closely spaced merges are batched into one
review. Every update returns the pull request to draft. A repository-wide
concurrency group prevents merge and publication updates from racing.

## Repository setup

The merge-time workflow works without AI and will produce pending summaries.
To enable proposed summaries without storing a long-lived API key:

1. Following the [OpenAI workload identity federation guide][openai-wif],
   configure a provider for GitHub Actions with exact assertions for issuer
   `https://token.actions.githubusercontent.com`, the chosen audience,
   repository `w3c/lws-protocol`, ref `refs/heads/main`, and workflow ref
   `w3c/lws-protocol/.github/workflows/changelog.yml@refs/heads/main`. Grant the
   mapped service account only the `api.model.request` permission.
2. Add repository variables `OPENAI_WIF_AUDIENCE`,
   `OPENAI_IDENTITY_PROVIDER_ID`, and `OPENAI_SERVICE_ACCOUNT_ID`.
3. Set `OPENAI_MODEL` to the approved model (the workflow defaults to
   `gpt-5.6-luna`) and set `CHANGELOG_AI_ENABLED` to `true`.

The API request uses [strict Structured Outputs][openai-structured], disables
response storage, does not expose tools, and treats pull request text and
patches as untrusted data.
Missing configuration, authentication errors, refusals, truncated responses,
and invalid output all fail open to a pending human summary.

GitHub Actions must also be allowed to create pull requests in the repository's
Actions settings. Protect `.github/workflows/changelog.yml`, `tools/changelog/`,
and `changes/` with required editor review (for example, through CODEOWNERS and
a ruleset). Add `Changelog metadata / validate` and `Changelog metadata /
records and generator` as required checks if the Working Group wants both
template enforcement and ledger integrity before merge.

The proposer creates commits locally, so a ruleset that requires signed commits
must exempt the `automation/changelog` branch or grant the GitHub Actions app a
narrow bypass for that branch. If generated pull-request workflows require
approval, an editor must approve their run before merging the draft.

Class 3 and Class 4 Working Group evidence must use a W3C URL or an issue, pull
request, or discussion URL in `w3c/lws-protocol`. Other origins are rejected so
an arbitrary HTTPS page cannot masquerade as a group record.

## Local maintenance

Run the generator with Node.js 22 or later:

```sh
npm ci --prefix tools/changelog
npm test --prefix tools/changelog
node tools/changelog/cli.mjs validate
node tools/changelog/cli.mjs render
```

`validate` rejects malformed records and stale generated Markdown. Editors may
amend generated summaries in the draft pull request, set their status to
`edited`, and set `classification.selectedBy` to `maintainer` when changing a
class or its Class 2 visibility. Rerun `render` and commit the result. Source
provenance is regenerated from GitHub; correct upstream evidence or the
generator if it is wrong.

[openai-structured]: https://developers.openai.com/api/docs/guides/structured-outputs
[openai-wif]: https://developers.openai.com/api/docs/guides/workload-identity-federation/github-actions
