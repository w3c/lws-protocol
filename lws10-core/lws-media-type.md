### LWS Media Type

LWS <a>manifest representation</a> and <a>storage description resource</a> MUST use the media type `application/lws+json`.

While LWS manifest representations use JSON-LD conventions, the constraints and requirements for LWS justify the use of a specific media type. Because LWS manifests can be considered a restricted profile of JSON-LD, implementations SHOULD consider the `application/ld+json; profile="https://www.w3.org/ns/lws/v1"` media type as equivalent to `application/lws+json`.

#### Content Negotiation

Servers MUST support content negotiation for container manifest representations. The response payload MUST be identical regardless of the requested media type — only the `Content-Type` response header varies:

- If a client requests `application/lws+json`, the server MUST respond with `Content-Type: application/lws+json`.
- If a client requests `application/ld+json`, the server MUST respond with `Content-Type: application/ld+json`.
- If a client requests `application/json`, the server MUST respond with `Content-Type: application/json`.

In all three cases, the response body is the same JSON-LD document conforming to the LWS manifest vocabulary. Servers are free to support additional media types (e.g., `text/turtle`) through content negotiation.
