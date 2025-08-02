**9.1 Create Resource** **( HTTP POST / PUT )**

New resources can be created on the storage server using either a POST (for letting the server assign a URI within a container) or PUT (for creating an agent-specified URI).

**POST (to a container URI)** – *Create with server-assigned name:*  
Use POST to add a new resource inside an existing container, letting the server assign or modify the final name (optionally suggested via the Slug header). Send the request to the container's URI with a Content-Type header matching the uploaded data (omit for empty resources like containers) and the new content in the body. The server may honor the Slug if it doesn't conflict with naming rules.

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

On success, return 201 Created with the new URI in the Location header. The body may be empty or a minimal representation (e.g., JSON confirmation). Include relevant headers like ETag (e.g., "def789012") and Content-Type matching the created resource; Content-Length: 0 indicates no body.

If the target container `/alice/notes/` does not exist, the server MUST return an error (HTTP 404 Not Found) because the location to create the resource is invalid. If the client is not authorized to write to that container, the server returns 403 Forbidden. If the request violated any server constraints (like size or type restrictions), the server would return 400 Bad Request (often with a description of the issue in the body).

**PUT (to a specific resource URI)** – *Create or replace at client-specified URI:*  
Use PUT to create at a client-specified URI or replace an existing resource there (idempotent per \[RFC 7231\](https://datatracker.ietf.org/doc/html/rfc7231), so repeats yield the same result without duplicates).

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

* POST is not idempotent. Repeating it may create duplicates; avoid unintentional retries or use unique identifiers/checks to prevent this.

* When using PUT, the operation is **idempotent**. Repeating a PUT with the same content to the same URI should result in the same state as a single execution. This makes PUT suitable for scenarios where clients might retry due to uncertainty of the outcome (e.g., network failures), as it won’t multiply resources.

* Creating Containers: To create a new container (folder) via the REST API, a client can also use POST or PUT.   For container creation the client **MUST** end a target URI with a trailing slash to indicate a container.