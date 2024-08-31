import streamDeck, { action, KeyDownEvent, SingletonAction, PropertyInspectorDidAppearEvent, SendToPluginEvent, KeyUpEvent } from "@elgato/streamdeck";
import { AdvssConnection, OBSConnectionSettings } from "./../advss-connection";

const advssConnection = AdvssConnection.getInstance();
const logger = streamDeck.logger.createScope("MacroCondition");

/**
 * An action class that forwards key events to the Advanced Scene Switcher.
 */
@action({ UUID: "com.warmuptill.advanced-scene-switcher.macro-condition" })
export class MacroConditionAction extends SingletonAction<MacroConditionSettings> {
    async onKeyDown(ev: KeyDownEvent<MacroConditionSettings>): Promise<void> {
        logger.debug("Received KeyDown event");
        let data: { [k: string]: any } = ev.payload;
        data.isKeyDownEvent = true;
        advssConnection.send(data);

        // Update connection status just in case it changed
        ev.action.sendToPropertyInspector({ connected: advssConnection.isConnected() });
    }

    async onKeyUp(ev: KeyUpEvent<MacroConditionSettings>): Promise<void> {
        logger.debug("Received KeyUp event");
        let data: { [k: string]: any } = ev.payload;
        data.isKeyDownEvent = false;
        advssConnection.send(data);

        // Update connection status just in case it changed
        ev.action.sendToPropertyInspector({ connected: advssConnection.isConnected() });
    }

    async onSendToPlugin(ev: SendToPluginEvent<any, MacroConditionSettings>): Promise<void> {
        if (!ev.payload.updateStatus) {
            return;
        }

        logger.debug(`Setting connection status in PI to ${advssConnection.isConnected()}`);
        await advssConnection.reconnect();
        ev.action.sendToPropertyInspector({ connected: advssConnection.isConnected() });
    }
}

/**
 * Settings for {@link MacroConditionAction}.
 */
type MacroConditionSettings = {
    data?: string;
};
