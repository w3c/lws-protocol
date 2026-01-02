### Update Resource Operation
The [*update resource*](https://w3c.github.io/lws-protocol/lws10-core/#dfn-update-resource) operation modifies the contents or state of an existing [served resource](https://w3c.github.io/lws-protocol/lws10-core/#dfn-served-resource). This is typically used to replace the content of a file, patch a document, or update metadata associated with a resource. The update can be done in two ways: by providing a full new content (replace the entire resource) or by providing a partial change (apply a patch to the current content). Updates apply only to non-container resources or container metadata; container membership is managed via create/delete operations on members (as per Section 8.4).

**Inputs**:
* **Target identifier:** The identifier of the resource to update. The target must already exist for an update operation to succeed.
* **New content:** The data to be written to the resource. For a full replacement update, this would be the entire new content. For a partial update, this would be some form of patch description containing the changes. The content could be binary or text, depending on the resource type.
* **Optional concurrency check:** An optional condition to avoid conflicting updates. This could be an expected version tag or token.

**Behavior:**
* The server will attempt to apply the provided update to the target resource **atomically**. For a full content replacement, this means the old content is entirely replaced with the new content in one step. For a patch, the changes are applied to the current content. In either case, partial updates should be handled such that if the patch cannot be applied, the operation fails cleanly without altering the resource. Partial updates are optional.
* If a concurrency token or version check is provided, the server will compare it against the current version of the resource. If they do not match (meaning the resource was modified since the client last saw it), the server **MUST** reject the update with a conflict error. This prevents unintentional overwrites of others’ changes. Clients are then expected to re-fetch the resource or otherwise reconcile the differences before retrying. Servers MUST support optional concurrency controls, failing with Precondition Failed if the resource has changed since the client's last read.
* On success, the resource’s content is changed to the new content (fully replaced or patched). Any relevant metadata is updated accordingly. Updates MUST propagate to associated metadata atomically, preserving server-managed fields. The server ensures the operation is atomic and consistent: other operations should not see a half-updated state.
* The server **MAY** enforce additional constraints on updates, such as size limits, quota checks, or restrictions on allowed media types. If any such constraint is violated, the server will reject the operation with an appropriate error.

**Possible Responses:**
* **Success:** The resource was successfully updated.
* **Not Found:** The specified resource does not exist, so no update can be performed. (If the client is not authorized, this could also be the response to avoid giving away existence; see “Not Permitted.”)
* **Not Permitted:** The client is not authorized to modify this resource. The server refuses the update.
* **Conflict:** The update could not be applied because of a concurrency conflict or an invalid state. For example, if an “edit token” or version check was provided and did not match the current resource version, the server will respond with a conflict indication (the client’s view of the resource is out-of-date). Another example is if a patch document cannot be applied, the server treats it as a conflict or bad request.
* **Precondition Failed:** A concurrency mismatch occurred. The server rejects the update without changes.
* **Bad Request:** The update request was malformed or unacceptable. For instance, the patch syntax could be invalid, or the new content might not conform to expected format constraints, or violate quotas. The server did not attempt any update.
