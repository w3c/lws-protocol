Permanently removes a resource and its associated metadata.

* **Inputs**: Target identifier, an optional recursive flag (for containers), and optional concurrency constraints.
* **Behavior**:
    * For non-container resources, the server removes the content, metadata, and updates the parent container's membership.
    * For containers, the server typically requires the container to be empty unless a recursive delete is explicitly requested and supported.
* **Outcome**: Confirmation of removal or a notification of failure.

The delete resource operation is implemented using the HTTP DELETE method, as defined in the abstract operation above. This section specifies the HTTP bindings for inputs, behaviors, and responses.

The DELETE request targets the URI of the resource or container to remove. Clients MAY include an If-Match header with an ETag for concurrency checks, as described in the abstract operation.

For non-container resources, the server processes the deletion as specified in the abstract behavior.

For container resources, the server defaults to non-recursive deletion. If recursion is desired and supported, clients MUST use the Depth: infinity header, as defined in [[RFC4918]]. Servers that do not support recursion MUST reject such requests with 501 Not Implemented.

On success, the server MUST respond with 204 No Content. Servers SHOULD support concurrency checks via If-Match with ETags; mismatches MUST yield 412 Precondition Failed.

If the client lacks authorization, the server MUST return 403 Forbidden (if the client's identity is known but permissions are insufficient) or 401 Unauthorized (if no valid authentication is provided). In cases where revealing resource existence poses a security risk, the server MAY return 404 Not Found instead.

**Example (DELETE a non-container resource):**
```
DELETE /alice/notes/shoppinglist.txt HTTP/1.1
Authorization: Bearer <token>
If-Match: "abc123456"
```
Assuming the ETag matches and the client is authorized, the server deletes the resource, its metadata, and updates the containing container `/alice/notes/` atomically:
```
HTTP/1.1 204 No Content
```

**Example (DELETE a non-empty container without recursion):**
```
DELETE /alice/notes/ HTTP/1.1
Authorization: Bearer <token>
```
Assuming `/alice/notes/` contains resources, the server refuses the deletion:
```
HTTP/1.1 409 Conflict
Content-Type: text/plain

Cannot delete container /alice/notes/ - container is not empty.
```

**Example (DELETE a container with recursion, if supported):**
```
DELETE /alice/notes/ HTTP/1.1
Authorization: Bearer <token>
Depth: infinity
```
Assuming the server supports recursion and the client has permissions for all contents, the server deletes the container and its descendants atomically:
```
HTTP/1.1 204 No Content
```
