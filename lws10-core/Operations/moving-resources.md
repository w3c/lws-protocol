This specification does not define a dedicated operation for moving a <a>served resource</a> from one <a>container</a> to another. A move is instead expressed as an update of the <a>containment</a> metadata of the resource: a client changes the `up` link in the resource's <a>linkset resource</a> to point at the destination <a>container</a>, using the [update resource](#update-resource) operation. The server derives the effective move from that change.

<div class="note">
A move cannot be reduced to a <a href="#create-resource">create resource</a> operation followed by a <a href="#delete-resource">delete resource</a> operation. Servers assign resource identifiers, so a client that recreates the content in another <a>container</a> cannot preserve the identifier of the original resource, and every link pointing at that identifier is broken as a result. The two requests are also not atomic: an observer may see the resource in both <a>containers</a>, or in neither. Expressing the move as a change to the <a>containment</a> metadata avoids both problems, because the identity of the resource and its content are untouched by the change.
</div>

**Server support:**
The `up` link is managed by the server, and servers are not required to allow clients to modify it, as described in [](#metadata). A server that allows clients to modify the `up` link of a resource, and thereby to move resources between <a>containers</a>, MUST advertise this in its <a>storage description</a>, as described in [](#storage-description-capabilities), and MUST implement the requirements in this section. A server that does not allow it MUST reject the request with 403 Forbidden, and MUST NOT advertise `up` as a modifiable link relation.

**Requesting a move:**
A client moves a resource by applying a partial update to the resource's <a>linkset resource</a>, replacing the target of the `up` link with the identifier of the destination <a>container</a>. As required by [](#metadata), servers MUST support `application/merge-patch+json` [[RFC7386]] for this update, and clients MUST include an `If-Match` header field carrying the current ETag of the <a>linkset resource</a>.

The destination MUST be an existing <a>container</a> within the same <a>storage</a>. Servers MUST reject a patch whose `up` link does not identify such a <a>container</a> with 409 Conflict, and a patch that leaves the resource without an `up` link with 409 Conflict, as every non-root resource is reachable from the <a>storage root</a>.

<p class="issue" data-number="148">
JSON Merge Patch replaces arrays as a whole, so a patch that carries the `linkset` array replaces every link context in the <a>linkset resource</a>, not only the `up` link. This specification requires servers to preserve the links a client is not permitted to modify, but a client that also maintains user-defined links has to restate them in every patch. The Working Group may want to consider a link-scoped patch format for <a>linkset resources</a>, along the lines of the `application/linkset-patch+json` media type sketched in <a href="https://github.com/w3c/lws-protocol/pull/83">w3c/lws-protocol#83</a>.
</p>

**Effect on <a>containment</a>:**
On a successful update, the server MUST atomically remove the resource from the `items` list of its former parent <a>container</a> and add it to the `items` list of the destination <a>container</a>. The `totalItems` count of both <a>containers</a> SHOULD be updated accordingly, and the ETag of both <a>containers</a> MUST be updated to reflect the change.

The content of the moved resource and its user-defined metadata are unaffected by the move. Servers MUST preserve the links in the <a>linkset resource</a> that the client is not permitted to modify, including server-managed links such as `linkset` and `type`. <a>Auxiliary resources</a> whose lifetime is bound to the moved resource remain bound to it after the move.

Servers MUST reject an update that would violate the <a>containment</a> integrity requirements in [](#logical-resource-organization) with 409 Conflict. In particular, a <a>container</a> MUST NOT be moved into itself or into one of its own descendants, as this would introduce a cycle in the <a>containment</a> hierarchy.

**Identity of the moved resource:**
The URI of a resource is independent of its position in the <a>containment</a> hierarchy, as described in [](#logical-resource-organization). Servers SHOULD therefore preserve the identifier of a moved resource, so that existing links to it remain valid, and SHOULD indicate whether they do so with the `preservesIdentifier` property of the advertised capability.

A server that cannot preserve the identifier MUST respond with 200 OK and a representation of the updated <a>linkset resource</a> whose `anchor` is the new identifier of the resource, and MUST include a `Content-Location` header field carrying the new identifier of the <a>linkset resource</a> itself. Such a server SHOULD respond to subsequent requests on the previous identifiers of the resource and of its <a>auxiliary resources</a> with 301 Moved Permanently, including a `Location` header field pointing at the new identifier.

**Moving <a>containers</a>:**
Servers MAY support modifying the `up` link of a <a>container</a>, in which case the descendants of that <a>container</a> move with it and their identifiers are subject to the same requirements as those of the moved <a>container</a>. A server that supports moving resources but not <a>containers</a> MUST reject the request with 403 Forbidden, and MUST restrict the advertised capability to <a>data resources</a>.

**Authorization:**
A server MUST NOT apply a change to an `up` link unless the requesting <a>agent</a> is authorized both to perform the [delete resource](#delete-resource) operation on the resource being moved and to perform the [create resource](#create-resource) operation in the destination <a>container</a>. When a <a>container</a> is moved, this requirement applies to every resource in the moved subtree.

<div class="note">
Access to a resource is frequently governed by policies that are expressed in terms of the resource's position in the <a>containment</a> hierarchy. Moving a resource may therefore change who can access it, in either direction, without any policy being edited. Servers SHOULD make this consequence visible to <a>storage controllers</a>, and clients SHOULD warn <a>agents</a> before moving resources between <a>containers</a> that are governed by different policies. See <a href="#security-moving-resources"></a> and <a href="#privacy-moving-resources"></a>.
</div>

**Example (move a data resource to another container):**
```
PATCH /alice/notes/shoppinglist.txt.meta HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Content-Type: application/merge-patch+json
If-Match: "meta-v3"

{
  "linkset": [{
    "anchor": "/alice/notes/shoppinglist.txt",
    "up": [{ "href": "/alice/archive/" }]
  }]
}
```
Assuming the client is authorized, `/alice/archive/` exists, and the server preserves resource identifiers, the server removes the resource from the `items` list of `/alice/notes/`, adds it to the `items` list of `/alice/archive/`, and updates the <a>linkset resource</a>, atomically:
```
HTTP/1.1 204 No Content
ETag: "meta-v4"
Link: </alice/archive/>; rel="up"
```
The resource remains available at `/alice/notes/shoppinglist.txt`, and is now a member of `/alice/archive/`.

**Example (move where the server assigns a new identifier):**
```
PATCH /alice/notes/shoppinglist.txt.meta HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Content-Type: application/merge-patch+json
If-Match: "meta-v3"

{
  "linkset": [{
    "anchor": "/alice/notes/shoppinglist.txt",
    "up": [{ "href": "/alice/archive/" }]
  }]
}
```
A server whose identifiers reflect the <a>containment</a> hierarchy cannot preserve the identifier and reports the resulting identifiers in the updated <a>linkset resource</a>:
```
HTTP/1.1 200 OK
Content-Type: application/linkset+json
Content-Location: /alice/archive/shoppinglist.txt.meta
ETag: "meta-v4"

{
  "linkset": [{
    "anchor": "/alice/archive/shoppinglist.txt",
    "up": [{ "href": "/alice/archive/" }],
    "linkset": [{ "href": "/alice/archive/shoppinglist.txt.meta",
                  "type": "application/linkset+json" }]
  }]
}
```

**Example (move a container into one of its own descendants):**
```
PATCH /alice/notes/.meta HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Content-Type: application/merge-patch+json
If-Match: "meta-v7"

{
  "linkset": [{
    "anchor": "/alice/notes/",
    "up": [{ "href": "/alice/notes/2026/" }]
  }]
}
```
The server refuses the update, as it would introduce a cycle in the <a>containment</a> hierarchy:
```
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "title": "Cannot move a container into one of its own descendants",
  "status": 409,
  "detail": "/alice/notes/2026/ is a descendant of /alice/notes/"
}
```

**Notifications:**
A server that supports moving resources and emits notifications SHOULD describe a successful move with a single `Move` activity, as described in [](#activity-types), rather than with a separate `Delete` and `Create` activity.
