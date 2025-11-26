### Delete Resource (HTTP DELETE)

The [delete resource](https://w3c.github.io/lws-protocol/spec/#dfn-deletion) operation removes an existing resource (or, in some cases, an entire container) from the storage. This operation is akin to deleting a file or folder in a file system. Once completed, the target resource is no longer available for read or update, and its identifier becomes invalid (attempts to access it later should report it as not found, unless it is recreated). Servers MUST ensure that deletions are atomic, including the removal of associated metadata resources and updates to parent container memberships. Metadata lifecycles are tied to the primary resource; deleting a resource MUST automatically delete its associated linkset and any server-managed metadata, without allowing independent deletion of metadata.

**DELETE (non-container resource)** – If the requested URI points to a regular resource (not a container), the server will delete that resource and any associated metadata, such as its linkset. On success, the server responds with `204 No Content` (the standard success code for **DELETE** indicating the resource is gone and there’s no further data to return). After this, any **GET** or **HEAD** to that URI should return 404 Not Found (or optionally 410 Gone to indicate permanent removal) unless a new resource is later created at the same URI. The server MUST also delete any auxiliary files or metadata associated with that resource and update the parent container's membership atomically. For example, some servers store access control rules or metadata in sidecar files (like `resource.acl`); those MUST be cleaned up. If the resource did not exist to begin with, the server returns `404 Not Found` for the **DELETE** (because you’re asking to delete something that isn’t there). If the client is not authorized to delete the resource, the server returns `403 Forbidden` (if the client’s identity is known but they lack permission) or possibly `401 Unauthorized` (if no valid auth was provided, prompting for credentials). In some cases, as discussed, a server might also return 404 for unauthorized requests to avoid hinting that the resource exists. Servers SHOULD support concurrency checks via If-Match with ETags for deletes; mismatches yield 412 Precondition Failed.

**Example (DELETE a non-container resource):**
```
DELETE /alice/notes/shoppinglist.txt HTTP/1.1
Authorization: Bearer <token>
If-Match: "abc123456"
```
Assuming the ETag matches and the client is authorized, the server deletes the resource, its metadata, and updates the parent container `/alice/notes/` atomically:
```
HTTP/1.1 204 No Content
```

**DELETE (container resource)** – Deleting a container is more restricted. By default, an LWS server requires that a container be empty (no child resources) in order to delete it; non-recursive deletion is the default behavior. This means if a client issues a DELETE on a container that still has members, the server MUST respond with `409 Conflict`. The response MAY include a message indicating the reason. This behavior protects against accidental deletion of large sets of data with a simple request. The client should then either delete the contained resources individually or (if it really intends to remove everything) use an explicit recursive delete mechanism if the server supports one. Upon deletion, the server MUST remove the container's metadata and update any parent container's membership atomically.

**Example (DELETE a non-empty container without recursion):**
```
DELETE /alice/notes/ HTTP/1.1
Authorization: Bearer <token>
```
Assume `/alice/notes/` contains resources (like shoppinglist.txt and others). The server will refuse to delete since it’s not empty:
```
HTTP/1.1 409 Conflict
Content-Type: text/plain
Cannot delete container /alice/notes/ - container is not empty.
```
Here a 409 Conflict is returned, possibly with a simple text message. The client then knows it must delete the contents first or try a recursive delete.

LWS implementations MAY support a way to request recursive deletion of a container and all its descendants in one go, using a request header `Depth: infinity` on the **DELETE** request (as in WebDAV [[RFC 4918](https://datatracker.ietf.org/doc/html/rfc4918)]). In LWS, this is OPTIONAL, and the default is non-recursive unless specified. Servers that support recursion MUST verify permissions for all affected resources and SHOULD abort on failures, potentially returning 403 Forbidden or 500 Internal Server Error with details. Advanced implementations MAY return a 207 Multi-Status (WebDAV style) listing what succeeded and failed, but LWS does not require that level of detail in this core spec. If recursion is not supported, servers MUST reject such requests with 501 Not Implemented.

**Example (DELETE a container with recursion, if supported):**
```
DELETE /alice/notes/ HTTP/1.1
Authorization: Bearer <token>
Depth: infinity
```
If the server honors `Depth: infinity` to mean recursive deletion (and the user has rights to everything under `/alice/notes/`), it would proceed to delete all items in `notes/` and then the container itself, including all associated metadata. A success would be `204 No Content` indicating everything is gone. If, say, one file in `notes/` was not deletable (maybe a permission issue on that file), the server might abort and return an error (perhaps 403 or 500 with an explanation).