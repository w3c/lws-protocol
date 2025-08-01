**9.1 Create Resource** **( HTTP POST / PUT )**

New resources can be created on the storage server using either a POST (for letting the server assign a URI within a container) or PUT (for creating an agent-specified URI).

**POST (to a container URI)** – *Create with server-assigned name:*  
Use POST when the client wants to add a new resource inside an existing container and is willing to let the server decide or modify the final resource name (the client may provide a suggestion). The client sends an HTTP POST request to the URI of the container in which the resource should be created. The request must include a `Content-Type` header appropriate to the data being uploaded (unless the resource has no content, e.g., creating an empty container). The body of the request is the content of the new resource (binary or text data). If the client wants to suggest a name for the new resource (as a hint to the server), it can include the `Slug` header with the suggested name. The server is not required to use this name, but it often will if it does not conflict or violate any naming rules.

**Example (POST to create a new resource):**

```
POST /alice/notes/ HTTP/1.1Host: example.comAuthorization: Bearer <token>Content-Type: text/plainContent-Length: 47Slug: shoppinglist.txt
milkeggsbreadbutterapplesorange juice
```

In this example, the client is posting to the container `/alice/notes/`. It provides `text/plain` content (a grocery list) and suggests the name `shoppinglist.txt` for the new resource. If `/alice/notes/` exists and the client is authorized, the server will create a new resource (likely as `/alice/notes/shoppinglist.txt`).

**Example (Response to POST):**

```
HTTP/1.1 201 CreatedLocation: /alice/notes/shoppinglist.txtContent-Type: text/plain; charset=UTF-8ETag: "def789012"Content-Length: 0
```

On success, the server returns `201 Created`. The `Location` header provides the URI of the newly created resource. In this case, the server honored the suggested name. The response body may be empty (as shown) or could include a minimal representation of the created resource (for example, some servers might return a short confirmation in JSON or other format). The server also includes any relevant headers, such as an `ETag` for the new resource’s content (here `"def789012"`). The `Content-Type` in the response indicates the media type of the resource that was created (in this case text/plain, matching what was sent). A `Content-Length: 0` indicates no body is returned.

If the target container `/alice/notes/` does not exist, the server MUST return an error (HTTP 404 Not Found) because the location to create the resource is invalid. If the client is not authorized to write to that container, the server returns 403 Forbidden. If the request violated any server constraints (like size or type restrictions), the server would return 400 Bad Request (often with a description of the issue in the body).

**PUT (to a specific resource URI)** – *Create or replace at client-specified URI:*  
 Use PUT when the client wants to create a resource at a known URI, or replace an existing resource entirely at that URI. The client chooses the exact target URI and sends the request to that address. According to HTTP semantics \[[RFC 7231](https://datatracker.ietf.org/doc/html/rfc7231)\], PUT is defined to be **idempotent** – meaning if you repeat the same PUT request (with the same content to the same URI), the result should be the same and should not create duplicates. PUT thus can serve for both creating a new resource (if none existed at that URI) and updating/replacing an existing resource (if one already exists at that URI), in an idempotent way.

**Example (PUT to create or replace a resource):**

```
PUT /alice/notes/shoppinglist.txt HTTP/1.1Host: example.comAuthorization: Bearer <token>Content-Type: text/plainContent-Length: 47
milkeggsbreadbutterapplesorange juice
```

Here, the client directly PUTs to `/alice/notes/shoppinglist.txt`, specifying the content. If there was no resource at that URI before, the server will create it. If a resource *did* exist there, the server will (by default) replace its content entirely with the new content provided (assuming the client has permission). The outcome for the client is that after the PUT, the resource at that URI contains the given data.

**Example (Response to PUT):**

```
HTTP/1.1 201 CreatedLocation: /alice/notes/shoppinglist.txtContent-Type: text/plain; charset=UTF-8ETag: "def789012"Content-Length: 0
```

This is a possible response indicating that the resource was created (since it did not exist before). The `201 Created` status and `Location` confirm that the URI is now valid. If the resource already existed and was simply replaced, the server might instead return `200 OK` or `204 No Content` to indicate a successful update, rather than 201\. In either case, the server should include an updated `ETag` (or other version indicator) because the content at that URI has changed. As with POST, if any constraints are violated or the content type is unacceptable, a `400 Bad Request` is appropriate. If the client doesn’t have write access, `403 Forbidden` is returned. And if the parent container path (`/alice/notes/`) doesn’t exist (and the server doesn’t allow implicit creation of intermediate containers with PUT), the server would likely return `404 Not Found`.

**Additional notes on Create (HTTP binding):**

* When using POST, the operation is **not idempotent**. If a client repeats the same POST (without some unique identifier to avoid duplication), it may end up creating multiple distinct resources (for example, two shopping lists). Clients should avoid unintentionally retrying POST requests, or use safeguards like unique content or an explicit check, to prevent duplicate creations.

* When using PUT, the operation is **idempotent**. Repeating a PUT with the same content to the same URI should result in the same state as a single execution. This makes PUT suitable for scenarios where clients might retry due to uncertainty of the outcome (e.g., network failures), as it won’t multiply resources.

* Creating Containers: To create a new container (folder) via the REST API, a client can also use POST or PUT.   For container creation the client **MUST** end a target URI with a trailing slash to indicate a container.