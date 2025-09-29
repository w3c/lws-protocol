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

**Discovering Metadata**

Clients discover a resource's metadata primarily through Link headers returned in response to GET or HEAD requests on the resource's URI.

To manage response verbosity, servers SHOULD support the Prefer header [RFC 7240](https://www.rfc-editor.org/rfc/rfc7240.html). A client can request the inclusion of descriptive metadata links by sending a Prefer header with the include preference. For LWS, the following preference token is defined: https://www.w3.org/ns/lws#linkfilter.

To provide finer-grained control over the response payload, the include preference MAY be parameterized with a fields parameter. The value of this parameter is a comma-separated, case-insensitive string of the link attribute names that the client wishes to receive (e.g., title, rel, type).

A client MAY supply multiple include preferences in a single Prefer header by separating them with a comma. This allows for the retrieval of metadata from multiple vocabularies in a single request. Each include preference is processed independently by the server. Any parameters, such as fields, are scoped locally to the specific include preference they are attached to.

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

Core Metadata

| item       | defined by |
|------------|------------|
| up | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| item | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| type | [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) |
| http://purl.org/dc/elements/1.1/title | [DCELEMENTS](http://purl.org/dc/elements/1.1/) |
| http://purl.org/dc/elements/1.1/creator | [DCELEMENTS](http://purl.org/dc/elements/1.1/) |

User Defined

Users MAY create or add additional metadata using existing or custom vocabularies.

**Managing Metadata**

Metadata is managed by modifying a resource's associated linkset resource using PUT or PATCH operations.

Replacing Metadata (PUT): A client can replace the entire set of metadata links by sending a PUT request to the linkset URI with a complete linkset document in the body.

Partially Updating Metadata (PATCH): A client can add, remove, or modify individual links by sending a PATCH request to the linkset URI. LWS servers SHOULD support a standard patch format, such as JSON Merge Patch [RFC 7396](https://www.rfc-editor.org/rfc/rfc7396.html) (application/merge-patch+json).

