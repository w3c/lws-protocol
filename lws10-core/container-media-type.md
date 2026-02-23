### Container Media Type

Container representations MUST be served using the following media type:

```
application/ld+json; profile="https://www.w3.org/ns/lws/v1"
```

This media type indicates a JSON-LD document conforming to the LWS container vocabulary. Servers MUST use this media type in the `Content-Type` header when responding to requests for container resources. Clients MUST use this media type in the `Content-Type` header when creating new containers.

Although container representations are valid JSON-LD, clients MAY process them as plain JSON without invoking a full JSON-LD processor. The `@context` property in the representation provides the mapping to the LWS vocabulary, but all property names used in container representations are short, predictable tokens (e.g., `id`, `type`, `items`, `totalItems`) that can be consumed directly as JSON keys.
