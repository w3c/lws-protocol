Retrieves the representation of an existing resource or the listing of a container.

* **Inputs**: Target identifier and optional parameters.
* **Behavior**:
    * For non-container resources, the server returns the resource content.
    * For containers, the server returns a listing of member resources. Listings must include core metadata for each member and must be filtered based on the requester's permissions.
* **Outcome**: The requested representation or a notification of failure.

The read resource operation requests a resource representation with HTTP GET requests (and HEAD for header-only requests). The behavior differs depending on whether the target URL is a container or a non-container resource (DataResource). Servers MUST distinguish resource types via metadata. All responses MUST integrate with metadata as defined in Section 8.1, including Link headers for key relations such as `rel="linkset"`, `rel="acl"`, `rel="up"`, and `rel="type"`. Servers MUST ensure atomicity between the resource state and its metadata during reads.

**GET (non-container resource)** – *Retrieve a resource's content:*
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
Link: </alice/notes/>; rel="up"
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
The server returned the text content (34 bytes in total, as indicated by `Content-Length`). The content is exactly the stored data in the file. The `ETag: "abc123456"` is a version identifier for caching or concurrency purposes. The response includes Link headers for metadata discoverability, with mandatory fields such as `up`, `acl`, and `type`.

**GET (container resource)** – *List a container's contents:*
When the target URI corresponds to a container (determined via metadata type), a GET request returns a listing of the container's members. The response body is a container representation as defined in the [Container Representation](#container-representation) section, using the LWS container media type. The listing includes metadata for each member: resource identifiers (MUST), types (MUST), media types (MUST for DataResources), sizes (SHOULD), and modification timestamps (SHOULD).

**Example (GET a container):**
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
Link: </alice/>; rel="up"
Link: </alice/notes/.acl>; rel="acl"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"

{
  "@context": "https://www.w3.org/ns/lws/v1",
  "id": "/alice/notes/",
  "type": "Container",
  "totalItems": 2,
  "items": [
    {
      "type": "DataResource",
      "id": "/alice/notes/shoppinglist.txt",
      "mediaType": "text/plain",
      "size": 47,
      "modified": "2025-11-24T12:00:00Z"
    },
    {
      "type": ["DataResource", "http://example.org/customType"],
      "id": "/alice/notes/todo.json",
      "mediaType": "application/json",
      "size": 2048,
      "modified": "2025-11-24T13:00:00Z"
    }
  ]
}
```
In this example, `/alice/notes/` is a container. The response uses JSON-LD with the LWS context, listing members with required metadata. Each item includes its `type`, `id`, `mediaType`, `size`, and `modified` timestamp as flat properties.

In all cases, the server MUST include the following metadata in the response headers: an ETag (representing the listing version, which changes on membership modifications), and Link headers with `rel="type"` indicating it is a container, `rel="linkset"`, `rel="up"`, and `rel="acl"`.

**HEAD (any resource or container)** – *Headers/metadata only:*
The LWS server MUST support HEAD [[RFC9110]] for both containers and non-containers, returning the same headers as GET (including ETag, Content-Type, Link for metadata) but without a body. This enables metadata retrieval without transferring content.

**Caching and Conditional Requests:** LWS leverages HTTP caching semantics. Servers MUST support conditional requests via If-None-Match (with ETags) or If-Modified-Since headers. If the resource or container listing has not changed, respond with 304 Not Modified to avoid redundant transfers. ETags MUST be provided in all GET/HEAD responses for concurrency and caching support.

**Discoverability and Authorization:** For enhanced discoverability, servers SHOULD include WWW-Authenticate headers on 401 Unauthorized responses with parameters to guide clients without hardcoded URIs. Metadata links SHOULD be included where applicable.
