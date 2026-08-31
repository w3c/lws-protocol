The **create resource** operation adds a new [served resource](#dfn-served-resource) to an existing <a>container</a>. This operation handles both the creation of <a>data resources</a> and sub-containers.

**Inputs:**

* **Target container:** The identifier of the <a>container</a> where the new resource will be created.
* **Identity hint:** An optional suggestion for the new resource's identifier. The server may use this hint but is not required to.
* **Content:** The initial content and type for the new resource.

**Behavior:**

* **Identity generation:** The server determines the final identifier (URI) for the new resource. If an identity hint was provided, the server attempts to incorporate it while ensuring uniqueness and validity within the <a>container</a>. If no hint is provided, the server generates a unique identifier. An identity hint is a suggested identifier, not a <a>containment</a> path. The server MUST NOT create intermediate <a>containers</a> in order to honor an identity hint.
* **Container membership update:** The server atomically adds the new resource to the membership listing of the target <a>container</a>.
* **Metadata initialization:** The server initializes system metadata for the new resource. If the resource has an associated <a>metadata resource</a> it is also initialized.

**Possible Responses:**

* <strong id="dfn-created">Created:</strong> The operation succeeded. The server returns the final identifier of the newly created resource.
* <strong id="dfn-target-not-found">Target Not Found:</strong> The specified target <a>container</a> does not exist.
* **Not Permitted:** The client's identity is known, but they do not have permission to create resources in this <a>container</a>.
* **Unknown Requester:** The server does not recognize the client's identity and requires authentication.
* **Conflict:** A resource with the generated identifier already exists, or there is another state conflict.
* **Unknown Error:** An unexpected internal error occurred.

New resources are created using POST to a target <a>container</a> URI, with the server assigning the final identifier. Clients MAY provide initial user-managed metadata for the new resource by including one or more `Link` headers in the POST request, following the syntax of Web Linking in [[RFC8288]]. Server-managed metadata MUST be generated automatically by the server upon creation and MUST NOT be overridden by client-provided links.

On success, the server MUST return the 201 status code with the new URI in the `Location` header. The server MUST include `Link` headers for key server-managed metadata, including a link to the parent <a>container</a> (`rel="up"`), and a link to the created resource's dedicated <a>linkset resource</a> (`rel="linkset"; type="application/linkset+json"`). Additional links SHOULD include `rel="type"` (indicating `https://www.w3.org/ns/lws#Container` or `https://www.w3.org/ns/lws#DataResource`). The body MAY be empty or include a minimal representation of the resource. All metadata creation and linking MUST be atomic with the resource creation to maintain consistency.

The server MUST NOT create missing ancestor <a>containers</a> as a side effect of this operation. <a>Containment</a> is expressed by `rel="up"` links and <a>container</a> membership, not by URI path structure.

If the client lacks authorization, the server MUST return 403 Forbidden (if the client's identity is known but permissions are insufficient) or 401 Unauthorized (if no valid authentication is provided). In cases where revealing resource existence poses a security risk, the server MAY return 404 Not Found instead.

If the request is authorized and the request-target does not identify an existing resource, the server MUST fail the operation with the [Target Not Found](#dfn-target-not-found) outcome. In the HTTP binding, this is 404 Not Found.

If the request is authorized and the request-target identifies an existing non-container resource, the server MUST reject the request with 405 Method Not Allowed.

**POST (to a container URI)** – *Create with server-assigned name:*
Use POST to add a new resource inside an existing <a>container</a>. The server assigns the identifier for the resource. Clients indicate the type of resource to create as follows:

- To create a **<a>Container</a>**, the client MUST include a `Link` header with `rel="type"` pointing to the Container type: `Link: <https://www.w3.org/ns/lws#Container>; rel="type"`.
- To create a **<a>Data resource</a>**, the client includes the resource content in the request body with the appropriate `Content-Type` header.

**Example (POST to create a new data resource):**
```
POST /alice/notes/ HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Content-Type: text/plain
Content-Length: 47

milk
eggs
bread
butter
apples
orange juice
```
In this example, the client is posting to the <a>container</a> `/alice/notes/`. It provides `text/plain` content (a grocery list) and suggests the name `shoppinglist.txt` for the new resource. If `/alice/notes/` exists and the client is authorized, the server will create a new <a>data resource</a> and add it to the <a>container</a>'s membership.

**Example (Response to POST — Data Resource):**
```
HTTP/1.1 201 Created
Location: /alice/notes/shoppinglist.txt
Content-Type: text/plain; charset=UTF-8
Link: </alice/notes/shoppinglist.txt.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/notes/>; rel="up"
Link: <https://www.w3.org/ns/lws#DataResource>; rel="type"
Content-Length: 0
```
On success, the response is 201 Created with the new URI in the `Location` header. The body may be empty or a minimal representation.

**Example (POST to a non-existent container):**
```
POST /alice/notes/ HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Content-Type: text/plain
Content-Length: 4

test
```
If the client is authorized and `/alice/notes/` does not exist, the server responds with 404 Not Found:
```
HTTP/1.1 404 Not Found
```

**Creating <a>Containers</a>:** To create a new <a>container</a>, a client uses POST to an existing parent <a>container</a> with a `Link` header indicating the Container type. For example:
```
POST /alice/ HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Content-Length: 0
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
```

**Example (Response to POST — container):**
```
HTTP/1.1 201 Created
Location: /alice/notes/
Link: </alice/notes/.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/>; rel="up"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
Content-Length: 0
```
This creates a new <a>container</a> at `/alice/notes/`, with server-generated metadata including `rel="type"` as `https://www.w3.org/ns/lws#Container`.

**Additional notes on Create (HTTP binding):**
* POST is not idempotent. Repeating it may create duplicates; clients SHOULD avoid unintentional retries or use unique identifiers/checks to prevent this.
* Metadata updates are atomic; servers MUST ensure the <a>linkset resource</a> is created and populated with mandatory server-managed fields before returning success.
* For discoverability, servers SHOULD include a `Link` header with `rel="https://www.w3.org/ns/lws#storage"` on 401 responses to guide clients without hardcoded URIs.

**Managing and Retrieving Metadata (Related to Creation):**
While metadata is primarily retrieved via read operations, it is generated during creation. Clients can immediately retrieve it post-creation using GET or HEAD on the new resource URI. Clients can use the `Prefer` header to request inclusion of specific metadata links (via relation types) and attributes.
