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

New resources are created using POST to a target container URI, with the server assigning the final identifier. Clients MAY suggest a name via the `Slug` header. Clients MAY provide initial user-managed metadata for the new resource by including one or more `Link` headers in the POST request, following the syntax of Web Linking in [[RFC8288]]. Server-managed metadata MUST be generated automatically by the server upon creation and MUST NOT be overridden by client-provided links.

On success, return the 201 status code with the new URI in the `Location` header. The server MUST include `Link` headers for key server-managed metadata, such as a link to the parent container (`rel="up"`), a link to the ACL resource (`rel="acl"`), and a link to its dedicated linkset resource (`rel="linkset"; type="application/linkset+json"`). Additional links SHOULD include `rel="type"` (indicating `Container` or `DataResource`). The body MAY be empty or include a minimal representation of the resource. All metadata creation and linking MUST be atomic with the resource creation to maintain consistency.

**POST (to a container URI)** – *Create with server-assigned name:*
Use POST to add a new resource inside an existing container. The server assigns an identifier to the resource, optionally suggested via the `Slug` header. The server MAY honor the Slug header if it does not conflict with naming rules or existing resources. Clients indicate the type of resource to create as follows:

- To create a **Container**, the client MUST include a `Link` header with `rel="type"` pointing to the Container type: `Link: <https://www.w3.org/ns/lws#Container>; rel="type"`.
- To create a **DataResource**, the client includes the resource content in the request body with the appropriate `Content-Type` header.

**Example (POST to create a new data resource):**
```
POST /alice/notes/ HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Content-Type: text/plain
Content-Length: 47
Slug: shoppinglist.txt

milk
eggs
bread
butter
apples
orange juice
```
In this example, the client is posting to the container `/alice/notes/`. It provides `text/plain` content (a grocery list) and suggests the name `shoppinglist.txt` for the new resource. If `/alice/notes/` exists and the client is authorized, the server will create a new DataResource and add it to the container's membership.

**Example (Response to POST — data resource):**
```
HTTP/1.1 201 Created
Location: /alice/notes/shoppinglist.txt
Content-Type: text/plain; charset=UTF-8
ETag: "def789012"
Link: </alice/notes/shoppinglist.txt.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/notes/>; rel="up"
Link: </alice/notes/shoppinglist.txt.acl>; rel="acl"
Link: <https://www.w3.org/ns/lws#DataResource>; rel="type"
Content-Length: 0
```
On success, return 201 Created with the new URI in the `Location` header. The body may be empty or a minimal representation. Server responses MUST use entity tags for responses that contain resource representations or successful responses to HEAD requests, enabling concurrency control in subsequent operations.
If the target container `/alice/notes/` does not exist, the server MUST return a 404 error status unless another status code is more appropriate.

**Creating Containers:** To create a new container, a client uses POST to an existing parent container with a `Link` header indicating the Container type. For example:
```
POST /alice/ HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Content-Length: 0
Slug: notes
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
```

**Example (Response to POST — container):**
```
HTTP/1.1 201 Created
Location: /alice/notes/
ETag: "container-new-123"
Link: </alice/notes/.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/>; rel="up"
Link: </alice/notes/.acl>; rel="acl"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
Content-Length: 0
```
This creates a new container at `/alice/notes/`, with server-generated metadata including `rel="type"` as `https://www.w3.org/ns/lws#Container`.

**Additional notes on Create (HTTP binding):**
* POST is not idempotent. Repeating it may create duplicates; clients SHOULD avoid unintentional retries or use unique identifiers/checks to prevent this.
* Metadata updates are atomic; servers MUST ensure the linkset resource is created and populated with mandatory server-managed fields before returning success.
* For discoverability, servers SHOULD include a `Link` header with `rel="storageDescription"` on 401 responses to guide clients without hardcoded URIs.

**Managing and Retrieving Metadata (Related to Creation):**
While metadata is primarily retrieved via read operations, it is generated during creation. Clients can immediately retrieve it post-creation using GET or HEAD on the new resource URI. Clients can use the `Prefer` header to request inclusion of specific metadata links (via relation types) and attributes.
