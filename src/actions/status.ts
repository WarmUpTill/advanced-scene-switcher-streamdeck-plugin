import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, SendToPluginEvent } from "@elgato/streamdeck";
import { AdvssConnection, OBSConnectionSettings } from "./../advss-connection";

const advssConnection = AdvssConnection.getInstance();
const logger = streamDeck.logger.createScope("Status");

/**
 * An action class to start and stop the Advanced Scene Switcher.
 */
@action({ UUID: "com.warmuptill.advanced-scene-switcher.status" })
export class StatusAction extends SingletonAction<StatusSettings> {
    private onStart = () => {};
    private onStop = () => {};
    private onDisconnect = () => {};

    async onWillAppear(ev: WillAppearEvent<StatusSettings>): Promise<void> {
        this.onStart = () => { ev.action.setTitle("Started"); };
        this.onStop = () => { ev.action.setTitle("Stopped"); };
        this.onDisconnect = () => { ev.action.setTitle("Not\nConnected"); };
        advssConnection.registerStartEventCallback(this.onStart);
        advssConnection.registerStopEventCallback(this.onStop);
        advssConnection.registerDisconnectCallback(this.onDisconnect);

        await advssConnection.waitForInitialConnectionAttempt();
        const isRunning = await advssConnection.isAdvancedSceneSwitcherRunning();
        if (!advssConnection.isConnected()) {
            ev.action.setTitle("Not\nConnected");
            return;
        }
        return ev.action.setTitle(`${isRunning ? "Started" : "Stopped"}`);
    }

    async onWillDisappear(): Promise<void> {
        advssConnection.unregisterStartEventCallback(this.onStart);
        advssConnection.unregisterStopEventCallback(this.onStop);
        advssConnection.unregisterDisconnectCallback(this.onDisconnect);
    }

    async onKeyDown(ev: KeyDownEvent<StatusSettings>): Promise<void> {
        if (!advssConnection.isConnected()) {
            ev.action.setTitle("Not\nconnected");
            return;
        }

        logger.debug("Received KeyDown event");
        switch (ev.payload.settings.behavior) {
            case StatusActionBehavior.Start:
                await advssConnection.setAdvancedSceneSwitcherStatus(true);
                break;
            case StatusActionBehavior.Stop:
                await advssConnection.setAdvancedSceneSwitcherStatus(false);
                break;
            case StatusActionBehavior.Toggle:
                const isRunning = await advssConnection.isAdvancedSceneSwitcherRunning();
                await advssConnection.setAdvancedSceneSwitcherStatus(!isRunning);
                break;
        }

        // Update connection status just in case it changed
        ev.action.sendToPropertyInspector({ connected: advssConnection.isConnected() });
    }

    async onSendToPlugin(ev: SendToPluginEvent<any, StatusSettings>): Promise<void> {
        if (!ev.payload.updateStatus) {
            return;
        }

        if (!advssConnection.isConnected()) {
            await advssConnection.reconnect();
        }
        logger.debug(`Setting connection status in PI to ${advssConnection.isConnected()}`);
        ev.action.sendToPropertyInspector({ connected: advssConnection.isConnected() });
    }
}

/**
 * Settings for {@link StatusAction}.
 */
type StatusSettings = {
    behavior?: StatusActionBehavior;
};

enum StatusActionBehavior {
    Toggle = "10",
    Start = "20",
    Stop = "30"
}