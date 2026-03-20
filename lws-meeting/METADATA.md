One possible input: RFC9246 <https://datatracker.ietf.org/doc/html/rfc9264>

Possible elements to include are:
 - describes/describedBy (not in body)
 - [likely server managed] ACL
 - parent
 - data resource type
 - media-type
 - user-defined (e.g. label) - required especially if SLUGs are not respected
 - [server managed] storage
 - [server managed] storage-metadata* (could be similar to what is in OpenID where there is a .well-known)
 - size(?) will likely be optional
 - schema file [???]
