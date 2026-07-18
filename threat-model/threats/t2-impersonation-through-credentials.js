(function () {
    var threat = {
        id: "T2",
        name: "Impersonation through Credentials",
        desc: "The LWS Client may impersonate the User by using the user' access Credentials to access LWS Resources without the user's knowledge.",
        response: [
            {
                id: "R2",
                name: "Frontend-only Ephemeral Apps",
                type: "Reduce",
                desc: "Requiring the Client to be an ephemeral app, whose whole lifecycle is in the browser, and does not store anything externally (apart from the LWS Resources). This circumvents the impersonation from the current Client.",
            },
            {
                id: "R3",
                name: "Securely Manages Access Credentials",
                type: "Transfer",
                desc: "The User's access Credentials are securely stored and managed in a location where only the corresponding Client can use (e.g. browser's Cookie with `HttpOnly` and `Strict`). This prohibits Client B from using the Credentials issues to Client A. This transfers the threat from the Client or Client Admin to the underlying technology (e.g. browser).",
            },
        ],
        elements: ["P3", "P4", "P5"],
        taxonomyName: "STRIDE",
        taxonomyClass: "Spoofing",
    };

    window.ThreatModel.register(threat);
})();
