(function () {
    var threat = {
        id: "T3",
        name: "Client ID Impersonation",
        desc: "The Client (Client A) may pretend to be another Client (Client B), to circumvent Client-based authorization decisions. The User Authorization Server may or may not collude with the Client.",
        response: [
            {
                id: "R4",
                name: "Verification from User Authorization Server",
                type: "Transfer and Reduce",
                desc: "The User Authorization Server verifies the identity of the Client, such as by checking the Origin matches the targets in the Client's CID Document. This attests the Client CID. It requires no additional resource consumption from the Resource Authorization Server, but relying on the trust of User Authorization Server.",
            },
            {
                id: "R5",
                name: "...",
                type: "...",
                desc: "...",
            },
        ],
        elements: ["F4"],
        taxonomyName: "STRIDE",
        taxonomyClass: "Tampering",
    };

    window.ThreatModel.register(threat);
})();
