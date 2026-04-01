The storage system organizes resources into two distinct layers: primary and auxiliary. The two layers are complementary. The primary layer organizes resources spatially and hierarchically, while the auxiliary layer attaches supplementary resources to each node in that hierarchy.

### Primary resource layer

The primary resource layer forms a strict hierarchy rooted at a single root container. Every primary resource except the storage root is contained by one or more parents. 

A <dfn>container</dfn> is a specialized resource that can contain other resources, called its contained members. Containers serve
as organizational units, analogous to directories or collections, enabling clients to group, discover, and navigate resources. A container maintains references to its contained member resources,
which may comprise both non-container resources and additional container resources, thereby enabling hierarchical formations. The principal role of a container is to aggregate and structure subordinate resources.

The storage system's root is designated as a container, serving as the apex organizational unit devoid of a superior parent, and acts as the entry point for the storage hierarchy. Storage MAY function as a root container, enabling direct writes.

Servers MUST include a `Link` header with `rel="type"` pointing to `https://www.w3.org/ns/lws#Container`.

```
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
```

#### Containment

The containment relationship between a resource and its parent container is expressed via the `rel="up"` link relation. Servers MUST include a `Link` header with `rel="up"` pointing to the parent container in responses to GET and HEAD requests on any contained resource.

```
Link: </alice/notes/>; rel="up"
```

### Auxiliary resource layer

The auxiliary resource layer is flat. Each primary resource owns a local set of auxiliary resources. An auxiliary resource is an LWS resource that is used to provide additional information or functionality related to a unique principal resource. The lifetime of an auxiliary resource is bound to the lifetime of its principal resource. Auxiliary resources do not participate in the containment hierarchy.


#### Auxiliarity

The auxiliarity relationship between an auxiliary resource and its principal resource is expressed via the `rel="principal"` link relation. Servers MUST include a `Link` header with `rel="principal"` pointing to the principal resource in responses to GET and HEAD requests on any auxiliary resource.

```
Link: </alice/notes/>; rel="principal"
```

Along with the general `rel="principal"` relation from auxiliary resource to its principal resource, an auxiliary resource is linked from the principal resource through a specialized link relation. This specialized relation is called the `auxiliaryRel` of the auxiliarity. This link must also have a parameter `auxiliary` with value set to `true`. Auxiliary relations are constrained to be functional. For each `auxiliaryRel`, there MUST be at most one auxiliary resource.

In responses to GET and HEAD requests on any principal resource, servers MUST link to each auxiliary resource with `rel` value set to the auxiliaryRel of the auxiliarity, with a link parameter `auxiliary` set to `true`.

```
Link: </alice/notes/~manifest.json>; rel="manifest"; auxiliary=true
Link: </alice/notes/~acl>; rel="acl" auxiliary=true
```

This specification predefines the following auxiliary relations:

- `manifest`: Server-managed manifest auxiliary resource (see below)
- `linkset`: Server-managed linkset auxiliary resource (see below)
- `acl`: ACL auxiliary resource. Server interprets it for access control over the resource.

### Container Manifest resource

Each <dfn>container resource</dfn> has a unique server-managed auxiliary resource called the <dfn>manifest resource</dfn>. A manifest resource holds basic metadata and enumerations of the container's contained members. It has `manifest` as the specialized auxiliarity relation. That is, servers MUST include a `Link` header with `rel="manifest"` pointing to the auxiliary manifest resource in responses to GET and HEAD requests on any container resource.

```
Link: </alice/notes/~manifest.json>; rel="manifest"
```

For each container, its contained members are listed in its manifest representation using the `items` property. Containment membership changes occur as a side effect of contained resource creation and deletion.

Manifest resources MUST support pagination for container membership listings using 'ContainerPage' types, with properties such as 'first', 'next', 'prev', and 'last'. Representations MUST use JSON-LD with a specific frame and normative context, optionally advertising content negotiation via 'Vary: Accept' headers.

#### Manifest integrity

The server MUST maintain manifest integrity at all times:

- **Creation**: When a new resource is created in a container, the server MUST atomically add the resource to its manifest's `items` list.
- **Deletion**: When a contained resource is deleted, the server MUST atomically remove it from its parent container's `items` list. Deleting a container requires the container to be empty, unless recursive deletion is explicitly requested.
- **No orphans**: Every non root resource MUST be either a contained resource reachable from the root container through the containment hierarchy, or an auxiliary resource reachable from a principal resource through an auxiliary relation.
- **No cycles**: A container MUST NOT directly or indirectly contain itself.
- **Layer hygiene**: A primary resource cannot have other primary resources as its auxiliary resource. An auxiliary resource cannot be a container containing other primary resources.

#### Manifest membership and Authorization

If a client has read access to a resource, the container manifest representation MUST include the identifiers for all contained members to which the client has access. It MAY also contain the identifiers for contained resources of that resource to which the client does not have access.

A client's ability to read a manifest listing does not imply access to the listed resources themselves, and vice versa.
