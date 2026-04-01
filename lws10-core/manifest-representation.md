### Manifest Representation

When a client retrieves a manifest of a container, the server returns a structured <dfn>manifest representation</dfn>. This section defines the required and optional properties of a manifest representation.

#### Manifest Properties

A manifest representation MUST include the following properties of the principal container resource:

- **`id`**: The URI of the resource.
- **`type`**: The type of the resource. Can be a single string or an array of strings. For all resources, it MUST include "Resource". For containers, it MUST include "Container".
- **`totalItems`**: An integer indicating the total number of resources contained in the container which can be disclosed to the client.
- **`items`**: An array of contained resource descriptions (see below). If the container is empty, this MUST be an empty array.

#### Resource Description

Each entry in the `items` array describes a contained member resource.

A member resource description MUST include:

- **`id`**: The URI of the member resource.
- **`type`**: The type of the member resource. Can be a single string or an array of strings. For all resources, it MUST include "Resource". For containers, it MUST also include "Container". Servers MAY include additional user-defined types as URIs (e.g., `["Container", "http://example.org/customType"]`).

A resource description SHOULD include:

- **`mediaType`**: The media type of the resource (e.g., `"text/plain"`, `"image/jpeg"`). MUST be present.
- **`size`**: The size of the resource in bytes, expressed as an integer.
- **`modified`**: The date and time the resource was last modified, expressed as an ISO 8601 date-time string.

#### Example Manifest Representation

The following example shows the manifest of a container at `/alice/notes/` containing two resources:

```json
{
  "@context": "https://www.w3.org/ns/lws/v1",
  "id": "/alice/notes/",
  "type": ["Container", "Resource"],
  "totalItems": 2,
  "items": [
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
  ]
}
```
