This section delineates the abstract data model governing the organization of resources within the Linked Web Storage (LWS) system. It encompasses the structuring of containers and resources, their hierarchical interrelations, the functional semantics of containers as organizational units, rules pertaining to containment, and mechanisms for clients to organize and navigate resource collections. This model establishes the logical namespace of the storage, delineating inter-resource relationships therein, without presupposing any specific identifier structure or semantic implications derived from identifier composition.

### Resource

In LWS, a resource constitutes the fundamental unit of storage and access. Each resource possesses a unique identifier within the system. A resource may encompass data, such as content or structured information, alongside associated metadata, including attributes like type or modification timestamps. Resources are categorized into two primary types: container resources and non-container resources. A non-container resource represents an indivisible entity, analogous to a discrete document or file, and does not encompass other resources.

### Container

A container represents a specialized resource type capable of encompassing other resources as members. Containers function as organizational constructs, facilitating the grouping of resources in a manner akin to collections or directories. A container maintains references to its member resources, which may comprise both non-container resources and additional container resources, thereby enabling hierarchical formations. Typically, a container holds minimal intrinsic content beyond metadata or enumerations of its members; its principal role is to aggregate and structure subordinate resources. The storage system's root is designated as a container, serving as the apex organizational unit devoid of a superior parent.

### Containment and Hierarchy

With the exception of the root container, every resource is affiliated with precisely one parent container. This affiliation engenders a strict hierarchical structure, manifesting as a tree with a singular root container at its pinnacle. Upon creation within a designated container, a resource becomes a member of that container, appearing within its membership enumeration. Cycles or multiple parent affiliations are prohibited within this model; a resource cannot concurrently belong to multiple containers without duplication or alternative referencing mechanisms external to the core containment framework. This constraint enhances model simplicity and aligns with conventional organizational paradigms.

### Container Membership Management

Operations involving the creation, deletion, or relocation of resources influence container memberships as follows:

- Upon creation, a new resource is associated with a specified parent container. This association integrates the resource into the parent's membership.
- Deletion of a resource entails its removal from the parent container's membership. Should this render the container devoid of members, it assumes an empty state, potentially permitting its subsequent deletion if warranted. Container deletion typically necessitates an empty state or invokes recursive removal of members.
- The core operations (create, read, update, delete) do not incorporate an explicit relocation or renaming function. To reassign a resource to an alternative container, a client may replicate or recreate the resource in the target location followed by deletion of the original. Implementations may optionally extend non-core operations for relocation or renaming, achievable logically through combined creation and deletion.

### Container Creation

Container instantiation occurs via the standard resource creation operation, differentiated by an indicator specifying the intent to establish a container rather than a non-container resource. This process yields an empty container amenable to subsequent population with members, including sub-containers to extend the hierarchy.

### Navigating and Listing Resources

Clients navigate the hierarchy through read operations on containers, which yield enumerations of member identifiers. A container's representation furnishes a listing of its members, enabling traversal and discovery of subordinate resources.