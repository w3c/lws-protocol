### Create Resource (HTTP POST)
New resources are created using POST to a target container URI, with the server assigning the final identifier. Clients MAY suggest a name via the Slug header. Clients MAY provide initial user-managed metadata for the new resource by including one or more Link headers in the POST request, following the syntax of Web Linking in [[RFC8288]]. Server-managed metadata MUST be generated automatically by the server upon creation and MUST NOT be overridden by client-provided links.
On success, return the 201 status code with the new URI in the Location header. The server MUST include Link headers for key server-managed metadata, such as a link to the parent container (rel="partOf"), a link to the ACL resource (rel="acl"), and a link to its dedicated linkset resource (rel="linkset"; type="application/linkset+json"). Additional links SHOULD include rel="type" (indicating Container or DataResource) and rel="mediaType" if applicable. The body MAY be empty or include a minimal representation of the resource. All metadata creation and linking MUST be atomic with the resource creation to maintain consistency.
**POST (to a container URI)** – *Create with server-assigned name:*
Use POST to add a new resource inside an existing container. The server assigns an identifier to the resource, optionally suggested via the Slug header. The server MAY honor the Slug header if it does not conflict with naming rules or existing resources. A client sends the request to the container's URI with a Content-Type header indicating the media type of the new resource. 
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
In this example, the client is posting to the container `/alice/notes/`. It provides `text/plain` content (a grocery list) and suggests the name `shoppinglist.txt` for the new resource. If `/alice/notes/` exists and the client is authorized, the server will create a new resource, generate associated metadata, and link it via the linkset.
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
Preference-Applied: ...
Content-Length: 0
```
On success, return 201 Created with the new URI in the Location header. The body may be empty or a minimal representation. Include relevant headers like ETag for concurrency control and Content-Type matching the created resource; Content-Length: 0 indicates no body. Servers MUST support concurrency via ETags in subsequent operations.
If the target container `/alice/notes/` does not exist, the server MUST return an error (HTTP 404 Not Found) because the location to create the resource is invalid. If the client is not authorized to write to that container, the server returns 403 Forbidden. If the request violates any server constraints, the server SHOULD return 400 Bad Request or 507 Insufficient Storage, with a description of the issue in the body if appropriate.
**Creating Containers:** To create a new container via the REST API, a client uses POST to an existing parent container, typically with no body or a Content-Type indicating an empty resource. The server MUST support creation of empty containers. For example:
```
POST /alice/ HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Slug: notes
```
This would create a new container at `/alice/notes/`, with server-generated metadata including rel="type" as https://www.w3.org/ns/lws#Container.
**Additional notes on Create (HTTP binding):**
* POST is not idempotent. Repeating it may create duplicates; clients SHOULD avoid unintentional retries or use unique identifiers/checks to prevent this.
* Servers MUST distinguish between DataResource and Container types in metadata upon creation, based on the request.
* Metadata updates are atomic; servers MUST ensure the linkset resource is created and populated with mandatory server-managed fields before returning success.
* Clients MAY request content negotiation via Accept headers, but for creation responses, servers SHOULD default to minimal or no body unless specified.
* For discoverability, servers SHOULD include WWW-Authenticate headers on 401 responses with parameters like storageDescription to guide clients without hardcoded URIs.
**Managing and Retrieving Metadata (Related to Creation):**
While metadata is primarily retrieved via read operations (Section 9.3), it is generated during creation. Clients can immediately retrieve it post-creation using GET or HEAD on the new resource URI. As described in Section 9.1, clients can use the Prefer header to request inclusion of specific metadata links (via relation types) and attributes.
Example (GET a newly created resource with specific metadata relations):
The client requests only the linkset, acl, and partOf relations, with all available attributes.
```
GET /alice/notes/shoppinglist.txt HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Prefer: include="http://www.w3.org/ns/lws#linkfilter"; rels="linkset acl partOf"
```
Expected response (showing only the specified relations, with all available attributes such as "href", "rel", "type", and mandatory fields):
```
HTTP/1.1 200 OK
ETag: "abc123456"
Link: </alice/notes/shoppinglist.txt.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/notes/shoppinglist.txt.acl>; rel="acl"
Link: </alice/notes/>; rel="partOf"
Preference-Applied: include="http://www.w3.org/ns/lws#linkfilter"; rels="linkset acl partOf"
... (response body) ...
```
Example (GET a resource with specific attributes across all links):
The client requests all links but only the "rel" and "type" attributes for them.
```
GET /alice/notes/shoppinglist.txt HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Prefer: include="http://www.w3.org/ns/lws#linkfilter"; attrs="rel type"
```
Expected response (all links included, but only with the specified "rel" and "type" attributes, plus the mandatory "href"):
```
HTTP/1.1 200 OK
ETag: "abc123456"
Link: </alice/notes/shoppinglist.txt.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/notes/shoppinglist.txt.acl>; rel="acl"
Link: </alice/notes/>; rel="partOf"
Link: <https://www.w3.org/ns/lws#DataResource>; rel="type"
Preference-Applied: include="http://www.w3.org/ns/lws#linkfilter"; attrs="rel type"
... (response body) ...
```
Example (GET a linkset resource with specific attributes):
If the client then requests the linkset resource itself, it can apply a similar preference (using the linksetfilter directive) to shape the JSON response, for instance by specifying attributes. Servers SHOULD support JSON-LD framing for linkset responses with a normative context.
```
GET /alice/notes/shoppinglist.txt.meta HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Accept: application/linkset+json
Prefer: include="http://www.w3.org/ns/lws#linksetfilter"; attrs="rel type"
```
Expected response (all links included, but only with the specified "rel" and "type" attributes, plus the mandatory "href"):
```
HTTP/1.1 200 OK
Content-Type: application/linkset+json
ETag: "meta-etag-111"
Preference-Applied: include="http://www.w3.org/ns/lws#linksetfilter"; attrs="rel type"
{
  "linkset": [
    {
      "href": "/alice/notes/shoppinglist.txt.acl",
      "rel": "acl"
    },
    {
      "href": "/alice/notes/",
      "rel": "partOf",
      "type": "application/ld+json"
    },
    {
      "href": "https://www.w3.org/ns/lws#DataResource",
      "rel": "type"
    }
  ]
}
```
In this response, the link for rel="acl" does not include a type attribute because it was not present on the server for that link, while the other links include type because it was requested and available. This allows clients to reduce bandwidth and processing load by fetching only the metadata relations and attributes they require. Clients MAY combine "rels" and "attrs" in a single Prefer header for more targeted filtering, such as rels="acl partOf" attrs="rel type", in which case the server applies the relation filter first and then restricts attributes on the resulting links. For privacy, unauthorized metadata fields MUST not disclose resource existence.