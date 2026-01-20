Modifies the state of an existing [served resource] via full replacement or a partial patch.

* **Inputs**: Target identifier, new content, and optional concurrency constraints.
* **Behavior**: The server applies the changes atomically. If concurrency constraints are provided, the update is rejected if the resource has been modified since it was last read by the requester.
* **Outcome**: Confirmation of the update or a notification of conflict.