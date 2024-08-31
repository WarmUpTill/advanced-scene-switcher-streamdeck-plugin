import { OBSWebSocket, OBSWebSocketError, EventSubscription, OBSResponseTypes } from 'obs-websocket-js';
import streamDeck, { LogLevel } from "@elgato/streamdeck";

declare type StartStopEventCallback = () => void;

const logger = streamDeck.logger.createScope("AdvssConnection");

export class OBSConnectionSettings {
    ip: string = "localhost";
    port: number = 4455;
    password: string = "password";
};

export class AdvssConnection {
    private static instance: AdvssConnection | null = null;

    readonly version = 1;
    readonly vendorName = "AdvancedSceneSwitcher"
    readonly vendorRequestNameKeyEvent = "StreamDeckKeyEvent"
    readonly vendorRequestNameStart = "AdvancedSceneSwitcherStart"
    readonly vendorRequestNameStop = "AdvancedSceneSwitcherStop"
    readonly vendorRequestNameIsRunning = "IsAdvancedSceneSwitcherRunning"
    private port: number;
    private host: string;
    private password: string;
    private obs: OBSWebSocket = new OBSWebSocket();
    private connected: boolean = false;
    private initialConnectionAttemptDone: boolean = false;
    private startCallbacks: { (): void; }[] = [];
    private stopCallbacks: { (): void; }[] = [];

    private constructor(host: string = "localhost", port: number = 4455, password: string = "password") {
        this.port = port;
        this.host = host;
        this.password = password;
        this.obs.on("VendorEvent", (data) => this.parseEvents(data));
    }

    private parseEvents(data: any) {
        if (data.vendorName != this.vendorName) {
            return;
        }
        if (data.eventType === "AdvancedSceneSwitcherStarted") {
            this.handleStartEvent();
        } else if (data.eventType === "AdvancedSceneSwitcherStopped") {
            this.handleStopEvent();
        }
    }

    private handleStartEvent() {
        logger.debug("Start event received");
        this.startCallbacks.forEach((callback) => { callback(); });
    }

    private handleStopEvent() {
        logger.debug("Stop event received");
        this.stopCallbacks.forEach((callback) => { callback(); });
    }

    public registerStartEventCallback(callback: StartStopEventCallback) {
        this.startCallbacks.push(callback);
    }

    public registerStopEventCallback(callback: StartStopEventCallback) {
        this.stopCallbacks.push(callback);
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public static getInstance(): AdvssConnection {
        if (this.instance === null) {
            this.instance = new AdvssConnection();
        }
        return this.instance;
    }

    private async connect(): Promise<void> {
        logger.debug(`connecting to ws://${this.host}:${this.port}`)
        try {
            const {
                obsWebSocketVersion,
                negotiatedRpcVersion
            } = await this.obs.connect(`ws://${this.host}:${this.port}`, this.password, {
                eventSubscriptions: EventSubscription.Vendors
            });
            logger.info(`Connected to OBS websocket server ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`)
            this.connected = true;
        } catch (error) {
            if (error instanceof OBSWebSocketError) {
                logger.error(`Failed to connect to OBS (${error.code}: ${error.message})`);
                this.connected = false;
            }
        }
    }

    private async sendVendorRequest(requestData: any): Promise<any> {
        logger.debug(`Sending CallVendorRequest message to OBS ${JSON.stringify(requestData)}`)
        try {
            return await this.obs.call("CallVendorRequest", requestData);
        }
        catch (error) {
            if (error instanceof OBSWebSocketError) {
                logger.error(`Failed to send message to OBS (${error.code}: ${error.message})`);
                this.connected = false;
            }
        }
        return {}
    }

    public async send(message: any): Promise<void> {
        const vendorName = this.vendorName;
        const requestType = this.vendorRequestNameKeyEvent;
        const requestData = {
            version: this.version,
            data: message
        };

        if (!this.connected) {
            const settings: OBSConnectionSettings = {
                ip: this.host,
                port: this.port,
                password: this.password
            }
            await this.connectTo(settings);
        }

        if (!this.connected) {
            return;
        }

        this.sendVendorRequest({ vendorName, requestType, requestData });
    }

    public async waitForInitialConnectionAttempt() {
        // TODO: Clean this up at some point
        return new Promise((resolve) => {
            const checkFlag = () => {
                if (this.initialConnectionAttemptDone) {
                    resolve(checkFlag);
                } else {
                    setTimeout(checkFlag, 100);
                }
            };
            checkFlag();
        });
    }

    public async isAdvancedSceneSwitcherRunning(): Promise<boolean> {
        const vendorName = this.vendorName;
        const requestType = this.vendorRequestNameIsRunning;
        const requestData = {
            version: this.version
        };
        try {
            const reply = await this.sendVendorRequest({ vendorName, requestType, requestData });
            return reply.responseData.isRunning;
        } catch (error) {
            return false;
        }
    }

    public async setAdvancedSceneSwitcherStatus(started: boolean): Promise<void> {
        logger.debug(`${started ? "Starting" : "Stopping"} the Advanced Scene Switcher`)
        const vendorName = this.vendorName;
        const requestType = started ? this.vendorRequestNameStart : this.vendorRequestNameStop;
        const requestData = {
            version: this.version
        };
        this.sendVendorRequest({ vendorName, requestType, requestData });
    }

    public async reconnect(): Promise<void> {
        logger.info(`OBS websocket reconnecting`);
        this.connected = false;
        this.initialConnectionAttemptDone = true;
        await this.obs.disconnect();
        await this.connect();
    }

    public async connectTo(settings: OBSConnectionSettings): Promise<void> {
        this.host = settings.ip;
        this.port = settings.port;
        this.password = settings.password;
        this.reconnect()
    }
}

export default AdvssConnection;