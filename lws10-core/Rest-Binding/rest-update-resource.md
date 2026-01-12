### Update Resource (HTTP PUT / PATCH)
The [update resource](https://w3c.github.io/lws-protocol/spec/#dfn-update-resource) modifies the contents of an existing [served resource](https://w3c.github.io/lws-protocol/spec/#dfn-served-resource) by a **PUT** request (to replace the entire resource) or a **PATCH** request (to apply a partial modification). The client must have write access to the resource’s URL to perform these operations.
Note: This section describes updating a resource's primary content. To update its metadata, see Section 9.3.2.
LWS servers MUST handle PUT and PATCH requests on resource URIs as modifications to the resource content only, with no default impact on the associated linkset. To optionally update both content and metadata in a single atomic operation, clients MAY include Link headers in the PUT/PATCH request to the resource URI and specify the preference 'Prefer: set-linkset' (as defined in RFC 7240). In this case, the server MUST interpret the provided Link headers as a replacement (for PUT) or partial update (for PATCH) to the linkset, in addition to applying the content changes. This behavior is OPTIONAL for servers but, if supported, MUST be invoked explicitly via the Prefer header to prevent unintentional metadata overwrites. Servers that do not support combined updates MUST ignore the preference or respond with 501 Not Implemented.

**PUT (replace full resource)** – Send PUT to the resource URI with new full content in the body and matching Content-Type (generally consistent with existing type). PUT is idempotent for existing resources. For safety, include If-Match with current ETag (per Section 7.3 concurrency); mismatch yields 412 Precondition Failed or 409 Conflict. Without checks, updates are unconditional but risk overwriting concurrent changes. If a server supports `Etags` for a resource, it **MUST** reject unconditional PUT requests that lack an If-Match header with a 428 Precondition Required response.

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
In this example, the client is updating an existing JSON resource at /alice/personalinfo.json. It includes an If-Match header with the ETag "abc123456" that it got from an earlier GET or HEAD request. The server will compare that to the current ETag; if they match, it proceeds to replace the content with the JSON provided. If they don’t match, the server rejects the update (because the resource was changed by someone else in the meantime).
Successful response: If the update succeeds, the server can respond with 200 OK and possibly include the updated representation or some confirmation (like the new content or a part of it). Alternatively, the server may respond with 204 No Content to indicate success with no body (especially common if no further info needs to be conveyed). In either case, the server **SHOULD** include a new ETag to signify the new version, and maybe a Content-Type if a body is returned. For example:
```
HTTP/1.1 204 No Content
ETag: "def789012"
```
This tells the client the update went through and provides the new `ETag`. If the server chose to return the updated content, it might use `200 OK` and include the JSON in the body, along with headers.
* **Error responses:** If the `If-Match` did not match (concurrent modification), the server could return `412 Precondition Failed` (meaning the precondition header failed) or `409 Conflict` – our earlier abstract description used Conflict for concurrency issues, and 409 is a natural mapping for that scenario. If the resource did not exist, a PUT meant as an update will result in `404 Not Found` (unless the intent was to create, but typically clients use PUT for create only when they are sure of what they’re doing, or they use it as upsert without If-Match). If the client is not authorized, `403 Forbidden` (or 401 Unauthorized if no valid credentials were provided). If the request payload is not valid, `400 Bad Request`.

**PATCH (partial update)** – The HTTP PATCH method [[RFC5789]] allows a client to specify partial modifications to a resource, rather than sending the whole new content. This is useful for large resources where sending the entire content would be inefficient if only a small part changed, or for concurrent editing where you want to apply specific changes. LWS server **MUST** minimally support JSON Merge Patch (application/merge-patch+json) as defined in [[RFC7386]].

**Update Resource Metadata (HTTP PUT / PATCH on Linkset)**
A resource's metadata is updated by modifying its corresponding linkset resource, discovered via the Link header with rel="linkset".
Full Replacement (PUT): A PUT request to the linkset URI with a complete linkset document in the body replaces all metadata for the resource.
Partial Update (PATCH): A PATCH request to the linkset URI adds, removes, or modifies specific links.

**Concurrency Control for Metadata**
Because a resource's metadata can be modified by multiple actors, preventing concurrent overwrites is critical. To ensure data integrity, LWS servers and clients MUST implement optimistic concurrency control using conditional requests [[RFC 7232](https://datatracker.ietf.org/doc/html/rfc7232)] for all PUT and PATCH operations on a linkset resource.
Server Responsibilities:
A server **MUST** include an Etag header in its responses to GET and HEAD requests for a linkset resource.
Upon a successful PUT or PATCH on the linkset, the server MUST generate a new, unique Etag value for the modified linkset and return it in the Etag header of the response.
Client Responsibilities:
When modifying a linkset resource, a client MUST include an If-Match header containing the most recent Etag it received for that resource.
Processing Rules:
If the If-Match header value does not match the linkset's current Etag, the server MUST reject the request with a 412 Precondition Failed status code.
If the If-Match header is missing from a PUT or PATCH request to a linkset URI, the server MUST reject the request with a 428 Precondition Required status code [[RFC 6585](https://datatracker.ietf.org/doc/html/rfc6585#section-3)].
Example (PUT to replace a linkset):
A client first fetches the linkset and receives its ETag.
```
GET /alice/personalinfo.json.meta HTTP/1.1
Authorization: Bearer <token>
Accept: application/linkset+json
HTTP/1.1 200 OK
Content-Type: application/linkset+json
ETag: "meta-v1"
{
  "linkset": [
    {
      "anchor": "/alice/personalinfo.json",
      "describedby": [ { "href": "/schemas/personal-info.json" } ]
    }
  ]
}
```
The client now wants to add a license. It constructs a new, complete linkset document and sends a PUT request with the If-Match header.
```
PUT /alice/personalinfo.json.meta HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/linkset+json
If-Match: "meta-v1"
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
If successful, the server responds with success and the new ETag.
```
HTTP/1.1 204 No Content
ETag: "meta-v2"
```

**Summary of Update Rules**
If you want to change only the content of a resource → PUT/PATCH the resource itself.
If you want to change only the links (metadata) of a resource → PUT/PATCH the resource’s associated linkset resource.
If you want to change both content and links → PUT/PATCH the resource itself, including the appropriate Link headers AND 'Prefer: set-linkset'. Setting both is off by default.