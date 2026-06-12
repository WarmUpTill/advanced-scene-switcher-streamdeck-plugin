import streamDeck, { LogLevel, DidReceiveGlobalSettingsEvent } from "@elgato/streamdeck";
import { pluginVersion } from "virtual:plugin-version";

import { MacroConditionAction as MacroConditionAction } from "./actions/macro-condition";
import { StatusAction as StatusAction} from "./actions/status";
import { AdvssConnection, OBSConnectionSettings } from "./advss-connection";

streamDeck.logger.info(`Advanced Scene Switcher Stream Deck plugin v${pluginVersion}`);

const advssConnection = AdvssConnection.getInstance();

// Register the macro condition action.
streamDeck.actions.registerAction(new MacroConditionAction());

// Register the action to control the status of the Advanced Scene Switcher.
streamDeck.actions.registerAction(new StatusAction());

// Handler for global plugin settings
streamDeck.settings.onDidReceiveGlobalSettings<OBSConnectionSettings>(
    async function (ev: DidReceiveGlobalSettingsEvent<OBSConnectionSettings>): Promise<void> {
        if (ev.settings.ip) {
            await advssConnection.connectTo(ev.settings);
        } else {
            streamDeck.logger.info("No OBS connection settings configured");
            advssConnection.markInitialConnectionAttemptDone();
        }
    }
);
streamDeck.settings.getGlobalSettings();

// Finally, connect to the Stream Deck.
streamDeck.connect();