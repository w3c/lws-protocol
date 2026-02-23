#### Managing Containment

When multiple containment is enabled, resources MAY belong to more than one container. This section defines the operations for adding existing resources to containers and removing resources from containers without deleting the resource itself.

##### Adding a Resource to a Container

To add an existing resource to a container, a client sends a PATCH request to the target container's linkset resource using the `application/linkset-patch+json` media type. The patch body specifies the containment link to add.

The server MUST verify that:
- The target container exists and the client is authorized to modify it.
- The resource to be added exists.
- Adding the resource would not create a cycle in the containment graph (no self-containment, no circular ancestry).

On success, the server responds with 204 No Content. The container's `items` list and `totalItems` count are updated atomically.

**Example (Add a resource to a container):**
```
PATCH /alice/shared/.meta HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/linkset-patch+json
If-Match: "meta-v3"

{
  "add": {
    "linkset": [
      {
        "anchor": "/alice/shared/",
        "item": [
          { "href": "/alice/notes/shoppinglist.txt" }
        ]
      }
    ]
  }
}
```

Response:
```
HTTP/1.1 204 No Content
ETag: "meta-v4"
```

After this operation, `/alice/notes/shoppinglist.txt` appears in the `items` listing of both `/alice/notes/` and `/alice/shared/`. The resource now has two `rel="up"` links.

##### Removing a Resource from a Container

To remove a resource from a container without deleting the resource, a client sends a PATCH request to the container's linkset resource specifying the containment link to remove.

The server MUST verify that:
- The target container exists and the client is authorized to modify it.
- The resource is currently a member of the target container.

**Orphan handling:** If removing the resource from this container would leave it with no parent containers, the server MUST reject the request with 409 Conflict, unless the server supports orphan handling policies (e.g., automatic deletion of orphaned resources or moving them to a designated container). Servers that support automatic orphan handling MUST document their policy.

On success, the server responds with 204 No Content.

**Example (Remove a resource from a container):**
```
PATCH /alice/shared/.meta HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/linkset-patch+json
If-Match: "meta-v4"

{
  "remove": {
    "linkset": [
      {
        "anchor": "/alice/shared/",
        "item": [
          { "href": "/alice/notes/shoppinglist.txt" }
        ]
      }
    ]
  }
}
```

Response:
```
HTTP/1.1 204 No Content
ETag: "meta-v5"
```

##### Concurrency Control

All containment management operations MUST use optimistic concurrency control. Clients MUST include an `If-Match` header with the current ETag of the container's linkset resource. If the ETag does not match, the server MUST respond with 412 Precondition Failed. If the `If-Match` header is missing, the server MUST respond with 428 Precondition Required.
