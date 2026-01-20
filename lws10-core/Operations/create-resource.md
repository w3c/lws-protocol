The **create resource** operation adds a new [served resource](#dfn-served-resource) to an existing [container](#dfn-container). This operation handles both the creation of data resources (files) and sub-containers.

**Inputs:**

* **Target container:** The identifier of the container where the new resource will be created.
* **Identity hint:** An optional suggestion for the new resource's identifier. The server may use this hint but is not required to.
* **Content:** The initial content and type for the new resource.

**Behavior:**

* **Identity generation:** The server determines the final identifier (URI) for the new resource. If an identity hint was provided, the server attempts to incorporate it while ensuring uniqueness and validity within the container. If no hint is provided, the server generates a unique identifier.
* **Container membership update:** The server atomically adds the new resource to the membership listing of the target container.
* **Metadata initialization:** The server initializes system metadata for the new resource. If the resource has an associated metadata resource it is also initialized.

**Possible Responses:**

* **Created:** The operation succeeded. The server returns the final identifier of the newly created resource.
* **Target Not Found:** The specified target container does not exist.
* **Not Permitted:** The client's identity is known, but they do not have permission to create resources in this container.
* **Unknown Requester:** The server does not recognize the client's identity and requires authentication.
* **Conflict:** A resource with the generated identifier already exists, or there is another state conflict.
* **Unknown Error:** An unexpected internal error occurred.