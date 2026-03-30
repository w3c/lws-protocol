### Manifest Representation

When a client retrieves a manifest of a resource, the server returns a structured <dfn>manifest representation</dfn>. This section defines the required and optional properties of a manifest representation.

#### Manifest Properties

A manifest representation MUST include the following properties of the principal resource:

- **`id`**: The URI of the resource.
- **`type`**: The type of the resource. Can be a single string or an array of strings. For all resources, it MUST include "Resource". For containers, it MUST include "Container".
- **`totalContainedItems`**: For a container resource, an integer indicating the total number of resources contained in the resource which can be disclosed to the client.
- **`containedItems`**: For a container resource, an array of contained resource descriptions (see below). If the container is empty, this MUST be an empty array.
- **`auxiliaryMap`**: A map with entries corresponding to each auxiliary relation, with auxiliaryRel as the key and description of the corresponding auxiliary resource as the value.

#### Resource Description

Each entry in the `containedItems` array describes a contained member resource. The value of each entry in the `auxiliaryMap` map describes an auxiliary member resource.

A member resource description MUST include:

- **`id`**: The URI of the member resource.
- **`type`**: The type of the member resource. Can be a single string or an array of strings. For all resources, it MUST include "Resource". For containers, it MUST also include "Container". Servers MAY include additional user-defined types as URIs (e.g., `["Container", "http://example.org/customType"]`).

A resource description SHOULD include:

- **`mediaType`**: The media type of the resource (e.g., `"text/plain"`, `"image/jpeg"`). MUST be present.
- **`size`**: The size of the resource in bytes, expressed as an integer.
- **`modified`**: The date and time the resource was last modified, expressed as an ISO 8601 date-time string.

#### Example Manifest Representation

The following example shows the manifest of a container at `/alice/notes/` containing two resources, and having some auxiliary resources:

```json
{
  "@context": "https://www.w3.org/ns/lws/v1",
  "id": "/alice/notes/",
  "type": ["Container", "Resource"],
  "totalContainedItems": 2,
  "containedItems": [
    {
      "id": "/alice/notes/shoppinglist.txt",
      "type": ["Resource"],
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
