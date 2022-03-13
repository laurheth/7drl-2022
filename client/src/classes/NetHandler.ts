import GameManager from "./GameManager";
import GameMap from "./GameMap";
import Thing from "./Thing";
import { ThingUpdateBundle, ThingUpdate, SessionDetails, GameRequest, GameMessage } from "../interfaces/NetInterfaces";

/**
 * Class to handle the websocket communications
 */
class NetHandler {
    ws:WebSocket|null;
    game:GameManager;
    receivedBuffer:ThingUpdate[];
    callbacks:{[key:string]:Array<(message?:GameMessage)=>void>};
    constructor(game:GameManager, connectedCallback?:()=>void, closedCallback?:()=>void) { 
        this.game = game;
        this.receivedBuffer = [];
        this.callbacks = {};
        this.ws = null;
        if (connectedCallback) {
            this.addCallback("open", connectedCallback);
        }
    }

    /**
     * Connect the websocket and set up listeners.
     * TODO: probably rewrite this lol
     */
    async init(callback:()=>void) {
        const url = new URL(window.location.href);
        const me = this;
        const HOST = (url.hostname.includes("localhost") || url.hostname.includes("127.0.0.1")) ? "ws:localhost:3000" : "";
        const ws = new WebSocket(HOST);
        this.ws = ws;
        
        ws.addEventListener('message', function message(message:MessageEvent) {
            me.onMessage(message);
        });
        
        ws.addEventListener("open", function open() {
            callback();
            me.runCallbacks("open");
            ws.addEventListener("close", function close() {
                me.runCallbacks("close");
                ws.removeEventListener("close", close);
                me.ws = null;
            })
        });
    }

    cancelInit() {
        this.ws?.close();
        this.ws = null;
    }

    /**
     * Handle messages from the server
     */
    onMessage(message:MessageEvent) {
        const data:GameMessage = JSON.parse(message.data);
        console.log(data);
        this.runCallbacks(data.requestType, data);
    }

    /**
     * Broadcast an update to the current game
     */
    broadcast(message:GameMessage) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Add a callback
     */
    addCallback(requestType:string,callback:(message?:GameMessage)=>void) {
        if (requestType in this.callbacks) {
            this.callbacks[requestType].push(callback);
        } else {
            this.callbacks[requestType] = [callback];
        }
    }

    /**
     * Run the appropriate callbacks
     */
    runCallbacks(requestType:string,message?:GameMessage) {
        if (this.callbacks[requestType]) {
            this.callbacks[requestType].forEach(callback => {
                callback(message);
            })
        }
    }
}

export default NetHandler;
