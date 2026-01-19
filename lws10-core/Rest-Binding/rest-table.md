### Summary of HTTP Status Mappings
This table maps generic LWS [responses](#dfn-responses) (from Section 8) to HTTP status codes and payloads for consistency, incorporating specific scenarios such as pagination, concurrency controls, quota constraints, and metadata integration:
| LWS response | HTTP status code | HTTP payload |
| ----- | ----- | ----- |
| [Success](#dfn-success) (read or update, returning data) | 200 OK | [Resource representation](#dfn-resource-representation) in the response body (for GET or if PUT/PATCH returns content), along with relevant headers (Content-Type, ETag, Link for metadata such as rel="linkset", rel="acl", rel="parent"). For container listings, include JSON-LD with normative context and member metadata (IDs, types, sizes, timestamps). |
| [Created](#dfn-created) (new resource) | 201 Created | Typically no response body (or a minimal representation of the new resource). The `Location` header is set to the new resource’s URI. Headers like ETag MUST be included for concurrency; Link headers for server-managed metadata. |
| Deleted (no content to return) | 204 No Content | No response body. Indicates the resource was deleted or the request succeeded and there’s nothing else to say. Servers MAY use 410 Gone for permanent deletions. |
| Bad Request (invalid input or constraints) | 400 Bad Request | Error details explaining what was wrong. Servers SHOULD use the standard format defined in [[RFC9457]] for structured error responses, such as a JSON object with fields like "type", "title", "status", "detail", and "instance". |
