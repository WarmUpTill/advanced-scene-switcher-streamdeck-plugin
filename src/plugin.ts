import streamDeck, { LogLevel, DidReceiveGlobalSettingsEvent } from "@elgato/streamdeck";

import { MacroConditionAction as MacroConditionAction } from "./actions/macro-condition";
import { StatusAction as StatusAction} from "./actions/status";
import { AdvssConnection, OBSConnectionSettings } from "./advss-connection";

const advssConnection = AdvssConnection.getInstance();

// Register the macro condition action.
streamDeck.actions.registerAction(new MacroConditionAction());

// Register the action to control the status of the Advanced Scene Switcher.
streamDeck.actions.registerAction(new StatusAction());

// Handler for global plugin settings
streamDeck.settings.onDidReceiveGlobalSettings<OBSConnectionSettings>(
    async function (ev: DidReceiveGlobalSettingsEvent<OBSConnectionSettings>): Promise<void> {
        await advssConnection.connectTo(ev.settings);
    }
);
streamDeck.settings.getGlobalSettings();

// Finally, connect to the Stream Deck.
streamDeck.connect();