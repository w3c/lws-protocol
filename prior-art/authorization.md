## Solid CG

### Groups

#### Member list

* [WAC `acl:agentGroup`](https://solidproject.org/TR/wac#acl-agentgroup) relies on `vcard:Groupa` to list all members. It has limited applicability to situations where those listings are publicly readable.
  * [Members of private group can't access it CSS#1442](https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1442)
* ACP could have reusable matchers that act as group listings (local to the ACP server).
* SAI has a proposal for roles/teams, in which group listings are also local to the security domain. 

#### Verifiable Credentials

When listings of group members are not publicly readable, VC representing group membership could be used. In this case access policy would specify WebID of a group and type of a VC (`ex:MembershipCredential`). It would require that group can issue VCs, and clients used by members can present them to the AS in security domain of protected resource (for example UMA claims). Authorization system would need to verify presented credential being issued by the group designated in access policy.

#### Delegation

This approach also doesn't rely on group membership listings being publicly readable. Authorization policy is set to some group and that group can delegate it using its internal policies. It also is more flexible than predetermined *members* list or *membership credential*. At least two approaches are bring explored.
* [MANDAT using proxies](https://github.com/w3c/lws-ucs/issues/27)
* SAI using delegated access grants. This includes two variants
  * [Support longer delegation chains #222
  ](https://github.com/solid/data-interoperability-panel/issues/222) / [Endpoint to notify the data owner of a new Delegated Data Grant SAI#328](https://github.com/solid/data-interoperability-panel/issues/328) - ongoing implementation in https://sai.js.org and https://activitypods.org
  * Presenting delegation as [VC/VP](https://kyledenhartog.com/delegation-in-verifiable-credentials/) or [ZCAP-LD](https://w3c-ccg.github.io/zcap-spec/)

