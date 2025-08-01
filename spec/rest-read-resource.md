### **9.2 Read Resource (HTTP GET/HEAD)**

The [read resource](https://w3c.github.io/lws-protocol/spec/#dfn-retrieval) operation requests a [resource representation](https://w3c.github.io/lws-protocol/spec/#dfn-resource-representation) with HTTP **GET** requests (and **HEAD** for header-only requests). The behavior differs slightly depending on whether the target URL is a container (collection) or a non-container resource. 

**GET (non-container resource)** – *Retrieve a resource’s content:*  
 A standard HTTP GET request to the resource’s URI will retrieve the full content of that resource, provided the client is authorized. The server responds with `200 OK` and the entity body containing the resource data. The `Content-Type` of the response will match the resource’s stored media type (for example, if it’s an image stored as `image/png`, that will be the Content-Type, and the binary image bytes will be in the body; if it’s a text or JSON file, the exact text is returned). If the client includes an `Accept` header, the server will use content negotiation: it will try to return the representation in a format the client can accept. However, unless the server has multiple representations or can transform the data, typically it will just return the original format. If the client requests a format that is not available and cannot be produced, the server will return `406 Not Acceptable`.

**Example (GET a file):**

```
GET /alice/notes/shoppinglist.txt HTTP/1.1
Authorization: Bearer <token>
Accept: text/plain
```

This requests the content of `/alice/notes/shoppinglist.txt`, indicating that the client wants it in text form. Assuming the resource exists, is text, and the client has access:

```
HTTP/1.1 200 OKContent-Type: text/plain; charset=UTF-8Content-Length: 34ETag: "abc123456"milk
cheese
breadguacamole
Pepsi
Milka barshash
eggs
```

The server returned the text content (34 bytes in total, as indicated by `Content-Length`). The content is exactly the stored data in the file. The `ETag: "abc123456"` is a version identifier for caching or concurrency purposes. If no `Accept` header were given, the server would have returned the content in its default format (which in this case is also text/plain). If the client had asked for, say, `Accept: application/json`, the server likely would have returned `406 Not Acceptable` unless it had a way to convert this text to JSON. Range requests: The server supports HTTP byte ranges \[[RFC 7233](https://datatracker.ietf.org/doc/html/rfc7233)\], so if the client included a `Range` header (e.g., `Range: bytes=0-99` to get the first 100 bytes), the server would return a `206 Partial Content` with just that portion of the data and appropriate `Content-Range` headers. This is useful for large resources or resuming interrupted transfers.

**GET (container resource)** – *List a container’s contents:*  
When the target URI corresponds to a container (for example, a URI ending in `/` or one known to be a collection), a GET request will return a listing of the container’s members rather than a file’s raw content. By default, in the absence of a specific format requested, the server **SHOULD** return an HTML page that lists the names (with links) of the resources in the container (this is similar to how a web server might show a directory index). This allows a human to view the contents in a browser easily. For programmatic access, the client can send an `Accept` header for a machine-readable format. For instance, `Accept: application/ld+json` might yield a JSON-LD or JSON listing, `Accept: application/json` could yield a simple JSON array of items, or `Accept: text/turtle` could return an RDF Turtle representation of the container and its members (if the server supports Linked Data semantics). The specification doesn’t mandate a specific default format for container listings, but HTML is a common default for user agents, and a JSON or RDF-based format should be available for clients that need structured data. If the server cannot provide the listing in a requested format, it will return `406 Not Acceptable`.

For example, suppose `/alice/notes/` is a container. A `GET /alice/notes/` might return an HTML page with a list of links to each item (`shoppinglist.txt`, etc.). If the client specifically requests JSON, the response might look like an array or object enumerating the children.

In all cases, the server **SHOULD** include relevant metadata in the response headers. For a container, an `ETag` can represent a version of the listing (which could change when any member is added or removed), and perhaps a header indicating it is a container.

**HEAD (any resource or container)** – *Headers/metadata only:*  
 An HTTP HEAD request is identical to GET except that the server **MUST NOT** send a message body in the response. It’s used to fetch the headers (metadata) for a resource or to check if it exists, without downloading the content. The LWS server should support HEAD for both containers and non-containers. For a non-container resource, HEAD returns the same headers that a GET would (Content-Type, Content-Length, `ETag`, etc.) but no body. This is useful for, e.g., checking if a cached copy is still valid (via ETag or Last-Modified) or simply checking existence (a HEAD yielding `200 OK` means the resource exists and the client is allowed to see it; a 404 means it doesn’t exist or not allowed). For a container, HEAD might return headers like an ETag for the container listing, or simply a `200 OK` with no body, which at least confirms the container exists and the client has access.

If a resource doesn’t exist, a HEAD request should return `404 Not Found` (just like GET would, but again with no body). If the client isn’t authorized, the server should return 403 or 404 as appropriate (mirroring the GET behavior, where `403 Forbidden` is for known-but-forbidden, and 404 Not Found might be used to avoid revealing existence to unknown clients).

**Caching and Conditional requests:** LWS being over HTTP can leverage caching. For example, a GET or HEAD may include `If-None-Match` or `If-Modified-Since` headers to make the request conditional on the resource being changed. The server should respond with `304 Not Modified` if the resource (or container listing) has not changed since the version the client knows (as indicated by the `ETag` or timestamp). This avoids sending the content again unnecessarily. While not explicitly in the above text, this is part of using HTTP correctly and LWS servers are expected to support basic HTTP caching semantics.