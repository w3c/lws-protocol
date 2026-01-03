### Summary of HTTP Status Mappings

This table maps generic LWS [responses](https://w3c.github.io/lws-protocol/spec/#dfn-responses) (from Section 7) to HTTP status codes and payloads for consistency, incorporating specific scenarios such as pagination, concurrency controls, quota constraints, and metadata integration:

| LWS response | HTTP status code | HTTP payload |
| ----- | ----- | ----- |
| [Success](https://w3c.github.io/lws-protocol/lws10-core/#dfn-success) Success (read or update, returning data) | 200 OK | [Resource representation](https://w3c.github.io/lws-protocol/lws10-core/#dfn-resource-representation) in the response body (for GET or if PUT/PATCH returns content), along with relevant headers (Content-Type, ETag, Link for metadata such as rel="linkset", rel="acl", rel="parent"). For container listings, include JSON-LD with normative context and member metadata (IDs, types, sizes, timestamps). |
| [Created](https://w3c.github.io/lws-protocol/spec/#dfn-created) (new resource) | 201 Created | Typically no response body (or a minimal representation of the new resource). The `Location` header is set to the new resource’s URI. Headers like ETag MUST be included for concurrency; Link headers for server-managed metadata. |
| Deleted (no content to return) | 204 No Content | No response body. Indicates the resource was deleted or the request succeeded and there’s nothing else to say. Servers MAY use 410 Gone for permanent deletions. |
| Bad Request (invalid input or constraints) | 400 Bad Request | Error details explaining what was wrong. Could be in plain text or a structured format (JSON error object), depending on server. |

This mapping table is intended to cover the typical cases, ensuring atomicity with metadata operations and support for discoverability. Note that some status codes above (206, 412, 415, 507) are standard HTTP but were not explicitly enumerated in Section 7’s generic list; they are used here to handle HTTP-specific scenarios (like pagination, conditional requests, media type handling, and quotas). LWS servers should use the most appropriate HTTP status code for each situation to enable clients to react correctly.

By adhering to these method bindings and status codes, LWS clients and servers can interoperate using HTTP in a predictable, RESTful way. This allows leveraging existing HTTP libraries, tools, and knowledge for building LWS-based systems.