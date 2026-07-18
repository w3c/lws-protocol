(function () {
    var threat = {
        id: "T3",
        name: "Client ID Impersonation (with Trustworthy User Authorization Server)",
        desc: "The Client (Client A) may pretend to be another Client (Client B), to gain authorization it should not have.",
        response: [
            {
                id: "R4",
                name: "CID and Environment Verification (from User Authorization Server)",
                type: "Reduce",
                desc: "The User Authorization Server verifies the identity of the Client, by checking the environmental information (e.g. redirect URL, Origin) of the Client matches those specified in the Client CID Document.",
            },
        ],
        elements: ["P3", "P2"],
        taxonomyName: "STRIDE",
        taxonomyClass: "Spoofing",
    };

    window.ThreatModel.register(threat);
})();
