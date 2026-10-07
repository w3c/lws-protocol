### LWS Media Type

An LWS <a>storage description</a> MUST be serializable with the media type `application/lws+cid`.
The `application/lws+cid` media type identifies a document that is a specialization of a W3C Controlled Identifier document [[!CID-1.0]], extended with the LWS vocabulary.

An LWS <a>container representation</a> MUST support the media type `application/lws+json`.

While LWS container representations use JSON-LD conventions, the constraints and requirements for LWS justify the use of a specific media type.

#### LWS Profile

The URI `https://www.w3.org/ns/lws/v1` identifies the <dfn>LWS profile</dfn> [[RFC6906]]. The <dfn>LWS dataset</dfn> of a <a>container</a> is the RDF dataset obtained by interpreting its `application/lws+json` <a>container representation</a> as JSON-LD [[!JSON-LD11]].

A representation of a <a>container</a> conforms to the <a>LWS profile</a> when it encodes an RDF dataset that is isomorphic to the <a>LWS dataset</a> for the same <a>container</a> state, requesting <a>agent</a>, and page (see [Pagination](#pagination)). Isomorphism is defined in [RDF Dataset Comparison](https://www.w3.org/TR/rdf11-concepts/#section-dataset-isomorphism) [[!RDF11-CONCEPTS]]; a representation that encodes a single RDF graph is compared as a dataset with that graph as its default graph and no named graphs. Conforming representations can differ in serialization, JSON structure, and blank node labels.

#### Content Negotiation

Servers MUST honor requests for `application/lws+json` and for `application/ld+json` on <a>containers</a>, and MUST set the `Content-Type` response header to the media type of the selected representation.

A response with `Content-Type: application/lws+json` MUST conform to the <a>container representation</a> structure defined in [](#container-representation). Such a response conforms to the <a>LWS profile</a>.

A client requests a representation in the <a>LWS profile</a> by including the <a>LWS profile</a> URI in the `profile` parameter of an RDF media type in its `Accept` header. The media types that define this parameter include `application/ld+json` [[!JSON-LD11]] and `text/turtle`, `application/trig`, `application/n-triples`, and `application/n-quads` [[RDF12-TURTLE]] [[RDF12-TRIG]] [[RDF12-N-TRIPLES]] [[RDF12-N-QUADS]]. When the server selects a media type for which such a `profile` parameter was requested, the response MUST conform to the <a>LWS profile</a>, and its `Content-Type` header MUST include the <a>LWS profile</a> URI in the `profile` parameter. A server that cannot produce a representation in the <a>LWS profile</a> in a media type MUST NOT select that media type for such a request. An `application/ld+json` response in the <a>LWS profile</a> SHOULD be the same document as the `application/lws+json` representation.

For an RDF media type that does not define a `profile` parameter, a server MAY indicate that a representation conforms to the <a>LWS profile</a> with a `Link` header whose relation type is `profile` and whose target is the <a>LWS profile</a> URI [[!RFC6906]]. Such a representation MUST conform to the <a>LWS profile</a>. A server MUST NOT indicate the <a>LWS profile</a> for a media type that cannot encode the <a>LWS dataset</a>, such as a media type that cannot express named graphs when that dataset has any.

Representations of a <a>container</a> that are not indicated to conform to the <a>LWS profile</a>, such as responses to requests for `application/ld+json` or `text/turtle` without the <a>LWS profile</a>, are not required to be isomorphic to the <a>LWS dataset</a>.

When the selected representation depends on the request's `Accept` header, responses SHOULD include a `Vary: Accept` header [[!RFC9110]].

**Note (non-normative):** A server can offer additional representations of a container (for example, `text/turtle`) through standard content negotiation [[RFC9110]]; this specification neither requires nor precludes such support. Because only representations in the <a>LWS profile</a> are bound to the <a>LWS dataset</a>, a server that also implements another protocol, such as the Solid Protocol, can keep serving that protocol's container representation for RDF media types requested without the <a>LWS profile</a>. Clients that rely on the LWS data model request `application/lws+json`, or an RDF media type with the <a>LWS profile</a>.

##### Content Negotiation Examples

The following examples use the <a>container</a> shown in [](#container-representation), at `https://storage.example/alice/notes/`.

A client requests Turtle in the <a>LWS profile</a>:

```
GET /alice/notes/ HTTP/1.1
Host: storage.example
Accept: text/turtle; profile="https://www.w3.org/ns/lws/v1"
```

The server responds with Turtle that encodes the <a>LWS dataset</a>:

```
HTTP/1.1 200 OK
Content-Type: text/turtle; profile="https://www.w3.org/ns/lws/v1"
Vary: Accept

@prefix lws: <https://www.w3.org/ns/lws#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix schema: <http://schema.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<> a lws:Container ;
  lws:totalItems 2 ;
  lws:items <shoppinglist.txt>, <todo.json> .

<shoppinglist.txt> a lws:DataResource ;
  dcterms:format "text/plain" ;
  schema:size "47"^^xsd:long ;
  dcterms:modified "2025-11-24T12:00:00Z"^^xsd:dateTime .

<todo.json> a lws:DataResource, <http://example.org/customType> ;
  dcterms:format "application/json" ;
  schema:size "2048"^^xsd:long ;
  dcterms:modified "2025-11-24T13:00:00Z"^^xsd:dateTime .
```

A client requests JSON-LD in the <a>LWS profile</a>:

```
GET /alice/notes/ HTTP/1.1
Host: storage.example
Accept: application/ld+json; profile="https://www.w3.org/ns/lws/v1"
```

The server responds with the same document as the `application/lws+json` representation:

```
HTTP/1.1 200 OK
Content-Type: application/ld+json; profile="https://www.w3.org/ns/lws/v1"
Vary: Accept

{
  "@context": "https://www.w3.org/ns/lws/v1",
  "id": "/alice/notes/",
  "type": "Container",
  "totalItems": 2,
  "items": [ ... ]
}
```

A client requests JSON-LD without a profile from a server that also implements the Solid Protocol. The server is not required to return a representation in the <a>LWS profile</a>, and in this example it returns its Solid container representation:

```
GET /alice/notes/ HTTP/1.1
Host: storage.example
Accept: application/ld+json
```

```
HTTP/1.1 200 OK
Content-Type: application/ld+json
Vary: Accept

{
  "@context": { "ldp": "http://www.w3.org/ns/ldp#" },
  "@id": "/alice/notes/",
  "@type": [ "ldp:Container", "ldp:BasicContainer" ],
  "ldp:contains": [
    { "@id": "/alice/notes/shoppinglist.txt" },
    { "@id": "/alice/notes/todo.json" }
  ]
}
```


#### Pagination

Certain composite resources, like <a>containers</a>, may hold a large number of resources. 
To allow clients to retrieve listings incrementally, servers SHOULD support
pagination for <a>containers</a> whose membership exceeds a server-determined threshold.

##### Pagination Model

Pagination is link-based: the server provides pagination URIs via HTTP `Link` headers [[!RFC8288]],
allowing clients to navigate the full listing without relying on numeric offsets.

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
property in the response body SHOULD reflect the total number of items across all pages, not just the current page.

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
      "format": "image/jpeg",
      "size": 248392,
      "modified": "2025-11-20T10:30:00Z"
    },
    {
      "type": "DataResource",
      "id": "/alice/photos/portrait.png",
      "format": "image/png",
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
      "format": "image/jpeg",
      "size": 315000,
      "modified": "2025-11-22T09:00:00Z"
    }
  ]
}
```
