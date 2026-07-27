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
                desc: "The User Authorization Server verifies the identity of the Client, issuing a proof accompanying the Client's request to Resource Authorization Server, which in turn verifies that the proof is authentic. This transfers the verification to User Authorization Server, thus requiring trusting User Authorization Server.",
            },
        ],
        elements: ["P2", "P3", "P5"],
        taxonomyName: "STRIDE",
        taxonomyClass: "Spoofing",
    };

    window.ThreatModel.register(threat);
})();
