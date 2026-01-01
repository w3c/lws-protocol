### Metadata
This section defines the model for associating metadata with LWS resources. The LWS metadata system is based on the principles of Web Linking [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288.html), which allows servers to describe the relationships between resources using typed links. Metadata enhances discoverability, supports self-descriptive APIs, and aligns with resource operations, container hierarchies, and REST bindings as outlined in sections 7 and 8.

**Metadata Model**
All metadata in LWS is expressed as a set of typed links originating from a resource (the link context). Each link consists of:
- A link target: A URI identifying the related resource.
- A relation type: A string that defines the nature of the relationship.
- Optional target attributes: Additional key-value pairs that further describe the link or the target resource (e.g., mediaType, title, modified).

Metadata distinguishes between resources and their representations, allowing for multiple media types where applicable. For containers, metadata includes membership details and supports pagination to handle large sets efficiently. For DataResources, metadata includes representations, each with mediaType and optional sizeInBytes.

**The Linkset Resource**
For resources with extensive metadata, an LWS server MUST expose the complete set of links in a separate linkset resource, as defined in [RFC 9264](https://www.rfc-editor.org/rfc/rfc9264.html). A resource's linkset is discovered via a Link header with the relation type linkset. A server MUST have one and only one linkset. The linkset resource itself contains a serialized representation of all links.

A linkset resource MUST be available with the `application/linkset+json` media type as defined in [[RFC9264]]. Other serializations MAY be supported via content negotiation.

The 'linkset' link MUST point to a server-managed resource with a fixed media type (application/linkset+json or application/linkset), and servers MUST ensure its integrity upon operations like deletions or ACL changes on related resources. For example, if a client attempts to redirect 'linkset' to an arbitrary resource, the server MUST reject this to avoid risks such as dangling links or authorization discrepancies. Clients SHOULD NOT attempt such redirections, as this specification does not define their behavior, and support is OPTIONAL at the server's discretion. Updates to the linkset MUST be atomic with associated resource operations to maintain consistency.

**Discovering Metadata**
Clients discover a resource's metadata primarily through Link headers returned in response to GET or HEAD requests on the resource's URI. To enhance discoverability, servers MUST support a Link header with rel="storageDescription" on relevant responses, such as 401 Unauthorized, and include a WWW-Authenticate header with parameters directing to the storage metadata. This aligns with self-descriptive principles and avoids hardcoded URI locations.

To manage response verbosity, servers SHOULD support the Prefer header [RFC 7240](https://www.rfc-editor.org/rfc/rfc7240.html). A client can request the inclusion of descriptive metadata links by sending a Prefer header with the include preference. For LWS, the following preference tokens are defined:
- https://www.w3.org/ns/lws#linkfilter - limits properties that are returned as a link header only. If no linkfilter is specified, all properties are returned as link headers.
- https://www.w3.org/ns/lws#linksetfilter - limits properties that are returned in the linkset only. If no linksetfilter is specified, all properties are returned in the linkset document.

To provide finer-grained control over the response payload, the include preference MAY be parameterized with a "rels" parameter and/or an "attrs" parameter. The "rels" parameter specifies a space-separated, case-sensitive string of link relation types to filter which links are included in the response. The "attrs" parameter specifies a space-separated, case-sensitive string of link attribute names to control which attributes of the selected links are returned. If the "rels" parameter is provided, only links matching the specified relation types are included; if omitted, all applicable links are considered. If the "attrs" parameter is provided, only the specified attributes are returned for the selected links; if omitted, all available attributes are included. Servers MUST always include the target URI (href) for each link, regardless of the parameters specified. If neither parameter is provided, all applicable links and their attributes are returned.

A client MAY supply multiple include preferences in a single Prefer header by separating them with a space. This allows for the retrieval of metadata from multiple vocabularies in a single request. Any parameters, such as "prop", are scoped locally to the specific include preference they are attached to. For containers, responses MUST support pagination mechanics and include metadata fields such as resource IDs (MUST), types (array of system and user-defined), sizeInBytes (SHOULD for representations in DataResources), and timestamps (SHOULD), filtered by ACL visibility to ensure privacy.

**Metadata Types**
LWS defines three classes of metadata - system, core, and user. The terms listed in this section are defined at relevant vocabularies.

System-Managed - System-managed metadata is maintained by a LWS server and is read-only. A server MUST NOT allow users to manipulate this data. Mandatory fields include acl, linkset, partOf, type, and mediaType. Optional fields include sizeInBytes, modified, and publisher.
| item | defined by |
|------------|------------|
| acl | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| linkset | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| type | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| mediaType | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| https://www.w3.org/ns/lws#sizeInBytes | [lws](https://www.w3.org/ns/lws#) |
| http://purl.org/dc/terms/modified | [dcterms](http://purl.org/dc/terms/) |
| http://purl.org/dc/terms/publisher | [dcterms](http://purl.org/dc/terms/) |

Clients SHOULD NOT attempt to modify, add, or delete server-managed links, such as those with relation types 'acl' or 'linkset', as these are read-only and maintained exclusively by the server. Attempts to do so may result in errors or undefined behavior. Servers MAY choose to support such operations in limited scenarios, but this specification does not define their semantics or outcomes; clients MUST NOT rely on such support for interoperability.

To mitigate risks associated with server-managed links, clients MUST handle cases where links become inaccessible or inconsistent gracefully, such as by falling back to default behaviors or retrying discovery. For example, altering the 'linkset' link could lead to dangling references, media-type mismatches, or access control discrepancies. Similarly, modifications to the 'acl' link could compromise security if not strictly prohibited.

Core Metadata - Core metadata MAY include optional fields such as label, schema, and storage.
| item | defined by |
|------------|------------|
| partOf | [lws](https://www.w3.org/ns/lws#) |
| contains | [lws](https://www.w3.org/ns/lws#) |
| type | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| http://purl.org/dc/elements/1.1/title | [dcelements](http://purl.org/dc/elements/1.1/) |
| http://purl.org/dc/elements/1.1/creator | [dcelements](http://purl.org/dc/elements/1.1/) |
| label | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| schema | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| storage | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |

**Modifiability Considerations**
Core metadata, such as 'partOf', 'contains', 'type', 'title', and 'creator', MAY be modified by clients via PUT or PATCH operations on the associated linkset resource. However, servers MAY impose restrictions on certain core links to maintain system integrity. For instance, modifying the 'partOf' or 'contains' link to 'move' a resource is OPTIONAL for server implementations, as it may involve complex operations like updating slash-based semantics or decoupling containment meanings. Clients SHOULD NOT assume universal support for such changes and MUST handle server rejections. Servers that do not support modifications to 'partOf' MUST document this in their conformance statements. Metadata lifecycles are tied to the described resource, with automatic deletion upon resource removal.

User-Defined Metadata
Users MAY create or add additional metadata using existing or custom vocabularies, including user-defined types and indexes.

**Managing Metadata**
Metadata is managed by modifying a resource's associated linkset resource using PUT or PATCH operations. Servers MUST support concurrency controls for updates.

Replacing Metadata (PUT): A client can replace the entire set of metadata links by sending a PUT request to the linkset URI with a complete linkset document in the body.

Partially Updating Metadata (PATCH): A client can add, remove, or modify individual links by sending a PATCH request to the linkset URI. LWS servers SHOULD support a standard patch format, such as JSON Merge Patch [RFC 7396](https://www.rfc-editor.org/rfc/rfc7396.html) (application/merge-patch+json). Servers MAY support SPARQL Update for RDF-based partial updates to enhance flexibility for complex modifications.