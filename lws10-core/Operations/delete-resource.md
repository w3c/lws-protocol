### Delete Resource Operation
The [*delete resource*](https://w3c.github.io/lws-protocol/spec/#dfn-deletion) operation removes an existing resource or, if supported and explicitly requested, an entire container and its contents from the storage. This operation is analogous to deleting a file or folder in a file system. Once completed, the target resource is no longer available for read or update, and its identifier becomes invalid. Subsequent attempts to access it MUST result in an appropriate error response, such as indicating that the resource is not found or permanently unavailable, unless a new resource is later created at the same identifier.

Deletions MUST be atomic, encompassing the removal of associated metadata resources and updates to parent container memberships. Metadata lifecycles are tied to the primary resource, with automatic deletion upon resource removal. Servers MUST NOT allow independent deletion of metadata.

**Inputs:**
- **Target identifier:** The identifier of the resource or container to delete.
- **Optional recursive flag:** Applicable if the target is a container. By default, containers MUST be empty (no members) to be deleted. If the client explicitly indicates a recursive delete (where supported), the server deletes the container and all of its contents, including any sub-containers. This flag MUST be used with care to avoid accidental mass deletion. Recursive deletion is OPTIONAL for servers; if not supported, servers MUST reject such requests with an appropriate error.
- **Optional concurrency check:** An optional condition to avoid conflicting deletes, such as an expected version tag or token (e.g., a last-known ETag). Servers MAY support concurrency controls using mechanisms such as ETags. If a concurrency token is provided by the client and the resource has changed since the client's last read, the server SHOULD respond with an error indicating a precondition failure, provided no prior error conditions (e.g., invalid authentication or rate limiting) apply.

**Behavior:**
- If the target is a non-container resource, the server MUST remove that resource from storage, including its content and any associated metadata or auxiliary resources (e.g., access control lists or index entries).
- If the target is a container resource, the server MUST only delete it if it has no member resources, unless recursion is explicitly requested and supported. If the container is not empty and recursion is not indicated, the server MUST refuse the operation and signal a conflict.
- If a recursive delete is explicitly requested and supported, the server MUST attempt to delete the target container and all resources contained within it. If the operation fails partway through, the server is not required to roll back deletions that have already succeeded, potentially resulting in a partially deleted state. The server SHOULD indicate in its error response which resource caused the failure, if possible.
- Authorization checks: The server MUST verify that the client has permission to delete the resource and, if recursive, each contained resource.

**Possible Responses:**
- **Deleted:** The resource or container was successfully deleted.
- **Not Found:** The resource does not exist or is already deleted.
- **Not Permitted:** The client lacks permission to delete the resource.
- **Conflict:** The target is a non-empty container, and the client did not request (or the server does not support) recursive deletion.
- **Precondition Failed:** A concurrency mismatch occurred.
- **Unknown Error:** An unexpected error occurred during deletion; the system state SHOULD remain unchanged.
