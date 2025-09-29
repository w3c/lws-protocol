### Metadata

This section defines the model for associating metadata with LWS resources. The LWS metadata system is based on the principles of Web Linking [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288.html), which allows servers to describe the relationships between resources using typed links.

**Metadata Model**

All metadata in LWS is expressed as a set of typed links originating from a resource (the link context). Each link consists of:

A link target: A URI identifying the related resource.

A relation type: A string that defines the nature of the relationship (e.g., acl, describedby, license).

Optional target attributes: Additional key-value pairs that further describe the link or the target resource (e.g., type, hreflang, title).

**The Linkset Resource**

For resources with extensive metadata, an LWS server MUST expose the complete set of links in a separate linkset resource, as defined in [RFC 9264](https://www.rfc-editor.org/rfc/rfc9264.html). A resource's linkset is discovered via a Link header with the relation type linkset. A server MUST have one and only one linkset.  The linkset resource itself contains a serialized representation of all links.
[RFC 9264](https://www.rfc-editor.org/rfc/rfc9264.html) does not require any specific format for the linkset document.  It only suggests and defines two formats.  For LWS, server MUST support application/linkset+json linkset serialization.  A LWS server MAY implement application/linkset.

The 'linkset' link MUST point to a server-managed resource with a fixed media type (application/linkset+json or application/linkset), and servers MUST ensure its integrity upon operations like deletions or ACL changes on related resources. For example, if a client attempts to redirect 'linkset' to an arbitrary resource, the server MUST reject this to avoid risks such as dangling links or authorization discrepancies. Clients SHOULD NOT attempt such redirections, as this specification does not define their behavior, and support is OPTIONAL at the server's discretion.

**Discovering Metadata**

Clients discover a resource's metadata primarily through Link headers returned in response to GET or HEAD requests on the resource's URI.

To manage response verbosity, servers SHOULD support the Prefer header [RFC 7240](https://www.rfc-editor.org/rfc/rfc7240.html). A client can request the inclusion of descriptive metadata links by sending a Prefer header with the include preference. For LWS, the following preference tokens are defined:

https://www.w3.org/ns/lws#linkfilter - limits properties that are returned as a link header only. If no linkfilter is specified, all properties are returned as link headers.
https://www.w3.org/ns/lws#linksetfilter - limits properties that are returned in the linkset only.  If no linksetfilter is specified, all properties are returned in the linkset document.

To provide finer-grained control over the response payload, the include preference MAY be parameterized with a "rels" parameter and/or an "attrs" parameter. The "rels" parameter specifies a space-separated, case-sensitive string of link relation types to filter which links are included in the response (e.g., "acl up" to include only links with those "rel" values). The "attrs" parameter specifies a space-separated, case-sensitive string of link attribute names to control which fields of the selected links are returned (e.g., "rel type title"). If the "rels" parameter is provided, only links matching the specified relation types are included; if omitted, all applicable links are considered. If the "attrs" parameter is provided, only the specified fields are returned for the selected links; if omitted, all available attributes are included. Servers MUST always include the target URI (href) for each link, regardless of the parameters specified. If neither parameter is provided, all applicable links and their attributes are returned.

A client MAY supply multiple include preferences in a single Prefer header by separating them with a space. This allows for the retrieval of metadata from multiple vocabularies in a single request. Any parameters, such as "prop", are scoped locally to the specific include preference they are attached to.

**Metadata Types**

LWS defines three classes of metadata - system, core, and user.  The terms listed in this section are defined at .

System-Managed - System-managed metadata is maintained by a LWS server and is real-only.  A server MUST NOT allow users to manipulate this data.

| item       | defined by |
|------------|------------|
| acl |   [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| linkset | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| http://www.w3.org/ns/posix/stat/size | [stat](http://www.w3.org/ns/posix/stat) |
| http://www.w3.org/ns/posix/stat/mtime | [stat](http://www.w3.org/ns/posix/stat) |
| http://purl.org/dc/terms/modified | [dcterms](http://purl.org/dc/terms/) |
| http://purl.org/dc/terms/publisher | [dcterms](http://purl.org/dc/terms/) |

Clients SHOULD NOT attempt to modify, add, or delete server-managed links, such as those with relation types 'acl' or 'linkset', as these are read-only and maintained exclusively by the server. Attempts to do so may result in errors (e.g., 403 Forbidden or 405 Method Not Allowed) or undefined behavior. Servers MAY choose to support such operations in limited scenarios (e.g., for advanced administrative use cases), but this specification does not define their semantics or outcomes; clients MUST NOT rely on such support for interoperability.
To mitigate risks associated with server-managed links, clients MUST handle cases where links become inaccessible or inconsistent gracefully, such as by falling back to default behaviors or retrying discovery. For example, altering the 'linkset' link could lead to dangling references (e.g., if the target resource is deleted), media-type mismatches (e.g., if non-linkset content is uploaded), or access control discrepancies (e.g., if the linkset's ACL differs from the resource's). Similarly, modifications to the 'acl' link could compromise security if not strictly prohibited.

Core Metadata

| item       | defined by |
|------------|------------|
| up | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| item | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| type | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| http://purl.org/dc/elements/1.1/title | [DCELEMENTS](http://purl.org/dc/elements/1.1/) |
| http://purl.org/dc/elements/1.1/creator | [DCELEMENTS](http://purl.org/dc/elements/1.1/) |

**Modifiability Considerations**

Core metadata, such as 'up', 'item', 'type', 'title', and 'creator', MAY be modified by clients via PUT or PATCH operations on the associated linkset resource. However, servers MAY impose restrictions on certain core links to maintain system integrity. For instance, modifying the 'up' link to 'move' a resource (e.g., altering its containment hierarchy) is OPTIONAL for server implementations, as it may involve complex operations like updating slash-based semantics or decoupling containment meanings (e.g., logical vs. physical hierarchy). Clients SHOULD NOT assume universal support for such changes and MUST handle server rejections (e.g., 501 Not Implemented or 403 Forbidden). Servers that do not support modifications to 'up' MUST document this in their conformance statements.

User Defined

Users MAY create or add additional metadata using existing or custom vocabularies.

**Managing Metadata**

Metadata is managed by modifying a resource's associated linkset resource using PUT or PATCH operations.

Replacing Metadata (PUT): A client can replace the entire set of metadata links by sending a PUT request to the linkset URI with a complete linkset document in the body.

Partially Updating Metadata (PATCH): A client can add, remove, or modify individual links by sending a PATCH request to the linkset URI. LWS servers SHOULD support a standard patch format, such as JSON Merge Patch [RFC 7396](https://www.rfc-editor.org/rfc/rfc7396.html) (application/merge-patch+json).

