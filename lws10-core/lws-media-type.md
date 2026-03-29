### LWS Media Type

LWS <a>container representation</a> and <a>storage description resource</a> MUST use the media type `application/lws+json`.

While LWS container representations use JSON-LD conventions, the constraints and requirements for LWS justify the use of a specific media type. Because LWS containers can be considered a restricted profile of JSON-LD, implementations SHOULD consider the `application/ld+json; profile="https://www.w3.org/ns/lws/v1"` media type as equivalent to `application/lws+json`.

#### Content Negotiation

Servers MUST support content negotiation for container representations. The response payload MUST be identical regardless of the requested media type — only the `Content-Type` response header varies:

- If a client requests `application/lws+json`, the server MUST respond with `Content-Type: application/lws+json`.
- If a client requests `application/ld+json`, the server MUST respond with `Content-Type: application/ld+json`.
- If a client requests `application/json`, the server MUST respond with `Content-Type: application/json`.

In all three cases, the response body is the same JSON-LD document conforming to the LWS container vocabulary. Servers are free to support additional media types (e.g., `text/turtle`) through content negotiation.


#### Pagination

Certain composite resources, like containers, may hold a large number of resources. 
To allow clients to retrieve listings incrementally, servers SHOULD support
pagination for containers whose membership exceeds a server-determined threshold.

##### Pagination Model

Pagination is link-based: the server provides pagination URIs via HTTP `Link` headers [[!RFC8288]],
allowing clients to navigate the full listing without relying on numeric offsets. The server
determines page boundaries and page size.

When a listing is paginated, the response body contains only the current page of items. The
composite resource's `id`, `type`, and `totalItems` properties reflect the full membership, while `items`
contains only the resources on the current page.

##### Pagination Link Relations

Pagination URIs are conveyed in `Link` headers using the following standard link relations:

- **`rel="first"`**: The URI of the first page of results. MUST be present on paginated responses.
- **`rel="last"`**: The URI of the last page of results. MAY be present on paginated responses.
- **`rel="next"`**: The URI of the next page of results. MUST be present when there are subsequent
pages. MUST be omitted on the last page.
- **`rel="prev"`**: The URI of the previous page of results. MAY be present when there are preceding
pages. MUST be omitted on the first page.

All pagination URIs are opaque to the client. Clients SHOULD NOT construct or modify pagination
URIs; they SHOULD use the URIs provided by the server.

##### Requesting Pages

A client requests the composite resource's URI to obtain the first page. The response includes pagination
Link headers that the client follows to retrieve subsequent pages. Servers MAY also support
direct access to specific pages via the pagination URIs obtained during a previous scan.

When a paginated response is returned, the server MUST respond with 200 OK. The `totalItems`
property in the response body MUST reflect the total number of items across all pages, not just the
current page.

##### Example: Paginated Container

Request:
```
GET /alice/photos/ HTTP/1.1
Authorization: Bearer <token>
Accept: application/lws+json
```

Response (first page):
```
HTTP/1.1 200 OK
Content-Type: application/lws+json
ETag: "photos-page1-etag"
Link: </alice/photos/.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/>; rel="up"
Link: </alice/photos/.acl>; rel="acl"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
Link: </alice/photos/?page=1>; rel="first"
Link: </alice/photos/?page=3>; rel="last"
Link: </alice/photos/?page=2>; rel="next"

{
  "@context": "https://www.w3.org/ns/lws/v1",
  "id": "/alice/photos/",
  "type": "Container",
  "totalItems": 150,
  "items": [
    {
      "type": "DataResource",
      "id": "/alice/photos/vacation.jpg",
      "mediaType": "image/jpeg",
      "size": 248392,
      "modified": "2025-11-20T10:30:00Z"
    },
    {
      "type": "DataResource",
      "id": "/alice/photos/portrait.png",
      "mediaType": "image/png",
      "size": 102400,
      "modified": "2025-11-21T14:15:00Z"
    }
  ]
}
```

Request (next page):
```
GET /alice/photos/?page=2 HTTP/1.1
Authorization: Bearer <token>
Accept: application/lws+json
```

Response (middle page):
```
HTTP/1.1 200 OK
Content-Type: application/lws+json
ETag: "photos-page2-etag"
Link: </alice/photos/.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/>; rel="up"
Link: </alice/photos/.acl>; rel="acl"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
Link: </alice/photos/?page=1>; rel="first"
Link: </alice/photos/?page=1>; rel="prev"
Link: </alice/photos/?page=3>; rel="next"
Link: </alice/photos/?page=3>; rel="last"

{
  "@context": "https://www.w3.org/ns/lws/v1",
  "id": "/alice/photos/",
  "type": "Container",
  "totalItems": 150,
  "items": [
    {
      "type": "DataResource",
      "id": "/alice/photos/sunset.jpg",
      "mediaType": "image/jpeg",
      "size": 315000,
      "modified": "2025-11-22T09:00:00Z"
    }
  ]
}
```
