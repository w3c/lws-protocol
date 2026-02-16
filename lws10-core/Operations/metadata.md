### Metadata
This section defines the model for associating metadata with LWS resources. The LWS metadata system is based on the principles of Web Linking [[!RFC8288]], which allows servers to describe the relationships between resources using typed links. Metadata enhances discoverability, supports self-descriptive APIs, and aligns with resource operations, and container hierarchies.

**Metadata Model**
All metadata in LWS is expressed as a set of typed links originating from a resource (the link context). Each link consists of:
- A link target: A URI identifying the related resource.
- A relation type: A string that defines the nature of the relationship.
- Optional target attributes: Additional key-value pairs that further describe the link or the target resource.

Metadata distinguishes between resources and their representations, allowing for multiple media types where applicable. For containers, metadata includes membership details and supports pagination to handle large sets efficiently. For DataResources, metadata includes representations, each with mediaType and optional sizeInBytes.

**The Linkset Resource**
For each resource in storage, a server MUST make metadata links available as a standalone resource according to [[!RFC9264]].
- Discovery: A resource's linkset is discoverable via a Link header with the relation rel="linkset".
- Media Type: A linkset resource MUST be available as application/linkset+json.
- Integrity: The 'linkset' link MUST point to a server-managed resource. Updates to the linkset MUST be atomic with associated resource operations to maintain consistency.

**Discovering Metadata**
Clients discover metadata primarily through Link headers in response to GET or HEAD requests.
- Storage Description: Servers MUST support a Link header with rel="storageDescription" on relevant responses.
- Preferences: Clients MAY use the Prefer header [[!RFC7240]] with the URI https://www.w3.org/ns/lws#PreferLinkRelations to include or omit specific relations.

**Metadata Types**

| Category | Description |
|------------|------------|
| System Managed | Maintained by the server; Read-Only. Includes acl, linkset, type, representation, sizeInBytes, modified. |
| Core Metadata | Managed by the client (subject to server restrictions). Includes partOf, contains, title, creator. |
| User-Defined | Custom vocabularies and indexes created by the user. |


**Modifiability Considerations**
Core metadata MAY be modified by clients. To ensure interoperability, servers MUST use standard HTTP headers to advertise their capabilities:

1. Method Discovery: Servers MUST advertise support for GET and PATCH operations on the linkset resource via the Allow header.

2. Patch Format Discovery: Servers MUST advertise support for JSON Merge Patch [[!RFC7386]] via the Accept-Patch header: Accept-Patch: application/merge-patch+json.

3. Optional Methods: Servers MAY support PUT or alternative patch formats; if supported, these MUST be included in the Allow and Accept-Patch headers respectively.

[!IMPORTANT] Clients SHOULD NOT assume support for PUT or specific patch formats unless they are advertised in the resource headers and MUST handle 405 Method Not Allowed or 415 Unsupported Media Type responses gracefully.

**Managing Metadata**
Metadata is managed by interacting with the resource's associated linkset URI. Servers MUST support concurrency controls for updates.

- Partial Updates (PATCH): This is the primary mechanism for metadata management. Servers MUST support PATCH using application/merge-patch+json.

- Replacement (PUT): If advertised in the Allow header, a client MAY replace the entire linkset. If the server does not support PUT, it MUST reject the request with 405 Method Not Allowed.

- Restrictions: Servers MAY restrict modifications to specific links (like partOf or contains) to maintain system integrity. If a server restricts partOf modifications, it MUST document this in its conformance statement.

- Lifecycle: Metadata lifecycles are tied to the described resource; deleting a resource MUST result in the automatic removal of its associated linkset metadata.