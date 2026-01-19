### Read Resource (HTTP GET / HEAD)
The read resource operation requests a resource representation with HTTP GET requests (and HEAD for header-only requests). The behavior differs depending on whether the target URL is a container or a non-container resource (DataResource). Servers MUST distinguish resource types via metadata. All responses MUST integrate with metadata as defined in Section 9.1, including Link headers for key relations such as rel="linkset", rel="acl", rel="partOf", and rel="type". Servers MUST ensure atomicity between the resource state and its metadata during reads.

**GET (non-container resource)** – *Retrieve a resource’s content:*
Send GET to the resource URI for full content (if authorized). Respond with 200 OK, body containing the data, and Content-Type matching the stored media type. Servers MUST support range requests per [[!RFC7233]] for partial retrieval. Responses MUST include an ETag header for concurrency control and caching.

**Example (GET a file):**
```
GET /alice/notes/shoppinglist.txt HTTP/1.1
Authorization: Bearer <token>
Accept: text/plain
```
This requests the content of `/alice/notes/shoppinglist.txt`, indicating that the client wants it in text form. Assuming the resource exists, is text, and the client has access:
```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=UTF-8
Content-Length: 34
ETag: "abc123456"
Link: </alice/notes/shoppinglist.txt.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/notes/>; rel="partOf"
Link: </alice/notes/shoppinglist.txt.acl>; rel="acl"
Link: <https://www.w3.org/ns/lws#DataResource>; rel="type"
milk
cheese
bread
guacamole
soda
chocolate bars
hash
eggs
```
The server returned the text content (34 bytes in total, as indicated by `Content-Length`). The content is exactly the stored data in the file. The `ETag: "abc123456"` is a version identifier for caching or concurrency purposes. The response includes Link headers for metadata discoverability, with mandatory fields such as partOf, acl, and type.

**GET (container resource)** – *List a container’s contents:*
When the target URI corresponds to a container (determined via metadata type), a GET request will return a listing of the container’s members rather than raw content. Servers MUST support pagination for large memberships, using query parameters or headers to return partial listings with links to subsequent pages, responding with 206 Partial Content for paginated responses. Listings MUST include metadata for each member: resource IDs (MUST), types as an array of system and user-defined (MUST), representations with mediaType and optional sizeInBytes (MUST for DataResources), modified timestamps (SHOULD).

**Example (GET a container with JSON-LD):**
```
GET /alice/notes/ HTTP/1.1
Authorization: Bearer <token>
Accept: application/ld+json
```
Assuming the container exists and the client has access:
```
HTTP/1.1 200 OK
Content-Type: application/ld+json; profile="https://www.w3.org/ns/lws/v1"
ETag: "container-etag-789"
Link: </alice/notes/.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/>; rel="partOf"
Link: </alice/notes/.acl>; rel="acl"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
{
  "@context": "https://www.w3.org/ns/lws/context/v1.jsonld",
  "@id": "/alice/notes/",
  "@type": "Container",
  "totalItems": 2,
  "first": {
    "@type": "ContainerPage",
    "@id": "/alice/notes/?page=1",
    "partOf": "/alice/notes/",
    "contains": [
      {
        "@id": "/alice/notes/1.txt",
        "@type": ["DataResource", "http://example.org/customType"],
        "representation": [
          {
            "mediaType": "text/plain",
            "sizeInBytes": 1024
          }
        ],
        "modified": "2025-11-24T12:00:00Z"
      },
      {
        "@id": "/alice/notes/2.txt",
        "@type": "DataResource",
        "representation": [
          {
            "mediaType": "text/plain",
            "sizeInBytes": 2048
          }
        ],
        "modified": "2025-11-24T13:00:00Z"
      }
    ]
  }
}
```
In this example, `/alice/notes/` is a container. The response uses JSON-LD with a normative context, listing members with required metadata. For large containers, the response might include a "next" property and use 206 Partial Content.
In all cases, the server MUST include the following metadata in the response headers: an ETag (representing the listing version, which changes on membership modifications), and Link headers with rel="type" indicating it is a container, rel="linkset", rel="partOf", and rel="acl".

**HEAD (any resource or container)** – *Headers/metadata only:*
The LWS server MUST support HEAD [[RFC9110]] for both containers and non-containers, returning the same headers as GET (including ETag, Content-Type, Link for metadata) but without a body. This enables metadata retrieval without transferring content.

**Caching and Conditional Requests:** LWS leverages HTTP caching semantics. Servers MUST support conditional requests via If-None-Match (with ETags) or If-Modified-Since headers. If the resource or container listing has not changed, respond with 304 Not Modified to avoid redundant transfers. ETags MUST be provided in all GET/HEAD responses for concurrency and caching support.

**Discoverability and Authorization:** For enhanced discoverability, servers SHOULD include WWW-Authenticate headers on 401 Unauthorized responses with parameters to guide clients without hardcoded URIs. Metadata links SHOULD be included where applicable.
