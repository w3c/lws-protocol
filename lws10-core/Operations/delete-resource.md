Permanently removes a resource and its associated metadata.

* **Inputs**: Target identifier, an optional recursive flag (for <a>containers</a>), and optional concurrency constraints.
* **Behavior**:
    * For non-container resources, the server removes the content, metadata, and updates the parent <a>container</a>'s membership.
    * For <a>containers</a>, the server typically requires the <a>container</a> to be empty unless a recursive delete is explicitly requested and supported.
* **Outcome**: Confirmation of removal or a notification of failure.

The delete resource operation is implemented using the HTTP DELETE method, as defined in the abstract operation above. This section specifies the HTTP bindings for inputs, behaviors, and responses.

The DELETE request targets the URI of the resource or <a>container</a> to remove. Clients MAY include an `If-Match` header with an ETag for concurrency checks.

**Deletion and <a>Containment</a>:**
When a resource is deleted, the server MUST atomically remove it from its parent <a>container</a>'s `items` list. The parent container's `totalItems` count SHOULD be updated accordingly, and its ETag MUST be updated to reflect the change.

For non-container resources, the server removes the resource content, its associated metadata (<a>linkset resource</a>), and the <a>containment</a> reference in the parent <a>container</a>.

For <a>container</a> resources, the server defaults to non-recursive deletion. If the <a>container</a> is not empty and recursion is not requested, the server MUST reject the request with 409 Conflict. Servers MAY support recursive deletion of all contained resources within the <a>container</a> that is being deleted. Clients MUST use the `Depth: infinity` header to request for a recursive delete, as defined in [[RFC4918]].

On success, the server MUST respond with 204 No Content. Servers SHOULD support conditional requests, as defined in [[RFC9110]].

If the client lacks authorization, the server MUST return 403 Forbidden (if the client's identity is known but permissions are insufficient) or 401 Unauthorized (if no valid authentication is provided). In cases where revealing resource existence poses a security risk, the server MAY return 404 Not Found instead.

**Example (DELETE a non-container resource):**
```
DELETE /alice/notes/shoppinglist.txt HTTP/1.1
Authorization: Bearer <token>
If-Match: "abc123456"
```
Assuming the ETag matches and the client is authorized, the server deletes the resource, its metadata, and removes it from the parent container `/alice/notes/` atomically:
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
