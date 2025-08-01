
**9.4 Delete Resource (HTTP DELETE)**

[**DELETE (resource)**](https://w3c.github.io/lws-protocol/spec/#dfn-deletion) \- Removing a resource or container is accomplished with the HTTP **DELETE** method. The client sends a DELETE request to the URI of the resource or container it wants removed. The behavior differs slightly for deleting a single resource vs a container.

**DELETE (non-container resource)** – If the requested URI points to a regular resource (not a container), the server will delete that resource. On success, the server responds with `204 No Content` (the standard success code for **DELETE** indicating the resource is gone and there’s no further data to return). After this, any **GET** or **HEAD** to that URI should return 404 (absent) unless a new resource is later created at the same URI. The server should also delete any auxiliary files or metadata associated with that resource. For example, some servers store access control rules or metadata in sidecar files (like `resource.acl`); those should be cleaned up. If the resource did not exist to begin with, the server returns `404 Not Found` for the **DELETE** (because you’re asking to delete something that isn’t there). If the client is not authorized to delete the resource, the server returns `403 Forbidden` (if the client’s identity is known but they lack permission) or possibly `401 Unauthorized` (if no valid auth was provided, prompting for credentials). In some cases, as discussed, a server might also return 404 for unauthorized requests to avoid hinting that the resource exists.

```
DELETE /alice/notes/shoppinglist.txt HTTP/1.1Authorization: Bearer <token>
```

Assume /alice/notes/ contains resources (like shoppinglist.txt and others). The server will refuse to delete since it’s not empty:

```
HTTP/1.1 409 Conflict  
Content-Type: text/plain

Cannot delete container /alice/notes/ - container is not empty.
```

Here a 409 Conflict is returned, possibly with a simple text message. The client then knows it must delete the contents first or try a recursive delete.

**DELETE (container resource)** – Deleting a container (folder) is a bit more restricted. By default, an LWS server requires that a container be empty (no child resources) in order to delete it. This means if a client issues a DELETE on a container that still has members, the server will respond with `409 Conflict`. The response may include a message indicating the reason (e.g., “Container not empty” or a list of what needs to be removed first). This behavior is to protect against accidental deletion of large sets of data with a simple request. The client should then either delete the contained resources individually or (if it really intends to remove everything) use an explicit recursive delete mechanism if the server supports one.

**Example (DELETE a container with recursive, if supported):**

```
DELETE /alice/notes/ HTTP/1.1  
Authorization: Bearer <token>  
Depth: infinity
```

If the server honors `Depth: infinity` to mean recursive deletion (and the user has rights to everything under `/alice/notes/`), it would proceed to delete all items in `notes/` and then the container itself. A success would be `204 No Content` indicating everything is gone. If, say, one file in `notes/` was not deletable (maybe a permission issue on that file), the server might abort and return an error (perhaps 403 or 500 with an explanation). Some advanced implementations might return a 207 Multi-Status (WebDAV style) listing what succeeded and failed, but LWS does not require that level of detail in this core spec.

LWS implementations **MAY** support a way to request recursive deletion of a container and all its descendants in one go. A server **MUST** use a request header  `Depth: infinity` on the **DELETE** request. In WebDAV \[[RFC 4918](https://datatracker.ietf.org/doc/html/rfc4918)\], a **DELETE** with `Depth: infinity` tells the server to delete the entire collection and its children. In LWS we clarify that by default it’s non-recursive unless specified.