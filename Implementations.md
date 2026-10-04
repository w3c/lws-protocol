# LWS Implementations

## Software

* ● Applicable
* ◐ Partially Applicable
* ○ Not Applicable

| Name | Contact | License | Client | Server |
|------|---------|---------|--------|--------|
| [lws-server](https://github.com/ebremer/lws-server) | [@ebremer](https://github.com/ebremer) | Apache License 2.0 |  ○  |  ●  |
| [lws-authn](https://github.com/ebremer/lws-authn) | [@ebremer](https://github.com/ebremer) | Apache License 2.0 |  ○  |  ●  |
| [Halcyon](https://github.com/halcyon-project/Halcyon) | [@ebremer](https://github.com/ebremer) | Apache License 2.0 |  ○  |  ●  |
| [sparq](https://sparq.jeswr.org/) | [Jesse Wright](https://jeswr.org/#me) | MIT | ○ | ● |
| [Community Solid Server](https://communitysolidserver.github.io/CommunitySolidServer/) | [@jeswr](https://github.com/jeswr) | MIT | ○ | ● |
| [sai-js](https://sai.js.org) | [@elf-pavlik](https://github.com/elf-pavlik) | MIT | ● | ◐ [^1] |
|      |         |         |        |        |
|      |         |         |        |        |

## Features

*all 🔗 links are optional*

* 💡 Interested
* 🎯 Committed  (🔗 tracking issue)
* 🚧 Implementing (🔗 code or feature branch)
* ✅ Conforming (🔗 test results)


### Containers, Data Resources, Discovery and Linksets

* https://www.w3.org/TR/lws10-core/#containers
* https://www.w3.org/TR/lws10-core/#discovery
* https://www.w3.org/TR/lws10-core/#operations
* https://www.w3.org/TR/lws10-core/#metadata

| Name | Client | Server | Notes |
|------|--------|--------|-------|
| lws-server | | 🚧| [branch](https://github.com/ebremer/lws-server/tree/master) · [conformance](https://ebremer.com/lws/conformance) |
| Halcyon | | 🚧| [branch](https://github.com/halcyon-project/Halcyon/tree/next) · [conformance](https://ebremer.com/lws/conformance) |
| CommunitySolidServer | | 🚧| [branch](https://github.com/jeswr/CommunitySolidServer/tree/feat/lws) |
|  |  |  |  |


### Authentication & Authorization

* https://github.com/ebremer/lws-authn
* https://www.w3.org/TR/lws10-core/#authorization
* https://github.com/lws-contrib/lws-test-suite/tree/main/lws10/auth


| Name | Client | Server | Notes |
|------|--------|--------|-------|
| lws-server | | 🚧| [branch](https://github.com/ebremer/lws-server/tree/master) · [conformance](https://ebremer.com/lws/conformance) |
| Halcyon | | 🚧| [branch](https://github.com/halcyon-project/Halcyon/tree/next) · [conformance](https://ebremer.com/lws/conformance) |
| lws-authn  | | 🚧|
|  |  |  |  |


#### OpenID Connect

* https://w3c.github.io/lws-protocol/lws10-authn-openid/

| Name | Client | Server | Notes |
|------|--------|--------|-------|
| lws-server | | 🚧| [branch](https://github.com/ebremer/lws-server/tree/master) · [conformance](https://ebremer.com/lws/conformance) |
| Halcyon | | 🚧| [branch](https://github.com/halcyon-project/Halcyon/tree/next) · [conformance](https://ebremer.com/lws/conformance) |
| lws-authn  | | 🚧|
| sai-js | | 💡|
|  |  |  |  |

#### SAML 2.0

* https://w3c.github.io/lws-protocol/lws10-authn-saml/

| Name | Client | Server |
|------|--------|--------|
| lws-authn  | | 🚧|
|  |  |  |

#### Self-signed Controlled Identifier

* https://w3c.github.io/lws-protocol/lws10-authn-ssi-cid/

| Name | Client | Server | Notes |
|------|--------|--------|-------|
| lws-server | | 🚧| https, did:key · [branch](https://github.com/ebremer/lws-server/tree/master) · [conformance](https://ebremer.com/lws/conformance) |
| Halcyon | | 🚧| https, did:key · [branch](https://github.com/halcyon-project/Halcyon/tree/next) · [conformance](https://ebremer.com/lws/conformance) |
| lws-authn  | | 🚧| https, did:key |
| sai-js | | 💡|
|  |  |  |  |

### Access Requests and Grants

* https://w3c.github.io/lws-protocol/lws10-core/#access-requests-and-grants

| Name | Client | Server | Notes |
|------|--------|--------|-------|
| lws-server | | 🚧| [branch](https://github.com/ebremer/lws-server/tree/master) · [conformance](https://ebremer.com/lws/conformance) |
| Halcyon | | 🚧| [branch](https://github.com/halcyon-project/Halcyon/tree/next) · [conformance](https://ebremer.com/lws/conformance) |
| sai-js | | 🚧|
|  |  |  |  |

#### ODRL Access Profile

* https://w3c.github.io/lws-protocol/lws10-core/#access-profile

| Name | Client | Server | Notes |
|------|--------|--------|-------|
| lws-server | | 🚧| [branch](https://github.com/ebremer/lws-server/tree/master) · [conformance](https://ebremer.com/lws/conformance) |
| Halcyon | | 🚧| [branch](https://github.com/halcyon-project/Halcyon/tree/next) · [conformance](https://ebremer.com/lws/conformance) |
| sai-js | | 💡|
|  |  |  |  |

### Notifications

* https://w3c.github.io/lws-protocol/lws10-core/#notifications

| Name | Client | Server | Notes |
|------|--------|--------|-------|
| lws-server | | 🚧| [branch](https://github.com/ebremer/lws-server/tree/master) · [conformance](https://ebremer.com/lws/conformance) |
| Halcyon | | 🚧| [branch](https://github.com/halcyon-project/Halcyon/tree/next) · [conformance](https://ebremer.com/lws/conformance) |
| sai-js | | 🚧|
|  |  |  |  |

#### Webhook

* https://w3c.github.io/lws-protocol/lws10-notifications-webhook/

| Name | Client | Server | Notes |
|------|--------|--------|-------|
| lws-server | | 🚧| [branch](https://github.com/ebremer/lws-server/tree/master) · [conformance](https://ebremer.com/lws/conformance) |
| Halcyon | | 🚧| [branch](https://github.com/halcyon-project/Halcyon/tree/next) · [conformance](https://ebremer.com/lws/conformance) |
| sai-js | | 🚧|
|  |  |  |  |

#### Streaming HTTP

* https://github.com/w3c/lws-protocol/pull/162 

| Name | Client | Server | Notes |
|------|--------|--------|-------|
| sai-js | | 🚧| NDJSON |
|  |  |  |

#### Webhook

* https://w3c.github.io/lws-protocol/lws10-notifications-webhook/

| Name | Client | Server | Notes |
|------|--------|--------|-------|
| sai-js | | 💡|
|  |  |  |

#### Type Index and Type Search

* https://w3c.github.io/lws-protocol/lws10-searchindex

| Name | Client | Server | Notes |
|------|--------|--------|-------|
| lws-server | | 🚧| [branch](https://github.com/ebremer/lws-server/tree/master) · [conformance](https://ebremer.com/lws/conformance) |
| Halcyon | | 🚧| [branch](https://github.com/halcyon-project/Halcyon/tree/next) · [conformance](https://ebremer.com/lws/conformance) |
| sai-js | 💡| 💡|
|  |  |  |  |

## Notes

[^1]: sai-js server is implemented as custom components for [Community Solid Server](https://communitysolidserver.github.io/CommunitySolidServer/)
