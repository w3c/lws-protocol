### JSON-LD Context and Vocabulary

#### Normative JSON-LD Context

Manifest representations MUST include the following `@context` value:

```
"@context": "https://www.w3.org/ns/lws/v1"
```

The normative JSON-LD context document defines the mapping between the short property names used in manifest representations and their full URIs in the LWS and related vocabularies. The context is defined as follows:

```json
{
  "@context": {
    "@version": 1.1,
    "@protected": true,
    "lws": "https://www.w3.org/ns/lws#",
    "as": "https://www.w3.org/ns/activitystreams#",
    "schema": "https://schema.org/",
    "xs": "http://www.w3.org/2001/XMLSchema#",
    "id": "@id",
    "type": "@type",
    "Resource": "lws:Resource",
    "Container": "lws:Container",
    "containedItems": "lws:containedItems",
    "auxiliaryMap": "lws:auxiliaryMap",
    "totalContainedItems": "as:totalItems",
    "mediaType": "as:mediaType",
    "size": {
      "@id": "schema:size",
      "@type": "xs:long"
    },
    "modified": {
      "@id": "as:updated",
      "@type": "xs:dateTime"
    }
  }
}
```

The context is `@protected`, ensuring that the term definitions cannot be overridden by other contexts.

#### Vocabulary

The LWS vocabulary defines the following types and properties used in manifest representations:

**Types:**

| Term | URI | Description |
|------|-----|-------------|
| `Resource` | `lws:Resource` | An lws conformant resource |
| `Container` | `lws:Container` | A resource that contains other resources |

**Properties:**

| Term | URI | Description |
|------|-----|-------------|
| `containedItems` | `lws:containedItems` | The list of resources contained in a container |
| `auxiliaryMap` | `lws:auxiliaryMap` | The map with entries corresponding to auxiliary resources of a resource |
| `totalContainedItems` | `as:totalItems` | The total number of contained resources |
| `mediaType` | `as:mediaType` | The media type of a resource |
| `size` | `schema:size` | The size of a resource in bytes |
| `modified` | `as:updated` | The date-time a resource was last modified |
