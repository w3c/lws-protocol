### Container Model

Linked Web Storage organizes resources into containers. A <dfn>container</dfn> is a specialized resource that holds references to other resources, called its members. Containers serve as organizational units, analogous to directories or collections, enabling clients to group, discover, and navigate resources.

Every LWS storage has a **root container** that serves as the top-level organizational unit. The root container has no parent and acts as the entry point for the storage hierarchy.

Resources in LWS are classified as either:

- **Container** — a resource that contains other resources.
- **DataResource** — a data-bearing resource (e.g., a document, image, or structured data file).

### Single Containment

LWS enforces a **single containment** model: with the exception of the root container, every resource MUST belong to exactly one parent container. This produces a strict tree structure with the root container at its apex.

The containment relationship between a resource and its parent container is expressed via the `rel="up"` link relation. Servers MUST include a `Link` header with `rel="up"` pointing to the parent container in responses to GET and HEAD requests on any non-root resource.

```
Link: </alice/notes/>; rel="up"
```

A container's members are listed in its representation using the `items` property. The server manages this list; clients cannot modify it directly. Membership changes occur as a side effect of resource creation and deletion.

### Containment Integrity

The server MUST maintain containment integrity at all times:

- **Creation**: When a new resource is created in a container, the server MUST atomically add the resource to the container's `items` list.
- **Deletion**: When a resource is deleted, the server MUST atomically remove it from its parent container's `items` list. Deleting a container requires the container to be empty, unless recursive deletion is explicitly requested.
- **No orphans**: Every non-root resource MUST be reachable from the root container through the containment hierarchy.
- **No cycles**: The containment hierarchy MUST form a tree. A container MUST NOT directly or indirectly contain itself.

### Resource Identification

Resources are identified by URIs. The URI of a resource is independent of its position in the containment hierarchy. Servers assign URIs during resource creation and MAY incorporate client hints (e.g., the `Slug` header), but clients MUST NOT assume that URI structure reflects containment.

Containment relationships are expressed through metadata (`rel="up"` links and the `items` property in container representations), not through URI path structure. This separation allows servers flexibility in URI assignment while maintaining a well-defined organizational model.

### Container Membership and Authorization

A container's member listing is filtered by the requesting agent's permissions. When a client retrieves a container, the response MUST include only those member resources that the client is authorized to discover. The `totalItems` count in the container representation reflects the total number of accessible items for the requesting agent.

Authorization is enforced per resource. A client's ability to read a container listing does not imply access to the contained resources themselves, and vice versa.
