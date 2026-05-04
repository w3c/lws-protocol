# Notifications

The [LWS Notifications](../../lws10-notifications/index.html) specification extends the Linked Web Storage (LWS) protocol with a mechanism for clients to receive timely updates about changes to resources. Three notification channels are defined:

- **Server-Sent Events** — streaming updates over an EventSource connection
- **WebSocket** — real-time bidirectional notification channel
- **Webhooks** — server-to-server push notifications with HTTP Message Signatures

All channels share a common notification data model based on Activity Streams and are discoverable via the storage description resource.
