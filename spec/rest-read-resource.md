### **9.2 Read Resource (HTTP GET/HEAD)**

The [read resource](https://w3c.github.io/lws-protocol/spec/#dfn-retrieval) operation requests a [resource representation](https://w3c.github.io/lws-protocol/spec/#dfn-resource-representation) with HTTP **GET** requests (and **HEAD** for header-only requests). The behavior differs slightly depending on whether the target URL is a container (collection) or a non-container resource. 

**GET (non-container resource)** – *Retrieve a resource’s content:*  
 Send GET to the resource URI for full content (if authorized). Respond with 200 OK, body containing the data, and Content-Type matching the stored media type. Support Accept for content negotiation; return original format if no alternatives, or 406 Not Acceptable if unproducible.

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

The server returned the text content (34 bytes in total, as indicated by `Content-Length`). The content is exactly the stored data in the file. The `ETag: "abc123456"` is a version identifier for caching or concurrency purposes. The response includes the exact stored content (34 bytes via Content-Length) and an ETag for caching/concurrency. Support byte ranges \[RFC 7233\](https://datatracker.ietf.org/doc/html/rfc7233) for partial retrieval (e.g., Range: bytes=0-99 yields 206 Partial Content with Content-Range).

**GET (container resource)** – *List a container’s contents:*  
When the target URI corresponds to a container (for example, a URI ending in `/` or one known to be a collection), a GET request will return a listing of the container’s members rather than a file’s raw content. By default, in the absence of a specific format requested, the server **SHOULD** return an HTML page that lists the names (with links) of the resources in the container (this is similar to how a web server might show a directory index). This allows a human to view the contents in a browser easily. For programmatic access, the client can send an `Accept` header for a machine-readable format. For instance, `Accept: application/ld+json` might yield a JSON-LD or JSON listing, `Accept: application/json` could yield a simple JSON array of items, or `Accept: text/turtle` could return an RDF Turtle representation of the container and its members (if the server supports Linked Data semantics). The specification doesn’t mandate a specific default format for container listings, but HTML is a common default for user agents, and a JSON and RDF-based format should be available for clients that need structured data - including `application/json+ld` with a `https://www.w3.org/ns/lws` profile. If the server cannot provide the listing in a requested format, it will return `406 Not Acceptable`.


```bash
HTTP/1.1 200 OK Content-Type: application/json+ld; profile: https://www.w3.org/ns/lws

{
   "@context": "https://www.w3.org/ns/lws",
   "contains": [
      "1.txt",
      "2.txt' 
   ]
}

For example, suppose `/alice/notes/` is a container. A `GET /alice/notes/` might return an HTML page with a list of links to each item (`shoppinglist.txt`, etc.). If the client specifically requests JSON, the response might look like an array or object enumerating the children.

In all cases, the server **SHOULD** include relevant metadata in the response headers. For a container, an `ETag` can represent a version of the listing (which could change when any member is added or removed), and perhaps a header indicating it is a container.

**HEAD (any resource or container)** – *Headers/metadata only:*  
 The LWS server MUST support [HEAD](https://datatracker.ietf.org/doc/html/rfc9110#name-head) for both containers and non-containers.

**Caching and Conditional requests:** LWS being over HTTP can leverage caching. For example, a GET or HEAD may include `If-None-Match` or `If-Modified-Since` headers to make the request conditional on the resource being changed. The server should respond with `304 Not Modified` if the resource (or container listing) has not changed since the version the client knows (as indicated by the `ETag` or timestamp). This avoids sending the content again unnecessarily. While not explicitly in the above text, this is part of using HTTP correctly and LWS servers are expected to support basic HTTP caching semantics.
