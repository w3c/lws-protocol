### Metadata
This section defines the model for associating metadata with LWS resources. The LWS metadata system is based on the principles of Web Linking [[RFC 8288]], which allows servers to describe the relationships between resources using typed links. Metadata enhances discoverability, supports self-descriptive APIs, and aligns with resource operations, container hierarchies, and REST bindings as outlined in sections 7 and 8.

**Metadata Model**
All metadata in LWS is expressed as a set of typed links originating from a resource (the link context). Each link consists of:
- A link target: A URI identifying the related resource.
- A relation type: A string that defines the nature of the relationship.
- Optional target attributes: Additional key-value pairs that further describe the link or the target resource (e.g., mediaType, title, modified).
Metadata distinguishes between resources and their representations, allowing for multiple media types where applicable. For containers, metadata includes membership details and supports pagination to handle large sets efficiently. For DataResources, metadata includes representations, each with mediaType and optional sizeInBytes.

**The Linkset Resource**
For each resource in a storage, a server MUST make metadata links available as a standalone resource according to [[RFC9264]]. A resource's linkset resource is discoverable via a Link header with the relation type linkset.
A linkset resource MUST be available with the `application/linkset+json` media type as defined in [[RFC9264]]. Other serializations MAY be supported via content negotiation.
The 'linkset' link MUST point to a server-managed resource with a fixed media type (application/linkset+json or application/linkset), and servers MUST ensure its integrity upon operations like deletions or ACL changes on related resources. Updates to the linkset MUST be atomic with associated resource operations to maintain consistency.

**Discovering Metadata**
Clients discover a resource's metadata primarily through Link headers returned in response to GET or HEAD requests on the resource's URI. To enhance discoverability, servers MUST support a Link header with rel="storageDescription" on relevant responses, such as 401 Unauthorized, and include a WWW-Authenticate header with parameters directing to the storage metadata. This aligns with self-descriptive principles and avoids hardcoded URI locations.
A client can supply an HTTP Prefer header [[RFC7240]] as a hint to a server to form the most suitable response. This specification defines the URI https://www.w3.org/ns/lws#PreferLinkRelations for use with the include or omit parameters as inspired by [[LDP]]. When used with include, the server MUST include the specified link relations in the response. When used with omit, the server MUST exclude the specified link relations from the response. If no such preference is specified, all applicable link relations are returned by default.

**Metadata Types**
LWS defines three classes of metadata - system, core, and user. The terms listed in this section are defined at relevant vocabularies.
System-Managed - System-managed metadata is maintained by a LWS server and is read-only. A server MUST NOT allow users to manipulate this data.
| item | defined by |
|------------|------------|
| acl ||
| linkset ||
| type ||
| representation ||
| https://www.w3.org/ns/lws#sizeInBytes | [lws](https://www.w3.org/ns/lws#) |
| http://purl.org/dc/terms/modified | [dcterms](http://purl.org/dc/terms/) |
| http://purl.org/dc/terms/publisher | [dcterms](http://purl.org/dc/terms/) |

Clients SHOULD NOT attempt to modify, add, or delete server-managed links, such as those with relation types 'acl' or 'linkset', as these are read-only and maintained exclusively by the server. Servers MUST reject such attempts with a 403 Forbidden response, potentially including an explanatory message in the body. While servers MAY implement additional handling in limited scenarios, this specification does not define those semantics, and clients MUST NOT rely on them for interoperability.
To mitigate risks associated with server-managed links, clients MUST implement graceful handling for cases where such links become inaccessible or inconsistent. This includes strategies such as falling back to default behaviors, retrying link discovery after a delay, or notifying the user of the issue without crashing the application.

Core Metadata - Core metadata MAY include optional fields such as title, creator, or other elements from DC Terms.

| item | defined by |
|------------|------------|
| partOf | [lws](https://www.w3.org/ns/lws#) |
| contains | [lws](https://www.w3.org/ns/lws#) |
| http://purl.org/dc/terms/title | [dcterms](http://purl.org/dc/terms/) |
| http://purl.org/dc/terms/creator | [dcterms](http://purl.org/dc/terms/) |

**Modifiability Considerations**
Core metadata, such as 'partOf', 'contains', 'type', 'title', and 'creator', MAY be modified by clients via PATCH operations on the associated linkset resource; servers MUST support JSON Merge Patch for partial updates. Servers MAY also support PUT for complete metadata replacement, but clients SHOULD NOT assume its availability and MUST handle rejections accordingly. However, servers MAY impose restrictions on certain core links to maintain system integrity. For instance, modifying the 'partOf' or 'contains' link to 'move' a resource is OPTIONAL for server implementations, as it may involve complex operations like updating slash-based semantics or decoupling containment meanings. Clients SHOULD NOT assume universal support for such changes and MUST handle server rejections. Servers that do not support modifications to 'partOf' MUST document this in their conformance statements. Metadata lifecycles are tied to the described resource, with automatic deletion upon resource removal.
User-Defined Metadata
Users MAY create or add additional metadata using existing or custom vocabularies, including user-defined types and indexes.

**Managing Metadata**
Metadata is managed by modifying a resource's associated linkset resource using PUT or PATCH operations. Servers MUST support concurrency controls for updates.
Replacing Metadata (PUT): A client can replace the entire set of metadata links by sending a PUT request to the linkset URI with a complete linkset document in the body.
Partially Updating Metadata (PATCH): A client can add, remove, or modify individual links by sending a PATCH request to the linkset URI. LWS servers MUST support JSON Merge Patch operations on linkset resources, where the request body uses the media type `application/merge-patch+json` as defined in [[RFC 7396]]. A server MUST advertise the media types it supports for PATCH operations in the `Accept-Patch` header.