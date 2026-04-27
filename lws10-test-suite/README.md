# LWS Protocol 1.0 Test Suite

Test suite for the [Linked Web Storage Protocol 1.0](https://www.w3.org/TR/lws10-core/)
and its authentication suite specifications:

- [LWS 1.0 Authentication Suite: Self-signed Identity using did:key](https://www.w3.org/TR/lws10-authn-ssi-did-key/)
- [LWS 1.0 Authentication Suite: OpenID Connect](https://www.w3.org/TR/lws10-authn-openid/)
- [LWS 1.0 Authentication Suite: SAML 2.0](https://www.w3.org/TR/lws10-authn-saml/)

## Directory Structure

```
tests/
├── context.jsonld                  # Shared JSON-LD context for all manifests
├── manifest.jsonld                 # Root manifest (core protocol tests)
├── auth/
│   ├── did-key/manifest.jsonld    # did:key authentication suite tests
│   ├── oidc/manifest.jsonld       # OpenID Connect authentication suite tests
│   └── saml/manifest.jsonld       # SAML 2.0 authentication suite tests
├── containers/
│   └── alice-notes.json           # Example container representation body
├── linksets/
│   ├── alice-notes.meta.json      # Linkset for /alice/notes/
│   └── shoppinglist.meta.json     # Linkset for /alice/notes/shoppinglist.txt
└── resources/
    ├── storage-description.json        # Storage description resource body
    ├── authorization-server-metadata.json  # AS metadata body
    ├── shoppinglist.txt                # Data resource body
    ├── token-response-200.json         # Successful token exchange response
    └── token-response-400.json         # Failed token exchange response
```

## Conventions

### Inline vs. by-reference properties

Properties that carry their value directly use a plain JSON name:

```json
"body": "some content"
```

Properties that reference an external resource by URL append `URL` to the name:

```json
"bodyURL": "../containers/alice-notes.json"
```

The same convention applies to `href` / `hrefTemplate` for Link header values, and
`url` / `urlTemplate` for request targets.

### Test types

| Type | Meaning |
|------|---------|
| `lwst:ValidationTest` | The server MUST respond as described for conformance |
| `lwst:NegativeTest`   | The server MUST reject the request as described |

### Traits (applied to tests for filtering)

`Get`, `Post`, `Put`, `Delete`, `Patch` — HTTP method used  
`Public` — no authentication required  
`Private` — resource requires authentication/authorization  
`Authn` — exercises authentication behaviour  
`Authz` — exercises authorization behaviour  
`Container` — targets a Container resource  
`DataResource` — targets a DataResource  
`Discovery` — exercises service/storage description discovery  

### Authorization roles (ODRL-based)

| Compact name | Meaning |
|-------------|---------|
| `Role-Public` | Any agent, authenticated or not |
| `Role-Authenticated` | Any agent that presents a valid access token |
| `Role-Owner` | The resource manager (owner) of the storage |

### Prerequisite hierarchy

Each test's `prereqs.hierarchy` array describes the resources (and their access policies)
that a test harness MUST establish before issuing the test request.  An empty array means
no prior state is required.

### Authentication

`prereqs.authentication` and `request.authentication` hold the WebID/subject URI of the
agent to authenticate as, or `null` for anonymous requests.

## Test certificate authority

Tests that require authentication may use a test CA whose certificate is distributed
alongside this test suite.  Implementations SHOULD accept this CA only in test/non-production
environments.

## Status values

All tests start with `mf:Proposed`.  They advance to `mf:Approved` once an independent
implementation demonstrates conformance.
