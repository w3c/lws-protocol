(function () {
    var threat = {
        id: "T1",
        name: "Injected Identity Providers",
        desc: "The Client may tamper the User's Web-CID Document, given it has right permissions. It may inject a malicious *issuer* itself controls, directly leading to user impersonation.",
        response: [
            {
                id: "R1",
                name: "Access Control Protection",
                type: "Reduce",
                desc: 'The User or Agent sets appropriate Access Control rules, permitting only trustworthy Clients in modifying the content of the Web-CID Document. Care should be taken not to disallow *any* modifications from any Client. The power of this response depends on the Access Control model the Authorization Server supports.',
            },
            {
                id: "R2",
                name: "External Web-CID Document",
                type: "Reduce",
                desc: "Instead of having the Web-CID Document as a Storage Resource, serve it as an external resource. This prevents the LWS Client from modifying Web-CID Document through LWS protocol; the external service can use custom mechanisms to protect the Web-CID Document. But this does not prevent the same LWS Client supporting other protocols to modify the Web-CID Document.",
            },
        ],
        elements: ["P1", "C2", "C3", "C4"],
        taxonomyName: "STRIDE",
        taxonomyClass: "Spoofing",
    };

    window.ThreatModel.register(threat);
})();
