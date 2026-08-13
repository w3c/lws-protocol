Modifies the state of an existing [served resource] via full replacement or a partial patch.

* **Inputs**: Target identifier, new content, and optional concurrency constraints.
* **Behavior**: The server applies the changes atomically. If concurrency constraints are provided, the update is rejected if the resource has been modified since it was last read by the requester.
* **Outcome**: Confirmation of the update or a notification of conflict.

The [update resource](#dfn-update-resource) modifies the contents of an existing [served resource](#dfn-served-resource) by a PUT request (to replace the entire resource) or a PATCH request (to apply a partial modification). The client must have write access to the resource’s URL to perform these operations.
Note: This section describes updating a resource's primary content. To update its metadata, see Section 9.3.2.
LWS servers MUST handle PUT and PATCH requests on resource URIs as modifications to the resource content only, with no default impact on the associated <a>linkset resource</a>. To optionally update both content and metadata in a single atomic operation, clients MAY include `Link` headers in the PUT/PATCH request to the resource URI and specify the preference `'Prefer: set-linkset'` (as defined in [[RFC7240]]). In this case, the server MUST interpret the provided `Link` headers as a replacement (for PUT) or partial update (for PATCH) to the linkset, in addition to applying the content changes. This behavior is OPTIONAL for servers but, if supported, MUST be invoked explicitly via the `Prefer` header to prevent unintentional metadata overwrites. Servers that do not support combined updates MUST ignore the preference or respond with `501 Not Implemented`.

**PUT (replace full resource)** – Send PUT to the resource URI with new full content in the body and matching `Content-Type` (generally consistent with existing type). PUT is idempotent for existing resources. Clients SHOULD use conditional requests as defined in [[RFC9110]] to avoid overwriting concurrent changes.

**Example (PUT to update a resource):**
```
PUT /alice/personalinfo.json HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json
If-Match: "abc123456"
{
"name": "Alice",
"age": 30,
"city": "New London",
"state": "Connecticut"
}
```
In this example, the client is updating an existing JSON resource at `/alice/personalinfo.json`. It includes an `If-Match` header with an entity tag (`ETag`) that it received from an earlier GET or HEAD request. The server will compare that to the current entity tag (`ETag`); if they match, it proceeds to replace the content with the JSON provided. If they don’t match, the server rejects the update (because the resource was changed by someone else in the meantime).
Successful response: If the update succeeds, the server can respond with `200 OK` and possibly include the updated representation or some confirmation (like the new content or a part of it). Alternatively, the server may respond with `204 No Content` to indicate success with no body (especially common if no further info needs to be conveyed). For example:
```
HTTP/1.1 204 No Content
```
* **Error responses:** If the `If-Match` precondition did not match (concurrent modification), the server responds with `412 Precondition Failed`. If the resource did not exist, a PUT meant as an update will result in `404 Not Found`. If the client is not authorized, `403 Forbidden` (or `401 Unauthorized` if no valid credentials were provided). If the request payload is not valid, `400 Bad Request`.

**PATCH (partial update)** – The HTTP PATCH method [[RFC5789]] allows a client to specify partial modifications to a resource, rather than sending the whole new content. This is useful for large resources where sending the entire content would be inefficient if only a small part changed, or for concurrent editing where you want to apply specific changes. LWS server MUST minimally support JSON Merge Patch (application/merge-patch+json) as defined in [[RFC7386]].

**Update Resource Metadata (HTTP PUT / PATCH on Linkset)**
A resource's metadata is updated by modifying its corresponding <a>linkset resource</a>, discovered via the Link header with rel="linkset".
Full Replacement (PUT): A PUT request to the <a>linkset resource</a> URI with a complete linkset document in the body replaces all metadata for the resource.
Partial Update (PATCH): A PATCH request to the <a>linkset resource</a> URI adds, removes, or modifies specific links.

**Concurrency Control for Metadata**
Because a resource's metadata can be modified by multiple actors, preventing concurrent overwrites is important. Servers and clients SHOULD use conditional requests as defined in [[RFC9110]] for PUT and PATCH operations on a <a>linkset resource</a>. When a server receives a conditional request for which the precondition fails, it MUST reject the request with a 412 Precondition Failed status code.
Example (PUT to replace a linkset):
A client first fetches the linkset.
```
GET /alice/personalinfo.json.meta HTTP/1.1
Authorization: Bearer <token>
Accept: application/linkset+json
HTTP/1.1 200 OK
Content-Type: application/linkset+json
{
  "linkset": [
    {
      "anchor": "/alice/personalinfo.json",
      "describedby": [ { "href": "/schemas/personal-info.json" } ]
    }
  ]
}
```
The client now wants to add a license. It constructs a new, complete linkset document and sends a PUT request.
```
PUT /alice/personalinfo.json.meta HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/linkset+json
{
  "linkset": [
    {
      "anchor": "/alice/personalinfo.json",
      "describedby": [ { "href": "/schemas/personal-info.json" } ],
      "license": [ { "href": "https://creativecommons.org/licenses/by/4.0/" } ]
    }
  ]
}
```
If successful, the server responds with success.
```
HTTP/1.1 204 No Content
```

**Summary of Update Rules**
If you want to change only the content of a resource → PUT/PATCH the resource itself.
If you want to change only the links (metadata) of a resource → PUT/PATCH the resource’s associated <a>linkset resource</a>.
If you want to change both content and links → PUT/PATCH the resource itself, including the appropriate Link headers AND 'Prefer: set-linkset'. Setting both is off by default.