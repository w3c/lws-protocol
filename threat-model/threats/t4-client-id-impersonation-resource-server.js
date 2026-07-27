(function () {
    var threat = {
        id: "T4",
        name: "Client ID Impersonation (to Resource Authorization Server)",
        desc: "The Client (Client A) may pretend to be another Client (Client B), to gain authorization to Resources it should not have.",
        response: [
            {
                id: "R5",
                name: "Verification and Proof from User Authorization Server",
                type: "Transfer",
                desc: "The User Authorization Server verifies the identity of the Client, issuing a proof accompanying the Client's request to Resource Authorization Server, which in turn verifies that the proof is authentic with the User Authorization Server. This transfers the verification to User Authorization Server, thus requiring trusting User Authorization Server.",
            },
            {
                id: "R6",
                name: "Verification from Resource Authorization Server",
                type: "Reduce",
                desc: "The Resource Authorization Server verifies the identity of the Client. Because there is no OIDC redirect during this interaction, this verification requires a different mechanism from the CID Document verification in R4. An appropriate different mechanism is therefore needed.",
            },
        ],
        elements: ["P2", "P3", "P5"],
        taxonomyName: "STRIDE",
        taxonomyClass: "Spoofing",
    };

    window.ThreatModel.register(threat);
})();
