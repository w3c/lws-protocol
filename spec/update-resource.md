The [update resource](https://w3c.github.io/lws-protocol/spec/#dfn-update-resource) operation modifies the contents or state of an existing [served resource](https://w3c.github.io/lws-protocol/spec/#dfn-served-resource).  This is typically used to replace the content of a file, patch a document, or update metadata associated with a resource. The update can be done in two ways: by providing a full new content (replace the entire resource) or by providing a partial change (apply a patch to the current content).

**Inputs**:

* **Target identifier:** The identifier of the resource to update. (Containers generally cannot be “updated” in the same way; updating a container’s membership is done via create/delete of members rather than an explicit update to the container resource itself, except for changing container-specific metadata if any.) The target must already exist for an update operation to succeed.

* **New content:** The data to be written to the resource. For a full replacement update, this would be the entire new content. For a partial update, this would be some form of patch description containing the changes. The content could be binary or text, depending on the resource type.

* **Optional concurrency check:** An optional condition to avoid conflicting updates. This could be an expected version tag or token (for example, a last-known version number or ETag that the client has). The idea is to prevent **lost updates** – if the resource has been changed by someone else since the client last fetched it, the update operation can detect the mismatch and fail rather than blindly overwriting the other change. In protocols, this might be implemented with mechanisms like “If-Match” headers (HTTP) or other versioning schemes.

**Behavior:**

* The server will attempt to apply the provided update to the target resource **atomically**. For a full content replacement, this means the old content is entirely replaced with the new content in one step. For a patch, the changes are applied to the current content. In either case, partial updates should be handled such that if the patch cannot be applied (e.g., it doesn’t match the current content version), the operation fails cleanly without altering the resource.

* If a concurrency token or version check is provided, the server will compare it against the current version of the resource. If they do not match (meaning the resource was modified since the client last saw it), the server **MUST** reject the update with a conflict error. This prevents unintentional overwrites of others’ changes. Clients are then expected to re-fetch the resource or otherwise reconcile the differences before retrying.

* The update operation requires proper authorization. If the client is not allowed to modify the resource, the server will deny the operation (typically without revealing whether the resource exists if the client is not supposed to know about it).

* If the resource to be updated does not exist, the server will treat this as an error (usually a “Not Found”). The update operation is only applicable to existing resources. (Some protocols like HTTP PUT combine create/update semantics, but in the logical model here, creating a new resource should be done via the create operation; update assumes a pre-existing target.)

* On success, the resource’s content is changed to the new content (fully replaced or patched). Any relevant metadata (size, modification time, version tag) is updated accordingly. The server ensures the operation is atomic and consistent: other operations should not see a half-updated state.

**Possible Responses:**

* **Success:** The resource was successfully updated. The server may return the updated representation of the resource (including new metadata like a new version tag), or it may simply confirm success with no body. For example, an HTTP binding might return `200 OK` with the updated content or `204 No Content` to indicate the update went through. In either case, headers like a new `ETag` or `Last-Modified` timestamp would be sent so the client knows the new version.

* **Not Found:** The specified resource does not exist, so no update can be performed. (If the client is not authorized, this could also be the response to avoid giving away existence; see “Not Permitted.”)

* **Not Permitted:** The client is not authorized to modify this resource. The server refuses the update. (In HTTP this might be `403 Forbidden`, or `404 Not Found` if we don’t want to reveal that the resource exists to an unauthenticated requester.)

* **Conflict:** The update could not be applied because of a concurrency conflict or an invalid state. For example, if an “edit token” or version check was provided and did not match the current resource version, the server will respond with a conflict indication (the client’s view of the resource is out-of-date). Another example is if a patch document cannot be applied (e.g., it references a part of the content that has changed or doesn’t exist), the server treats it as a conflict or bad request.

* **Bad Request:** The update request was malformed or unacceptable. For instance, the patch syntax could be invalid, or the new content might not conform to expected format constraints. The server did not attempt any update.

* **Unknown Error:** Some internal error happened during the update attempt (such as a database failure, etc.). The resource remains unchanged (if the server could not complete the operation), and an error is returned indicating a server-side failure.