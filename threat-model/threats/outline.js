(function () {
    var threatCategories = [
        {
            name: "Client Threats",
            id: "threat-model-client-threats",
            threats: ["T1", "T2", "T3", "T4"],
        },
    ];

    window.ThreatModel.registerCategories(threatCategories);
})();
