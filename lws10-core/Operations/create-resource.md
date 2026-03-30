The **create resource** operation adds a new [served resource](#dfn-served-resource) to an existing [patron](#dfn-patron). This operation handles both the creation of contained resources and auxiliary resources.

**Inputs:**

* **Target patron:** The identifier of the patron where the new resource will be created either as an auxiliary member or as a contained member if the target is a container.
* **membership link:** The link from the new resource to the target patron. If the new resource is to be a contained member of the container patron, new resource is linked to the patron container via `rel="up"`.  If the new resource is to be a auxiliary member of the patron, new resource is linked to the patron via `rel="principal"`, and patron resource is linked to the new resource via the auxiliaryRel of the relation. 
* **Identity hint:** An optional suggestion for the new resource's identifier. The server may use this hint but is not required to.
* **Content:** The initial content and type for the new resource.

**Behavior:**

* **Identity generation:** The server determines the final identifier (URI) for the new resource. If an identity hint was provided, the server attempts to incorporate it while ensuring uniqueness and validity within the scope of the patron resource. If no hint is provided, the server generates a unique identifier.
* **Patron membership update:** The server atomically adds the new resource to the contained/auxiliary membership of the target patron by updating its manifest. It uses the provided membership links to determine the type of membership.
* **Metadata initialization:** The server initializes system metadata for the new resource. If the resource has an associated metadata resource it is also initialized.

**Possible Responses:**

* **Created:** The operation succeeded. The server returns the final identifier of the newly created resource.
* **Target Not Found:** The specified target container does not exist.
* **Not Permitted:** The client's identity is known, but they do not have permission to create resources in this container.
* **Unknown Requester:** The server does not recognize the client's identity and requires authentication.
* **Conflict:** A resource with the generated identifier already exists, or requested membership is not possible for the target patron (like creating contained member on non-containers, or creating auxiliary resource with already occupied auxiliaryRel, or requesting containment capability on the auxiliary resource to create, etc.), or there is another state conflict.
* **Unknown Error:** An unexpected internal error occurred.

New resources are created using POST to a target patron resource URI, with the server assigning the final identifier. Clients MAY suggest a name via the `Slug` header. Clients MAY provide initial user-managed metadata for the new resource by including one or more `Link` headers in the POST request, following the syntax of Web Linking in [[RFC8288]]. Server-managed metadata MUST be generated automatically by the server upon creation and MUST NOT be overridden by client-provided links. Server-managed auxiliary resources MUST be generated automatically by the server upon creation of a contained primary resource.

On success, the server MUST return the 201 status code with the new URI in the `Location` header. The server MUST include `Link` headers for key server-managed metadata, including a link to the patron (via `rel="up"` for contained, via `rel="principal"` for auxiliary), and links to the created resource's Server-managed auxiliary resources (`rel="linkset"; type="application/linkset+json"`). Additional links SHOULD include `rel="type"` (indicating `https://www.w3.org/ns/lws#Container`, `https://www.w3.org/ns/lws#Resource` ,etc). The body MAY be empty or include a minimal representation of the resource. All metadata creation and linking MUST be atomic with the resource creation to maintain consistency.

**POST (to a patron URI)** – *Create with server-assigned name:*
Use POST to add a new resource to an existing patron resource, either as an auxiliary member or contained member if the target is a container. The server assigns an identifier to the resource, optionally suggested via the `Slug` header. The server MAY honor the Slug header if it does not conflict with naming rules or existing resources.

Clients indicate the type of membership as follows:

- To create a **Contained member**, the client MUST include a `Link` header with `rel="up"` pointing to the target patron container.
- To create an **Auxiliary member**, the client MUST include a `Link` header with `rel="principal"` pointing to the target principal resource. The client MUST also include a `Link` header with the `anchor` parameter set to the target principal resource, `rel` value set to the required auxiliaryRel, pointing to the new resource to create using an empty URI reference `<>`.

Clients indicate the containment capability of the contained member resource to create as follows:

- To create a **Container**, the client MUST include a `Link` header with `rel="type"` pointing to the Container type: `Link: <https://www.w3.org/ns/lws#Container>; rel="type"`.

**Example (POST to create a new leaf resource):**
```
POST /alice/notes/ HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Content-Type: text/plain
Content-Length: 47
Slug: shoppinglist.txt
Link: </alice/notes/> rel="up"

milk
eggs
bread
butter
apples
orange juice
```
In this example, the client is posting to the container `/alice/notes/`. It provides `text/plain` content (a grocery list) and suggests the name `shoppinglist.txt` for the new resource. It provides membership link with `rel="up"` pointing to the current container, requesting to be a contained member. If `/alice/notes/` exists and the client is authorized, the server will create a new Resource and add it to the container's membership.

**Example (Response to POST — Leaf Resource):**
```
HTTP/1.1 201 Created
Location: /alice/notes/shoppinglist.txt
Content-Type: text/plain; charset=UTF-8
Link: </alice/notes/shoppinglist.txt.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/notes/shoppinglist.txt.manifest>; rel="manifest"; type="application/lws+json"
Link: </alice/notes/>; rel="up"
Link: <https://www.w3.org/ns/lws#Resource>; rel="type"
Content-Length: 0
```
On success, return 201 Created with the new URI in the `Location` header. The body may be empty or a minimal representation.
If the target container `/alice/notes/` does not exist, the server MUST return a 404 error status unless another status code is more appropriate.

**Creating Containers:** To create a new container, a client uses POST to an existing parent container with a `Link` header indicating the Container type, and another `Link` header indicating containement membership. For example:
```
POST /alice/ HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Content-Length: 0
Slug: notes
Link: </alice/> rel="up"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
```

**Example (Response to POST — container):**
```
HTTP/1.1 201 Created
Location: /alice/notes/
Link: </alice/notes/.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/notes/.manifest>; rel="manifest"; type="application/lws+json"
Link: </alice/>; rel="up"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
Content-Length: 0
```
This creates a new container at `/alice/notes/`, and its server-managed auxiliary resources like manifest and linkset, with server-generated metadata including `rel="type"` as `https://www.w3.org/ns/lws#Container`.

**Example (POST to create a new auxiliary member resource):**
```
POST /alice/notes/shoppinglist.txt HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Content-Type: text/turtle
Content-Length: 47
Slug: shoppinglist.txt.acl
Link: </alice/notes/shoppinglist.txt>; rel="principal"
Link: <>; rel="acl"; anchor="/alice/notes/shoppinglist.txt"

# This box contains an authorization graph
# It describes the conditions required for accessing a resource  

[]
  a acp:AccessControlResource ;
  acp:resource ex:resourceX ;
  acp:accessControl [
    a acp:AccessControl ;
    acp:apply [
      a acp:Policy ;
      acp:allow acl:Read ;
      acp:anyOf [
        a acp:Matcher ;
        acp:agent ex:Alice, ex:Bob ;
      ]
    ]
  ] .
```
In this example, the client is posting to the primary resource `/alice/notes/shoppinglist.txt`, to create an `acl` auxiliary resource. It provides `text/turtle` content (an authorization graph) and suggests the name `shoppinglist.txt.acl` for the new resource. It provides membership link with `rel="principal"` pointing to the principal resource, requesting to be an auxiliary member. It provides a link from the principal resource to the new resource with the `anchor` parameter set to the primary resource URI and the `rel="acl"`, pointing to the new resource to create using an empty URI reference `<>`. If `/alice/notes/shoppinglist.txt` exists and the client is authorized, the server will create a new Resource and add it to the primary resource's auxiliary membership.

**Example (Response to POST — Auxiliary Resource):**
```
HTTP/1.1 201 Created
Location: /alice/notes/shoppinglist.txt.acl
Content-Type: text/plain; charset=UTF-8
Link: </alice/notes/shoppinglist.txt>; rel="principal"
Link: <>; rel="acl"; anchor="/alice/notes/shoppinglist.txt"
Link: <https://www.w3.org/ns/lws#Resource>; rel="type"
Content-Length: 0
```
On success, return 201 Created with the new URI in the `Location` header. The body may be empty or a minimal representation.
If the target primary resource `/alice/notes/shoppinglist.txt` does not exist, the server MUST return a 404 error status unless another status code is more appropriate. If the target primary resource `/alice/notes/shoppinglist.txt` already has an auxiliary resource with auxiliaryRel `acl`, the server MUST return a 409 error status unless another status code is more appropriate.


**Additional notes on Create (HTTP binding):**
* POST is not idempotent. Repeating it may create duplicates; clients SHOULD avoid unintentional retries or use unique identifiers/checks to prevent this.
* Metadata updates are atomic; servers MUST ensure the linkset and manifest resources are created and populated with mandatory server-managed fields before returning success.
* For discoverability, servers SHOULD include a `Link` header with `rel="storageDescription"` on 401 responses to guide clients without hardcoded URIs.

**Managing and Retrieving Metadata (Related to Creation):**
While metadata is primarily retrieved via read operations, it is generated during creation. Clients can immediately retrieve it post-creation using GET or HEAD on the new resource URI. Clients can use the `Prefer` header to request inclusion of specific metadata links (via relation types) and attributes.
