### Container Model

Linked Web Storage organizes resources into <a>containers</a>. A <a>container</a> is a specialized resource that holds references to other resources, called its members. Containers serve
as organizational units, analogous to directories or collections, enabling clients to group, discover, and navigate resources. A container maintains references to its member resources,
which may comprise both non-container resources and additional container resources, thereby enabling hierarchical formations. Typically, a container holds minimal intrinsic content
beyond metadata or enumerations of its members; its principal role is to aggregate and structure subordinate resources. The <a>storage</a> system's root is designated as a <a>container</a>, serving
as the apex organizational unit devoid of a superior parent. Containers MUST support pagination for membership listings using 'ContainerPage' types, with properties such as 'first',
'next', 'prev', and 'last'. Representations MUST use JSON-LD with a specific frame and normative context, optionally advertising content negotiation via 'Vary: Accept' headers.
Storage MAY function as a root container, enabling direct writes.

Every LWS <a>storage</a> has a **<a>storage root</a>** that serves as the top-level organizational unit. The <a>storage root</a> has no parent and acts as the entry point for the <a>storage</a> hierarchy.

Resources in LWS are classified as either:

- **<a>Container</a>** — a resource that contains other resources.
- **<a>Data resource</a>** — a data-bearing resource (e.g., a document, image, or structured data file).

### Containment

The <a>containment</a> relationship between a resource and its parent <a>container</a> is expressed via the `rel="up"` link relation. Servers MUST include a `Link` header with `rel="up"` pointing to the parent container in responses to GET and HEAD requests on any non-root resource.

```
Link: </alice/notes/>; rel="up"
```

A <a>container</a>'s members are listed in its representation using the `items` property. The server manages this list; clients cannot modify it directly. Membership changes occur as a side effect of resource creation and deletion.

### Containment Integrity

The server MUST maintain <a>containment</a> integrity at all times:

- **Creation**: When a new resource is created in a <a>container</a>, the server MUST atomically add the resource to the <a>container</a>'s `items` list.
- **Deletion**: When a resource is deleted, the server MUST atomically remove it from its parent <a>container</a>'s `items` list. Deleting a <a>container</a> requires the <a>container</a> to be empty, unless recursive deletion is explicitly requested.
- **No orphans**: Every non-root resource MUST be reachable from the <a>storage root</a> through the <a>containment</a> hierarchy.
- **No cycles**: A <a>container</a> MUST NOT directly or indirectly contain itself.

### Resource Identification

Resources are identified by URIs. The URI of a resource is independent of its position in the <a>containment</a> hierarchy. Servers assign URIs during resource creation and MAY incorporate client hints (e.g., the `Slug` header), but clients SHOULD NOT assume that URI structure reflects containment.

<a>Containment</a> relationships are expressed through metadata (`rel="up"` links and the `items` property in <a>container</a> representations), not through URI path structure. This separation allows servers flexibility in URI assignment while maintaining a well-defined organizational model.

### Container Membership and Authorization

If a client has read access to a <a>container</a>, the <a>container representation</a> MUST include the identifiers for all resources contained in that <a>container</a> to which the client has access. It MAY also contain the identifiers for resources contained in that <a>container</a> to which the client does not have access.

A client's ability to read a <a>container</a> listing does not imply access to the contained resources themselves, and vice versa.
