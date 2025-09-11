The [delete resource](https://w3c.github.io/lws-protocol/spec/#dfn-deletion) operation removes an existing resource (or, in some cases, an entire container) from the storage. This operation is akin to deleting a file or folder in a file system. Once completed, the target resource is no longer available for read or update, and its identifier becomes invalid (attempts to access it later should report it as not found, unless it is recreated).

**Inputs**:

* **Target identifier:** The identifier of the resource or container to delete.

* **Optional recursive flag:** Applicable if the target is a container. By default, containers must be empty (no members) to be deleted. If the client explicitly indicates a *recursive delete* (where supported), it signals that the server should delete the container and all of its contents including any sub-containers (akin to `rm -r` on Unix-like OS). This flag must be used with care to avoid accidental mass deletion.

**Results**:

* If the target is a **non-container resource** (a single item), the server will remove that resource from storage. This includes deleting its content and any associated metadata or auxiliary resources. For example, if there are separate metadata files (like access control lists or index entries related to that resource), those should also be cleaned up as appropriate. After a successful deletion, any subsequent read or update of that resource by clients should be treated as if the resource has never existed (since it no longer does).

* If the target is a **container resource** (collection), the server will by default only delete it if it has no members (no child resources). This is to prevent accidental deletion of large sets of data. If the container is not empty (the client attempted to delete a non-empty container without explicitly saying it’s okay to also delete everything inside), the server will typically refuse the operation, signaling a conflict. The client then has the responsibility to either start by deleting the members or use an explicit recursive delete (similar to `rm -r`), if the protocol allows.

* If a **recursive delete** is explicitly requested (and supported by the server), the server will attempt to delete the target container and all resources contained within it, potentially including sub-containers and their contents (i.e., the entire sub-tree of that container). If a recursive delete operation fails partway through, the server is not required to roll back the deletions that have already succeeded; i.e., the operation may result in a partially deleted state. The server `SHOULD` indicate in its error response which resource caused the failure, if possible. Recursive deletion is a dangerous operation, so it typically must be explicit. Some protocols might require a special header or parameter for this. If the server does not support recursive deletion, it will reject attempts to delete non-empty containers.

* Authorization checks: The server must verify that the client has permission to delete the resource (and, if recursive, each contained resource). If not authorized, the server will deny the request; if recursive, the denial might come partway through the process. As with reads, if the client is entirely unauthenticated or not permitted, the server might refuse in a way that doesn’t reveal (to outsiders) whether the resource existed at all.

* Upon successful deletion, the target resource is gone. The server should free up any storage associated with it and update any relevant indexes or parent containers (e.g., remove the reference from its parent container’s membership list). If the resource had specific metadata (like an ACL entry), that metadata should also be removed or invalidated. Deleting a container might involve updating its parent container to remove the now-deleted child.

**Possible Responses:**

* **Deleted:** The resource (or container) was successfully deleted. In a concrete protocol this is usually indicated with a confirmation and no content (for example, HTTP 204 No Content). After this response, the client should consider the identifier no longer valid for use unless it’s recreated.

* **Not Found:** The resource does not exist (or is already deleted). The server could not perform any deletion because there was nothing to delete. (Again, for unauthorized requests, the server might also use this response to avoid revealing its existence.)

* **Not Permitted:** The client is not allowed to delete the resource. The server refused to perform the deletion. In an HTTP scenario this could be a `403 Forbidden`.

* **Conflict:** The target is a container that is not empty, and the client did not request (or the server does not allow) recursive deletion. The server leaves the container and its contents intact, and returns an error indicating that the container has members and cannot be removed as requested. The client would need to handle this by emptying the container or explicitly requesting a recursive delete if supported.

* **Unknown Error:** The server encountered an unexpected error during the deletion process (e.g., an IO error preventing file removal). The state of the system should remain as before (i.e., the resource still exists if the delete wasn’t completed), but the operation failed. The server signals a generic internal error to the client.

**Note:** When a server denies access (for read, update, delete, etc.) due to authorization, it should do so in a consistent manner. In many cases, a client not authorized to know of a resource’s existence will just get a **Not Found** response instead of **Not Permitted**, to avoid revealing that the resource is there. This is a security consideration that implementations should follow.