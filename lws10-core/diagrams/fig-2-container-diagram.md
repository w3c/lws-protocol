# LWS Protocol — Container Diagram (C4 Level 2)

```mermaid
C4Container
  title LWS Protocol — container diagram

  Person(user, "User", "Person accessing resources")
  System(client, "Client application", "Requests and manages resources")
  System_Ext(idp, "Identity provider", "Issues signed credentials")
  System_Ext(ext, "External resources", "Web resources under management")

  Boundary(lws, "LWS server") {
    Container(authn, "Authentication", "Validates credential against identity provider")
    Container(authz, "Authorization", "Enforces resource manager access decisions")
    Container(rm, "Resource Management", "Manages containers, containment and linksets")
    Container(era, "External Resource Access", "Mediates access to external web resources")
  }

  Rel(user, client, "uses")
  Rel(client, authn, "presents credential")
  Rel(authn, idp, "validates credential")
  Rel(authn, authz, "confirmed identity")
  Rel(authz, rm, "permitted operation")
  Rel(rm, era, "resolves resource")
  Rel(era, ext, "accesses")
```
Issue: The internal organisation of container, containment, and linkset management within the LWS server is not yet defined in the protocol. This diagram reflects current terminology and is subject to revision.
