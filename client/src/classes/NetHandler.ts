import GameManager from "./GameManager";
import GameMap from "./GameMap";
import Thing from "./Thing";

/**
 * Definition of the messages that can be sent.
 */
interface NetMessage {
    id: number;
    position?:[number, number, number];
    message?:string;
}

/**
 * Information needed to connect to another game, or help others connect to us
 */
export interface EntityDetails {
    id: number;
    kind: string;
    position:[number, number, number];
}

interface SessionDetails {
    name: string;
    seed: number;
    hash: number;
    id: number;
    entities: EntityDetails[];
}

/**
 * Class to handle the websocket communications
 */
class NetHandler {
    ws:WebSocket|undefined;
    game:GameManager;
    receivedBuffer:NetMessage[];
    constructor(game:GameManager) { 
        this.game = game;
        this.receivedBuffer = [];
        this.init();
    }

    /**
     * Connect the websocket and set up listeners.
     * TODO: probably rewrite this lol
     */
    async init() {
        const url = new URL(window.location.href);
        const me = this;
        const HOST = (url.hostname.includes("localhost") || url.hostname.includes("127.0.0.1")) ? "ws:localhost:3000" : "";
        const ws = new WebSocket(HOST);
        this.ws = ws;
        
        ws.addEventListener('message', function message(message:MessageEvent) {
            me.onMessage(message);
        });
        
        ws.addEventListener("open", function open() {
            ws.addEventListener("close", function close() {
                ws.removeEventListener("close", close);
            })
        });
    }

    /**
     * Handle messages from the server
     */
    onMessage(message:MessageEvent) {
        const data = JSON.parse(message.data);
        // Figure out what to do with it
        if (Array.isArray(data)) {
            // This is a set of updates. Apply them all in order.
            const updates:NetMessage[] = data;
            updates.forEach(update => {
                if (this.game.gameMap) {
                    const thing:Thing = this.game.gameMap.things[update.id];
                } else {
                    this.receivedBuffer.push(update);
                }
            });
        } else if (data.name && data.id && data.seed) {
            const sessionDetails:SessionDetails = data;
            const { name, seed, hash, id, entities } = sessionDetails;
            this.game.gameMap = new GameMap(name, seed, hash, this.game, entities);
            this.game.gameMap.setThingId(id);
        }
    }

    /**
     * Broadcast an update to the current game
     */
    broadcast(...messages:NetMessage[]) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(messages));
        }
    }
}

export default NetHandler;
