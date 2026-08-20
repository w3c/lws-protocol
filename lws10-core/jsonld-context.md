The LWS JSON-LD context is identified by the URL `https://www.w3.org/ns/lws/v1`.
The SHA2-256 digest of the document resolved from that URL is included in the table below:

| Context URL and Hash |
|---|
| **URL:** `https://www.w3.org/ns/lws/v1` |
| **SHA2-256 Digest:** <span class="issue" data-number="216">TODO: include the JSON-LD context digest once the context document is finalized</span> |

The digest can be verified with a command such as:
`curl -sL -H "Accept: application/ld+json" https://www.w3.org/ns/lws/v1 | openssl dgst -sha256`

<div class="note">
Production systems are advised not to fetch remote JSON-LD context documents at runtime.
Bundling or caching contexts locally eliminates a runtime dependency on external
infrastructure, reduces latency, and prevents context manipulation attacks.
</div>
