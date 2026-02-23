### Container Media Type

The default media type for LWS container representations is:

```
application/lws+json
```

While LWS container representations use JSON-LD conventions, the constraints and requirements for LWS justify the use of a specific media type. Because LWS containers can be considered a restricted profile of JSON-LD, implementations SHOULD consider the `application/ld+json; profile="https://www.w3.org/ns/lws/v1"` media type as equivalent to `application/lws+json`.

#### Content Negotiation

Servers MUST support content negotiation for container representations. The response payload MUST be identical regardless of the requested media type — only the `Content-Type` response header varies:

- If a client requests `application/lws+json`, the server MUST respond with `Content-Type: application/lws+json`.
- If a client requests `application/ld+json`, the server MUST respond with `Content-Type: application/ld+json`.
- If a client requests `application/json`, the server MUST respond with `Content-Type: application/json`.

In all three cases, the response body is the same JSON-LD document conforming to the LWS container vocabulary. Servers are free to support additional media types (e.g., `text/turtle`) through content negotiation.

#### Processing as JSON

Although container representations are valid JSON-LD, clients MAY process them as plain JSON without invoking a full JSON-LD processor. The `@context` property in the representation provides the mapping to the LWS vocabulary, but all property names used in container representations are short, predictable tokens (e.g., `id`, `type`, `items`, `totalItems`) that can be consumed directly as JSON keys.
