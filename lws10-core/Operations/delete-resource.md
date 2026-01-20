Permanently removes a resource and its associated metadata.

* **Inputs**: Target identifier, an optional recursive flag (for containers), and optional concurrency constraints.
* **Behavior**:
    * For non-container resources, the server removes the content, metadata, and updates the parent container's membership.
    * For containers, the server typically requires the container to be empty unless a recursive delete is explicitly requested and supported.
* **Outcome**: Confirmation of removal or a notification of failure.