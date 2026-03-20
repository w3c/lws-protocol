 - ldp:contains
 - Type of contained documents (e.g. RDF, non-RDF)
 - 

 - `stat:size`
 - `dcterms:modified`
 - `stat:mtime`


Shelved:
 - Hash of the container

```json
{
  "@context": "",
  "contains": {
    "items": [{
      // Any items that come from the link-set metadata could also be here

      // Prefer headers could also be used to establish the level of details that appear here
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Prefer
      // MUST
      "id": {location},
      // MUST (for user-defined)
      "type": [container, user-def type],
      // SHOULD for resources, not for containers
      // Large files can attract targeted attacks.
      "size": ...,
      // SHOULD
      "modified": ...,
      // SHOULD
      "created": ...,
      // Parents if a resource if we are not following slash semantics

    }]
  }
}
```

eP requirements for being able to see the children in a container:
 - You have to see the container
 - You have to be able to see the children in that container

PAC:
 - Points of disagreement in containership
   - Parent relationship having side effects that the server needs to account for (e.g. transferring ACLs). There is likely still going to be an expectation that the server will do the "right thing."
   - 
