### Container Representation

An LWS <dfn>container representation</dfn> describes a <a>container</a> and its contents. This section defines its required and optional properties when served as `application/lws+json`. Representations in other RDF media types can be requested through [content negotiation](#content-negotiation).

#### Container Properties

A container representation MUST include the following properties:

- **`id`**: The URI of the <a>container</a>.
- **`type`**: The value `"Container"`.
- **`totalItems`**: An integer indicating the total number of resources contained in the <a>container</a> which can be disclosed to the client. This count SHOULD be accurate but MAY be approximate.
- **`items`**: An array of contained resource descriptions (see below). If the 
  <a>container</a> is empty, this MUST be an empty array. When the <a>container</a> listing is
  paginated, `items` contains only the current page of resources; see [Pagination](#pagination) for details.

<!--
  AUTHOR NOTE (not for publication): The accuracy requirement for `totalItems`
  was relaxed from MUST to SHOULD. Maintaining an exact count can be expensive
  or infeasible for very large or rapidly changing containers. The relaxed
  requirement lets a server return an approximate value in such cases rather
  than omitting the property or failing the request, while still encouraging an
  exact count wherever it is practical to compute one.
-->

#### Contained Resource Description

Each entry in the `items` array describes a resource contained in the <a>container</a>. A contained resource description MUST include:

- **`id`**: The URI of the contained resource.
- **`type`**: The type of the resource. MUST be `"DataResource"` or `"Container"`, or an array containing at least one of these two strings. Servers MAY include additional user-defined types as URIs (e.g., `["DataResource", "http://example.org/customType"]`).

A contained resource description SHOULD include:

- **`format`**: The media type of the resource (e.g., `"text/plain"`, `"image/jpeg"`). MUST be present for DataResources.
- **`size`**: The size of the resource in bytes, expressed as an integer.
- **`modified`**: The date and time the resource was last modified, expressed as an ISO 8601 date-time string.

#### Example Container Representation

The following example shows a <a>container</a> at `https://storage.example/alice/notes/` containing two resources. The other tabs show the same container in other RDF media types in the <a>LWS profile</a>.

<div class="example-tabs">
<div data-tab="application/lws+json">

```json
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

<div data-tab="text/turtle">

```nohighlight
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

<div data-tab="application/n-triples">

```nohighlight
<https://storage.example/alice/notes/> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://www.w3.org/ns/lws#Container> .
<https://storage.example/alice/notes/> <https://www.w3.org/ns/lws#totalItems> "2"^^<http://www.w3.org/2001/XMLSchema#integer> .
<https://storage.example/alice/notes/> <https://www.w3.org/ns/lws#items> <https://storage.example/alice/notes/shoppinglist.txt> .
<https://storage.example/alice/notes/> <https://www.w3.org/ns/lws#items> <https://storage.example/alice/notes/todo.json> .
<https://storage.example/alice/notes/shoppinglist.txt> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://www.w3.org/ns/lws#DataResource> .
<https://storage.example/alice/notes/shoppinglist.txt> <http://purl.org/dc/terms/format> "text/plain" .
<https://storage.example/alice/notes/shoppinglist.txt> <http://schema.org/size> "47"^^<http://www.w3.org/2001/XMLSchema#long> .
<https://storage.example/alice/notes/shoppinglist.txt> <http://purl.org/dc/terms/modified> "2025-11-24T12:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
<https://storage.example/alice/notes/todo.json> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://www.w3.org/ns/lws#DataResource> .
<https://storage.example/alice/notes/todo.json> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/customType> .
<https://storage.example/alice/notes/todo.json> <http://purl.org/dc/terms/format> "application/json" .
<https://storage.example/alice/notes/todo.json> <http://schema.org/size> "2048"^^<http://www.w3.org/2001/XMLSchema#long> .
<https://storage.example/alice/notes/todo.json> <http://purl.org/dc/terms/modified> "2025-11-24T13:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
```

</div>

<div data-tab="application/rdf+xml">

```xml
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

</div>
