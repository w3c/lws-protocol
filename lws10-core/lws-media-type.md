### LWS Media Type

An LWS <a>storage description</a> MUST be serializable with the media type `application/lws+cid`.
The `application/lws+cid` media type identifies a document that is a specialization of a W3C Controlled Identifier document [[!CID-1.0]], extended with the LWS vocabulary.

An LWS <a>container representation</a> MUST support the media type `application/lws+json`.

While LWS container representations use JSON-LD conventions, the constraints and requirements for LWS justify the use of a specific media type.

#### LWS Profile

The URI `https://www.w3.org/ns/lws/v1` identifies the <dfn>LWS profile</dfn> [[RFC6906]]. A representation of a <a>container</a> conforms to the <a>LWS profile</a> when the RDF it encodes is isomorphic, as defined in [RDF Dataset Comparison](https://www.w3.org/TR/rdf11-concepts/#section-dataset-isomorphism) [[!RDF11-CONCEPTS]], to the RDF that the `application/lws+json` representation of the same <a>container</a> state and page encodes when interpreted as JSON-LD [[!JSON-LD11]]. An `application/lws+json` representation always conforms to the <a>LWS profile</a>.

#### Content Negotiation

Servers MUST honor requests for `application/lws+json` and `application/ld+json` on <a>containers</a>, and MUST set the `Content-Type` response header to the media type of the selected representation.

A client requests a representation in the <a>LWS profile</a> by including the <a>LWS profile</a> URI in the `profile` parameter of an RDF media type. RDF media types that define this parameter include `application/ld+json` [[JSON-LD11]], `text/turtle` [[RDF12-TURTLE]], `application/trig` [[RDF12-TRIG]], `application/n-triples` [[RDF12-N-TRIPLES]], and `application/n-quads` [[RDF12-N-QUADS]]. If the server selects such a media type, the response MUST conform to the <a>LWS profile</a> and its `Content-Type` MUST include the same `profile` parameter. A server MUST NOT select such a media type if it cannot produce a representation in the <a>LWS profile</a> in it.

For an RDF media type that does not define a `profile` parameter, such as `application/rdf+xml`, a server MAY indicate that a representation conforms to the <a>LWS profile</a> with a `Link` header whose relation type is `profile` and whose target is the <a>LWS profile</a> URI [[!RFC6906]]. Such a representation MUST conform to the <a>LWS profile</a>.

Other representations of a <a>container</a> need not conform to the <a>LWS profile</a>. A server that also implements another protocol, such as the Solid Protocol, can therefore serve that protocol's container representations to clients that do not request the <a>LWS profile</a>.

When the selected representation depends on the request's `Accept` header, responses SHOULD include a `Vary: Accept` header [[!RFC9110]].

##### Content Negotiation Examples

Each tab shows a request for the <a>container</a> in [](#container-representation) and the server's response.

<div class="example-tabs">
<div data-tab="application/lws+json">

```http
GET /alice/notes/ HTTP/1.1
Host: storage.example
Accept: application/lws+json
```


```http
HTTP/1.1 200 OK
Content-Type: application/lws+json
Vary: Accept

{
  "@context": "https://www.w3.org/ns/lws/v1",
  "id": "/alice/notes/",
  "type": "Container",
  "totalItems": 2,
  "items": [
    {
      "type": "DataResource",
      "id": "/alice/notes/shoppinglist.txt",
      "format": "text/plain",
      "size": 47,
      "modified": "2025-11-24T12:00:00Z"
    },
    {
      "type": ["DataResource", "http://example.org/customType"],
      "id": "/alice/notes/todo.json",
      "format": "application/json",
      "size": 2048,
      "modified": "2025-11-24T13:00:00Z"
    }
  ]
}
```

</div>

<div data-tab="application/ld+json (LWS profile)">

```http
GET /alice/notes/ HTTP/1.1
Host: storage.example
Accept: application/ld+json; profile="https://www.w3.org/ns/lws/v1"
```


```http
HTTP/1.1 200 OK
Content-Type: application/ld+json; profile="https://www.w3.org/ns/lws/v1"
Vary: Accept

{
  "@context": "https://www.w3.org/ns/lws/v1",
  "id": "/alice/notes/",
  "type": "Container",
  "totalItems": 2,
  "items": [
    {
      "type": "DataResource",
      "id": "/alice/notes/shoppinglist.txt",
      "format": "text/plain",
      "size": 47,
      "modified": "2025-11-24T12:00:00Z"
    },
    {
      "type": ["DataResource", "http://example.org/customType"],
      "id": "/alice/notes/todo.json",
      "format": "application/json",
      "size": 2048,
      "modified": "2025-11-24T13:00:00Z"
    }
  ]
}
```

</div>

<div data-tab="text/turtle (LWS profile)">

```http
GET /alice/notes/ HTTP/1.1
Host: storage.example
Accept: text/turtle; profile="https://www.w3.org/ns/lws/v1"
```


```http
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

</div>

<div data-tab="application/rdf+xml">

```http
GET /alice/notes/ HTTP/1.1
Host: storage.example
Accept: application/rdf+xml
```


```http
HTTP/1.1 200 OK
Content-Type: application/rdf+xml
Link: <https://www.w3.org/ns/lws/v1>; rel="profile"
Vary: Accept

<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:lws="https://www.w3.org/ns/lws#"
         xmlns:dcterms="http://purl.org/dc/terms/"
         xmlns:schema="http://schema.org/">
  <lws:Container rdf:about="">
    <lws:totalItems rdf:datatype="http://www.w3.org/2001/XMLSchema#integer">2</lws:totalItems>
    <lws:items>
      <lws:DataResource rdf:about="shoppinglist.txt">
        <dcterms:format>text/plain</dcterms:format>
        <schema:size rdf:datatype="http://www.w3.org/2001/XMLSchema#long">47</schema:size>
        <dcterms:modified rdf:datatype="http://www.w3.org/2001/XMLSchema#dateTime">2025-11-24T12:00:00Z</dcterms:modified>
      </lws:DataResource>
    </lws:items>
    <lws:items>
      <lws:DataResource rdf:about="todo.json">
        <rdf:type rdf:resource="http://example.org/customType"/>
        <dcterms:format>application/json</dcterms:format>
        <schema:size rdf:datatype="http://www.w3.org/2001/XMLSchema#long">2048</schema:size>
        <dcterms:modified rdf:datatype="http://www.w3.org/2001/XMLSchema#dateTime">2025-11-24T13:00:00Z</dcterms:modified>
      </lws:DataResource>
    </lws:items>
  </lws:Container>
</rdf:RDF>
```

</div>

<div data-tab="application/ld+json (no profile)">

```http
GET /alice/notes/ HTTP/1.1
Host: storage.example
Accept: application/ld+json
```


```http
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

</div>

</div>

In the last tab, the client does not request the <a>LWS profile</a>, and a server that also implements the Solid Protocol returns its Solid container representation.

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

First page:

<div class="example-tabs">
<div data-tab="application/lws+json">

```http
GET /alice/photos/ HTTP/1.1
Authorization: Bearer <token>
Accept: application/lws+json
```


```http
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

</div>

<div data-tab="text/turtle (LWS profile)">

```http
GET /alice/photos/ HTTP/1.1
Authorization: Bearer <token>
Accept: text/turtle; profile="https://www.w3.org/ns/lws/v1"
```


```http
HTTP/1.1 200 OK
Content-Type: text/turtle; profile="https://www.w3.org/ns/lws/v1"
ETag: "photos-page1-etag"
Link: </alice/photos/.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/>; rel="up"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
Link: </alice/photos/?page=1>; rel="first"
Link: </alice/photos/?page=3>; rel="last"
Link: </alice/photos/?page=2>; rel="next"

@prefix lws: <https://www.w3.org/ns/lws#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix schema: <http://schema.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

</alice/photos/> a lws:Container ;
  lws:totalItems 150 ;
  lws:items </alice/photos/vacation.jpg>, </alice/photos/portrait.png> .

</alice/photos/vacation.jpg> a lws:DataResource ;
  dcterms:format "image/jpeg" ;
  schema:size "248392"^^xsd:long ;
  dcterms:modified "2025-11-20T10:30:00Z"^^xsd:dateTime .

</alice/photos/portrait.png> a lws:DataResource ;
  dcterms:format "image/png" ;
  schema:size "102400"^^xsd:long ;
  dcterms:modified "2025-11-21T14:15:00Z"^^xsd:dateTime .
```

</div>

</div>

Next page:

<div class="example-tabs">
<div data-tab="application/lws+json">

```http
GET /alice/photos/?page=2 HTTP/1.1
Authorization: Bearer <token>
Accept: application/lws+json
```


```http
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

</div>

<div data-tab="text/turtle (LWS profile)">

```http
GET /alice/photos/?page=2 HTTP/1.1
Authorization: Bearer <token>
Accept: text/turtle; profile="https://www.w3.org/ns/lws/v1"
```


```http
HTTP/1.1 200 OK
Content-Type: text/turtle; profile="https://www.w3.org/ns/lws/v1"
ETag: "photos-page2-etag"
Link: </alice/photos/.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/>; rel="up"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
Link: </alice/photos/?page=1>; rel="first"
Link: </alice/photos/?page=1>; rel="prev"
Link: </alice/photos/?page=3>; rel="next"
Link: </alice/photos/?page=3>; rel="last"

@prefix lws: <https://www.w3.org/ns/lws#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix schema: <http://schema.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

</alice/photos/> a lws:Container ;
  lws:totalItems 150 ;
  lws:items </alice/photos/sunset.jpg> .

</alice/photos/sunset.jpg> a lws:DataResource ;
  dcterms:format "image/jpeg" ;
  schema:size "315000"^^xsd:long ;
  dcterms:modified "2025-11-22T09:00:00Z"^^xsd:dateTime .
```

</div>

</div>
