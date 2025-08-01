### **9.3 Update Resource (HTTP PUT / PATCH)**

The [update resource](https://w3c.github.io/lws-protocol/spec/#dfn-update-resource) modifies the contents of an existing [served resource](https://w3c.github.io/lws-protocol/spec/#dfn-served-resource)  by a **PUT** request (to replace the entire resource) or a **PATCH** request (to apply a partial modification). The client must have write access to the resource’s URL to perform these operations.

**PUT (replace full resource)** – The client sends a PUT request to the resource’s URI with the new full content in the request body. The `Content-Type` should be the media type of the new content (which should generally match the type of the existing content, unless the client is also changing the type). A PUT on an existing resource is idempotent: if repeated with the same content, the outcome is the same. Typically, for safety, the client might include an `If-Match` header with the resource’s current ETag to ensure it only updates if the resource hasn’t changed (this is the concurrency control mentioned in Section 7.3). If the `ETag` doesn’t match (meaning the resource was modified by someone else), the server will respond with `412 Precondition Failed` or `409 Conflict`, and not overwrite the other change. If no concurrency check is provided, the server will attempt to perform the update unconditionally – but in doing so, a well-behaved client risks overwriting concurrent edits it didn’t know about.

**Example (PUT to update a resource):**

```
PUT /alice/personalinfo.json HTTP/1.1Authorization: Bearer <token>Content-Type: application/jsonIf-Match: "abc123456"{ "name": "Alice", "age": 30, "city": "New London", "state": "Connecticut" }
```

In this example, the client is updating an existing JSON resource at /alice/personalinfo.json. It includes an If-Match header with the ETag "abc123456" that it presumably got from an earlier GET or HEAD on this resource. The server will compare that to the current ETag; if they match, it proceeds to replace the content with the JSON provided. If they don’t match, the server rejects the update (because the resource was changed by someone else in the meantime).

Successful response: If the update succeeds, the server can respond with 200 OK and possibly include the updated representation or some confirmation (like the new content or a part of it). Alternatively, the server may respond with 204 No Content to indicate success with no body (especially common if no further info needs to be conveyed). In either case, the server will likely include a new ETag (e.g., "def789012") to signify the new version, and maybe a Content-Type if a body is returned. For example:

```
HTTP/1.1 204 No Content  
ETag: "def789012"
```

This tells the client the update went through and provides the new `ETag`. If the server chose to return the updated content, it might use `200 OK` and include the JSON in the body, along with headers.

* **Error responses:** If the `If-Match` did not match (concurrent modification), the server could return `412 Precondition Failed` (meaning the precondition header failed) or `409 Conflict` – our earlier abstract description used Conflict for concurrency issues, and 409 is a natural mapping for that scenario. If the resource did not exist, a PUT meant as an update will result in `404 Not Found` (unless the intent was to create, but typically clients use PUT for create only when they are sure of what they’re doing, or they use it as upsert without If-Match). If the client is not authorized, `403 Forbidden` (or 401 Unauthorized if no valid credentials were provided). If the request payload is not valid (e.g., the JSON is malformed), `400 Bad Request`.

**PATCH (partial update)** – The HTTP PATCH method \[[RFC 5789](https://www.rfc-editor.org/rfc/rfc5789.html)\] allows a client to specify partial modifications to a resource, rather than sending the whole new content. This is useful for large resources where sending the entire content would be inefficient if only a small part changed, or for concurrent editing where you want to apply specific changes. LWS server **MUST** minimally support a binary patch (like an offset and data replacement).