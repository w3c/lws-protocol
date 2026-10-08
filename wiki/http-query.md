---
type: RFC
title: "Adopting HTTP QUERY method"
description: >-
  Tracking issue for adopting the HTTP QUERY method (RFC 10008) in Linked
  Web Storage
tags: [http-query, rfc-10008, search, notifications]
status: stable
sources:
  - id: issue-body
    resource: https://github.com/w3c/lws-protocol/issues/184
    title: "w3c/lws-protocol issue #184 body"
    author: human:elf-pavlik
    last_modified: 2026-06-29T15:03:01Z
  - id: rfc-10008
    resource: https://www.rfc-editor.org/info/rfc10008/
    title: "RFC 10008: The HTTP QUERY Method (Reschke, Snell, Bishop)"
    author: team:ietf-httpbis
    last_modified: 2026-06-16T00:00:00Z
  - id: searchindex
    resource: https://w3c.github.io/lws-protocol/lws10-searchindex/
    title: "LWS Search and Type Index Services (spec)"
  - id: rfc10008support
    resource: https://github.com/ebremer/RFC10008support
    title: "HTTP QUERY (RFC 10008) — ecosystem adoption tracker"
    author: human:ebremer
  - id: events-query
    resource: https://cxres.github.io/events-query/draft-gupta-httpapi-events-query.html
    title: "draft-gupta-httpapi-events-query"
  - id: recording
    resource: https://youtu.be/kleBCv02n9I?t=1308
    title: "IETF meeting recording (CxRes presentation)"
  - id: sparql12-protocol
    resource: https://www.w3.org/TR/sparql12-protocol/#query-operation
    title: "SPARQL 1.2 Protocol — query operation"
generated: { by: human:elf-pavlik, at: 2026-09-18T02:41:06Z }
---

# Usage

* The [LWS Search and Type Index spec](https://w3c.github.io/lws-protocol/lws10-searchindex/) already uses QUERY (RFC 10008) for its Type Search Service.[^searchindex]
* [SPARQL 1.2 Protocol](https://www.w3.org/TR/sparql12-protocol/#query-operation) also mentions it — QUERY may be used with SPARQL queries.[^sparql12]

# Adoption

* Adoption of RFC 10008 is tracked independently in [ebremer/RFC10008support](https://github.com/ebremer/RFC10008support).[^rfc10008support]

# Notifications

* [draft-gupta-httpapi-events-query](https://cxres.github.io/events-query/draft-gupta-httpapi-events-query.html) is the relevant proposal for QUERY in notifications; the author presented it at an IETF meeting — [recording](https://youtu.be/kleBCv02n9I?t=1308).[^events-query][^recording]

---

[^searchindex]: LWS Search and Type Index Services spec
[^rfc10008support]: HTTP QUERY (RFC 10008) — ecosystem adoption tracker
[^sparql12]: SPARQL 1.2 Protocol — query operation
[^events-query]: draft-gupta-httpapi-events-query
[^recording]: IETF meeting recording (CxRes presentation)
