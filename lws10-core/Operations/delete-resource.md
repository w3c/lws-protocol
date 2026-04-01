Permanently removes a resource and its associated auxiliary resources.

* **Inputs**: Target identifier, an optional recursive flag (for containers), and optional concurrency constraints.
* **Behavior**:
    * For non-container primary resources, the server removes the content, metadata, all its auxiliary resources, and updates the parent container's containment membership.
    * For containers, the server typically requires the container to be empty unless a recursive delete is explicitly requested and supported.
    * For auxiliary resources, the server removes the content, and updates the principal resource's metadata linkset by removing corresponding auxiliary link.
* **Outcome**: Confirmation of removal or a notification of failure.

The delete resource operation is implemented using the HTTP DELETE method, as defined in the abstract operation above. This section specifies the HTTP bindings for inputs, behaviors, and responses.

The DELETE request targets the URI of the resource or container to remove. Clients MAY include an `If-Match` header with an ETag for concurrency checks.

**Deletion and Containment:**
When a contained resource is deleted, the server MUST atomically remove it from its parent container manifest's `items` list. The parent container manifest's `totalItems` count and ETag MUST be updated accordingly.

When an auxiliary resource is deleted, the server MUST atomically remove the corresponding link from its principal resource's metadata linkset. ETags of the manifest and linkset resources of the principal resource MUST be updated accordingly.

For all resources, the server removes the resource content. For all primary resources, the server removes its associated auxiliary resources.

For container resources, the server defaults to non-recursive deletion. If the container is not empty and recursion is not requested, the server MUST reject the request with 409 Conflict. Servers MAY support recursive deletion of all contained resources within the container that is being deleted. Clients MUST use the `Depth: infinity` header to request for a recursive delete, as defined in [[RFC4918]].

On success, the server MUST respond with 204 No Content. Servers SHOULD support conditional requests, as defined in [[RFC9110]].

If the client lacks authorization, the server MUST return 403 Forbidden (if the client's identity is known but permissions are insufficient) or 401 Unauthorized (if no valid authentication is provided). In cases where revealing resource existence poses a security risk, the server MAY return 404 Not Found instead.

**Example (DELETE a non-container contained resource):**
```
DELETE /alice/notes/shoppinglist.txt HTTP/1.1
Authorization: Bearer <token>
If-Match: "abc123456"
```
Assuming the ETag matches and the client is authorized, the server deletes the resource, its auxiliary resources, and removes it from the parent container `/alice/notes/` by updating its manifest atomically:
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
Assuming the server supports recursion and the client has permissions for all contents, the server deletes the container , its auxiliary resources, and its descendants atomically:
```
HTTP/1.1 204 No Content
```

**Example (DELETE a non-server-managed auxiliary resource):**
```
DELETE /alice/notes/~acl HTTP/1.1
Authorization: Bearer <token>
If-Match: "abc123456"
```
Assuming the ETag matches and the client is authorized, the server deletes the auxiliary resource and removes it from the principal resource `/alice/notes/` by updating its linkset atomically:
```
HTTP/1.1 204 No Content
```
