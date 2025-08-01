### Create Resource (HTTP POST)
New resources are created using POST to a target container URI, with the server assigning the final identifier. Clients MAY suggest a name via the Slug header. Clients MAY provide initial user-managed metadata for the new resource by including one or more Link headers in the POST request, following the syntax of Web Linking in [[RFC8288]]. Server-managed metadata MUST be generated automatically by the server upon creation and MUST NOT be overridden by client-provided links.
On success, return the 201 status code with the new URI in the Location header. The server MUST include Link headers for key server-managed metadata, such as a link to the parent container (rel="partOf"), a link to the ACL resource (rel="acl"), and a link to its dedicated linkset resource (rel="linkset"; type="application/linkset+json"). Additional links SHOULD include rel="type" (indicating Container or DataResource) and rel="mediaType" if applicable. The body MAY be empty or include a minimal representation of the resource. All metadata creation and linking MUST be atomic with the resource creation to maintain consistency.

**POST (to a container URI)** – *Create with server-assigned name:*
Use POST to add a new resource inside an existing container. The server assigns an identifier to the resource, optionally suggested via the Slug header. The server MAY honor the Slug header if it does not conflict with naming rules or existing resources. Clients MUST include a Content-Type header in the request to indicate the media type of the new resource, enabling the server to distinguish between resource types. Specifically, servers MUST interpret the Content-Type as follows: if it matches the LWS-defined media type for containers (application/lws+json), the server creates a Container; otherwise, it creates a DataResource with the specified media type.

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
In this example, the client is posting to the container `/alice/notes/`. It provides `text/plain` content (a grocery list) and suggests the name `shoppinglist.txt` for the new resource. If `/alice/notes/` exists and the client is authorized, the server will create a new DataResource (based on the Content-Type), generate associated metadata, and link it via the linkset.

**Example (Response to POST):**
```
HTTP/1.1 201 Created
Location: /alice/notes/shoppinglist.txt
Content-Type: text/plain; charset=UTF-8
ETag: "def789012"
Link: </alice/notes/shoppinglist.txt.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/notes/>; rel="partOf"
Link: </alice/notes/shoppinglist.txt.acl>; rel="acl"
Link: <https://www.w3.org/ns/lws#DataResource>; rel="type"
Content-Length: 0
```
On success, return 201 Created with the new URI in the Location header. The body may be empty or a minimal representation. Include relevant headers such as Content-Type matching the created resource; Content-Length: 0 indicates no body. Server responses MUST use entity tags for responses that contain resource representations or successful responses to HEAD requests, enabling concurrency control in subsequent operations.
If the target container `/alice/notes/` does not exist, the server MUST return a 404 error status unless another status code is more appropriate.

**Creating Containers:** To create a new container via the REST API, a client uses POST to an existing parent container, with the Content-Type header set to the LWS-defined media type `application/lws+json` to indicate container creation. The body MAY be empty. Servers MUST support creation of containers using this media type. For example:
```
POST /alice/ HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Content-Type: application/lws+json
Content-Length: 0
Slug: notes
```
This would create a new container at `/alice/notes/`, with server-generated metadata including rel="type" as https://www.w3.org/ns/lws#Container.

**Additional notes on Create (HTTP binding):**
* POST is not idempotent. Repeating it may create duplicates; clients SHOULD avoid unintentional retries or use unique identifiers/checks to prevent this.
* Servers MUST distinguish between DataResource and Container types in metadata upon creation, based on the Content-Type header in the request.
* Metadata updates are atomic; servers MUST ensure the linkset resource is created and populated with mandatory server-managed fields before returning success.
* For discoverability, servers SHOULD include a Link header with rel="storageDescription" on 401 responses to guide clients without hardcoded URIs.

**Managing and Retrieving Metadata (Related to Creation):**
While metadata is primarily retrieved via read operations (Section 9.3), it is generated during creation. Clients can immediately retrieve it post-creation using GET or HEAD on the new resource URI. As described in Section 9.1, clients can use the Prefer header to request inclusion of specific metadata links (via relation types) and attributes.
