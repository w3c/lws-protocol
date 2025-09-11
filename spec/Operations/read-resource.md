The [*read resource*](https://w3c.github.io/lws-protocol/spec/#dfn-retrieval) operation retrieves a [resource representation](https://w3c.github.io/lws-protocol/spec/#dfn-resource-representation) of an existing resource or the contents of a container.  In other words, it is used to **fetch or access data** stored in the system. This operation covers both reading non-container resources (e.g., files, documents, binary data) and listing the members of container resources (folders/collections).

**Inputs:**

* **Target identifier:** The unique identifier of the resource or container to read (e.g., a URI or path pointing to the resource).

* **Optional parameters:** These may include a *preferred format* for the response and/or a *partial range* specifier. For example, a client can request the resource in a specific format or ask for only a portion of the data (such as a byte range or subset), if the protocol supports it. The client might also indicate if it only wants metadata (e.g., to check if the resource exists or get its attributes without the full content).

**Behavior:**

* If the target is a **non-container resource** (e.g., a file or data item), the server returns the content of that resource. By default, the content is returned in its stored format (for example, the exact bytes of an image, or the text of a text file). If the client provided an acceptable format list (e.g., via content negotiation), the server will try to honor it. If the server has multiple representations of the resource or can convert the resource to the requested format, it may return the resource in that format. Otherwise, if the requested format is not available, the server will respond with an error (indicating the format is not acceptable).

* If the target is a **container resource**, the server returns a representation of the container’s contents (a **listing of its member resources**). Instead of raw binary content, a container’s “content” is essentially the collection of references to its children. The server may format this listing in a suitable manner (e.g., as a simple list of names, as a JSON or HTML directory listing, or in an RDF graph if semantic links are used). By default, if no specific format is requested, the server might return a human-readable HTML or text listing. If a machine-readable format is requested and supported (for example, JSON, XML, or Turtle for RDF), the server can return the listing in that format.

* The read operation also supports *metadata-only* access. For example, a client might perform a read request that asks for no body (just headers or metadata in HTTP, or an existence check). In such cases the server can respond with just the meta-information (like the fact that the resource exists, its last-modified timestamp, size, etc.) without sending the full content. This is useful for clients to verify existence or check for updates (e.g., via a version tag) without downloading the entire resource.

* **Authorization checks:** If the client does not have permission to read the target resource or container, the server must refuse the read in a way that does not reveal unauthorized information. Specifically, if a request is unauthorized, the server should respond with an access denial. Depending on the implementation’s security model, it might respond as “Not Permitted” (for an authenticated user who lacks read rights) or even as if the resource does not exist (to an unauthenticated request, so as not to confirm the resource’s existence). In other words, the server should not leak the existence or details of resources to unauthorized parties.

**Possible Responses:**

* **Success:** The operation succeeded. For a non-container resource, the full (or requested range of) content is returned, along with relevant metadata (such as content type, length, and a version tag like an ETag or modification time). For a container, a listing of members (in the default or requested format) is returned. In a protocol like HTTP, a success might be indicated with 200 OK and include the representation in the response body.

* **Not Found:** The target resource or container does not exist (or is not available to the client). The read operation could not be performed. (Also note, as mentioned, an unauthorized request might also result in a response that looks like a Not Found to avoid information disclosure.)

* **Not Permitted:** The client’s identity is known but they are not allowed to access this resource. The server refuses to provide the content. In an HTTP binding this could be a 403 Forbidden. No details about the resource should be revealed in the response.

* **Not Acceptable:** The client requested a format or representation that the server cannot provide. The resource exists, but the server could not satisfy the `Accept`/format criteria (for example, the client asked for XML but the resource is an image that can only be served in its binary format). In HTTP this corresponds to 406 Not Acceptable, possibly accompanied by a list of available formats or an explanation.

* **Partial Content:** (If partial range was requested and succeeded.) The server returns a fragment of the resource (with status indicating partial content, e.g., HTTP 206). This would include appropriate headers indicating the range delivered and total size.

* **Unknown Error:** Some internal error occurred while trying to read the resource (e.g., a backend failure). The operation did not succeed, and the server signals a generic error (like HTTP 500 Internal Server Error).