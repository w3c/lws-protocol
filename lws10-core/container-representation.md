### Container Representation

When a client retrieves a container, the server returns a structured <dfn>container representation</dfn> describing the container and its contents. This section defines the required and optional properties of a container representation.

#### Container Properties

A container representation MUST include the following properties:

- **`id`**: The URI of the container.
- **`type`**: The value `"Container"`.
- **`totalItems`**: An integer indicating the total number of resources contained in the container which can be disclosed to the client.
- **`items`**: An array of contained resource descriptions (see below). If the container is empty, this MUST be an empty array.

#### Contained Resource Description

Each entry in the `items` array describes a resource contained in the container. A contained resource description MUST include:

- **`id`**: The URI of the contained resource.
- **`type`**: The type of the resource. MUST be `"DataResource"` or `"Container"`, or an array containing at least one of these two strings. Servers MAY include additional user-defined types as URIs (e.g., `["DataResource", "http://example.org/customType"]`).

A contained resource description SHOULD include:

- **`mediaType`**: The media type of the resource (e.g., `"text/plain"`, `"image/jpeg"`). MUST be present for DataResources.
- **`size`**: The size of the resource in bytes, expressed as an integer.
- **`modified`**: The date and time the resource was last modified, expressed as an ISO 8601 date-time string.

#### Example Container Representation

The following example shows a container at `/alice/notes/` containing two resources:

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
