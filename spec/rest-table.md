**Summary of HTTP status mappings:**  
The table below summarizes how the generic LWS [responses](https://w3c.github.io/lws-protocol/spec/#dfn-responses) ( from Section 7 ) map to HTTP status codes and typical payloads in this REST binding. This is for reference and to ensure consistency:

| LWS response | HTTP status code | HTTP payload |
| ----- | ----- | ----- |
| [Success](https://w3c.github.io/lws-protocol/spec/#dfn-success) Success (read or update, returning data) | 200 OK | [Resource representation](https://w3c.github.io/lws-protocol/spec/#dfn-resource-representation) in the response body (for GET or if PUT/PATCH returns content), along with relevant headers (Content-Type, ETag, etc.). |
| [Created](https://w3c.github.io/lws-protocol/spec/#dfn-created) (new resource) | 201 Created | Typically no response body (or a minimal representation of the new resource). The `Location` header is set to the new resource’s URI. Headers like ETag may be included. |
| Deleted (no content to return) | 204 No Content | No response body. Indicates the resource was deleted or the request succeeded and there’s nothing else to say. |
| Bad Request (invalid input or constraints) | 400 Bad Request | Error details explaining what was wrong (e.g., “Invalid JSON” or “Name contains illegal characters”). Could be in plain text or a structured format (JSON error object), depending on server. |
| [Unknown requester](https://w3c.github.io/lws-protocol/spec/#dfn-unknown-requester) | 401 Unauthorized | Typically no body or an error message. The response should include a `WWW-Authenticate` header if authentication can be negotiated (per HTTP spec). This indicates the client needs to provide credentials. |
| [Not Permitted](https://w3c.github.io/lws-protocol/spec/#dfn-not-permitted) (forbidden) | 403 Forbidden | An error message or none. Indicates the client’s credentials were accepted but they don’t have rights to perform the operation. |
| Not found | 404 Not Found | Possibly an error message. Indicates the resource (or target URI) does not exist *or* is not accessible. (Servers may use 404 in place of 403 to avoid revealing the existence of a secret resource.) |
| Not acceptable | 406 Not Acceptable | Typically a short message listing supported formats or indicating that the requested representation cannot be provided. The client may use this information to retry with a different `Accept`. |
| Conflict (e.g. non-empty container) | 409 Conflict | Explanation of the conflict. E.g., “Resource already exists,” “Container not empty,” or concurrency conflict details. The body could include specifics or be empty with just the status reason. |
| Precondition Failed (concurrency) | 412 Precondition Failed  | If an `If-Match` or similar header doesn’t match, this status is returned with maybe a brief message. |
| Unsupported Media Type | 415 Unsupported Media Type | If the client sent a format that the server cannot handle (for create or update). The body might list acceptable media types. |
| Internal Server Error [Unknown error](https://w3c.github.io/lws-protocol/spec/#dfn-unknown-error) | 500 Internal Server Error | A generic error message. In a debug or dev mode, the server might include a stack trace or internal details in the body, but in production it should be a generic statement. |

This mapping table is intended to cover the typical cases. Note that some status codes above (412, 415\) are standard HTTP but were not explicitly enumerated in Section 7’s generic list; they are used here to handle HTTP-specific scenarios (like conditional requests and media type handling). LWS servers should use the most appropriate HTTP status code for each situation to enable clients to react correctly.

By adhering to these method bindings and status codes, LWS clients and servers can interoperate using HTTP in a predictable, RESTful way. This allows leveraging existing HTTP libraries, tools, and knowledge for building LWS-based systems.