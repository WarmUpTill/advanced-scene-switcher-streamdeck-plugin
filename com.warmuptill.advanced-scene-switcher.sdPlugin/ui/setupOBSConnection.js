function updateStatus(payload) {
    document.getElementById("status").innerText =
        payload.connected ? "Connected to OBS websocket server" : "Not connected to OBS websocket server";
}

function setupOBSConnection() {
    document.getElementById("ip").style.display = "block"
    document.getElementById("port").style.display = "block"
    document.getElementById("password").style.display = "block"
    document.getElementById("apply").style.display = "block"
    document.getElementById("configure").style.display = "none"
}

async function applyOBSConnectionSettings() {
    document.getElementById("ip").style.display = "none"
    document.getElementById("port").style.display = "none"
    document.getElementById("password").style.display = "none"
    document.getElementById("apply").style.display = "none"
    document.getElementById("configure").style.display = "block"

    await SDPIComponents.streamDeckClient.send("sendToPlugin", { updateStatus: true });
}

(async function () {
    const info = await SDPIComponents.streamDeckClient.getConnectionInfo();
    SDPIComponents.streamDeckClient.sendToPropertyInspector.subscribe((args) => {
        updateStatus(args.payload);
    }
    );
    SDPIComponents.streamDeckClient.send("sendToPlugin", { updateStatus: true });
})();
