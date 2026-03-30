Retrieves the representation of an existing resource.

* **Inputs**: Target identifier and optional parameters.
* **Behavior**:
    * The server returns the resource content.
    * For manifest resources, the server returns <a href="#manifest-representation">manifest representation</a> with listing of its member resources which MAY be filtered based on <a href="#manifest-membership-and-authorization">authorization</a>. Listings must include core metadata for each member.
* **Outcome**: The requested representation or a notification of failure.

The read resource operation requests a resource representation with HTTP GET requests (and HEAD for header-only requests). All responses MUST integrate with metadata as defined in Section 8.1, including Link headers for key relations such as `rel="linkset", rel="manifest"`, `rel="up"`, `rel="principal"`, and `rel="type"`. Servers MUST ensure atomicity between the resource state and its metadata during reads.

**GET** – *Retrieve a resource's content:*
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
Link: <https://www.w3.org/ns/lws#Resource>; rel="type"

milk
cheese
bread
guacamole
soda
chocolate bars
hash
eggs
```
The server returned the text content (34 bytes in total, as indicated by `Content-Length`). The content is exactly the stored data in the file. The `ETag: "abc123456"` is a version identifier for caching or concurrency purposes. The response includes Link headers for metadata discoverability, with mandatory fields such as `up` and `type`.

**GET (manifest resource)** – *Retrieve a resource's manifest:*
When the target URI corresponds to a manifest resource, a GET request returns a manifest representation as defined in the [Manifest Representation](#manifest-representation) section, using the LWS manifest media type. The manifest includes metadata for each of contained auxiliary members: resource identifiers (MUST), types (MUST), media types (MUST), sizes (SHOULD), and modification timestamps (SHOULD).

**Example (GET a manifest):**
```
GET /alice/notes/~manifest HTTP/1.1
Authorization: Bearer <token>
Accept: application/lws+json
```
Assuming the principal resource and the manifest exists and the client has access:
```
HTTP/1.1 200 OK
Content-Type: application/lws+json
ETag: "manifest-etag-789"
Link: </alice/notes/>; rel="principal";

{
  "@context": "https://www.w3.org/ns/lws/v1",
  "id": "/alice/notes/",
  "type": ["Resource", "Container"],
  "totalItems": 2,
  "items": [
    {
      "type": "Resource",
      "id": "/alice/notes/shoppinglist.txt",
      "mediaType": "text/plain",
      "size": 47,
      "modified": "2025-11-24T12:00:00Z"
    },
    {
      "type": ["Resource", "http://example.org/customType"],
      "id": "/alice/notes/todo.json",
      "mediaType": "application/json",
      "size": 2048,
      "modified": "2025-11-24T13:00:00Z"
    }
  ],
  "auxiliaryMap": {
    "manifest":     {
      "id": "/alice/notes/~manifest.json",
      "type": ["Manifest", "Resource"],
      "mediaType": "application/lws+json",
      "modified": "2025-11-24T14:00:00Z",
    },
    "linkset":     {
      "id": "/alice/notes/~linkset.json",
      "type": ["Linkset", "Resource"],
      "mediaType": "application/linkset+json",
      "modified": "2025-11-24T14:00:00Z",
    },
    "acl":     {
      "id": "/alice/notes/~acl",
      "type": ["Resource"],
      "mediaType": "text/turtle",
      "modified": "2025-12-24T15:00:00Z",
    }
  } 
}
```
In this example, `/alice/notes/` is a container, and `alice/notes/~manifest` is it's manifest auxiliary resource. The response uses JSON-LD with the LWS context, listing contained and auxiliary members with required metadata. Each item includes its `type`, `id`, `mediaType`, `size`, and `modified` timestamp as flat properties.

In all cases, the server MUST include the following metadata in the response headers: an ETag (representing the listing version, which changes on membership modifications), and Link headers with `rel="type"` indicating if it is a container, `rel="linkset"` and `rel="up"` if it is a contained resource and `rel="principal"` if it is an auxiliary resource.

**HEAD** – *Headers/metadata only:*
The LWS server MUST support HEAD [[RFC9110]] for all resources in storage, returning the same headers as GET (including ETag, Content-Type, Link for metadata) but without a body. This enables metadata retrieval without transferring content.

**Caching and Conditional Requests:** LWS leverages HTTP caching semantics. Servers MUST support conditional requests via If-None-Match (with ETags) or If-Modified-Since headers. If the resource or container listing has not changed, respond with 304 Not Modified to avoid redundant transfers. ETags MUST be provided in all GET/HEAD responses for concurrency and caching support.

**Discoverability and Authorization:** For enhanced discoverability, servers SHOULD include WWW-Authenticate headers on 401 Unauthorized responses with parameters to guide clients without hardcoded URIs. Metadata links SHOULD be included where applicable.
