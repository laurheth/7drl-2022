import GameDisplay from "./GameDisplay";
import GameMap from "./GameMap";
import Net from "./NetHandler";
import { ThingUpdateBundle, ThingUpdate, SessionDetails, GameRequest, GameMessage, EntityDetails } from "../interfaces/NetInterfaces";
import Thing from "./Thing";
import Entity from "./Entity";

/**
 * Bundles up the large scale game logic
 */
class GameManager {

    /**
     * Main display to use for the game
     */
    display:GameDisplay;

    /**
     * Map handler
     */
    gameMap:GameMap|undefined;

    /**
     * Network handler
     */
    net:Net;

    constructor() {
        this.display = new GameDisplay(30, 30);
        this.net = new Net(this, ()=>this.onConnected());
        this.net.addCallback("SessionDetails", this.onSessionDetails.bind(this));
        this.net.addCallback("GameList", this.onGameList.bind(this));
        this.net.addCallback("Updates", this.onUpdates.bind(this));
        this.net.addCallback("Spawn", this.onSpawn.bind(this));
    }

    /**
     * What to do when we first connect
     */
    onConnected() {
        // Request the list of games
        this.net.broadcast({
            requestType:"Request",
            details:"games"
        })
    }

    /**
     * Got session details for a new game
     */
    onSessionDetails(message?:GameMessage) {
        if (message && message.requestType === "SessionDetails") {
            const { name, seed, hash, id, entities } = message;
            this.gameMap = new GameMap(name, seed, hash, this, entities);
            this.gameMap.setThingId(id);
            this.gameMap.refresh();
        }
    }

    /**
     * Got a list of active games
     */
    onGameList(message?:GameMessage) {
        if (message && message.requestType === "GameList") {
            const gameList = message.games;
            // A game exists! Join it.
            if (gameList.length > 0 && gameList[0].id >= 0) {
                this.net.broadcast({
                    requestType:"Request",
                    details:"join",
                    id: gameList[0].id
                })
            } else {
                // Otherwise, make a game and send the details off
                this.gameMap = new GameMap("Cool map", Date.now(), 0, this);
                this.gameMap.refresh();
                const entityList:EntityDetails[] = [];
                for (const key in this.gameMap.things) {
                    const thing = this.gameMap.things[key];
                    entityList.push({
                        id: thing.id,
                        position: thing.position,
                        kind: thing.kind
                    })
                }
                this.net.broadcast({
                    requestType: "SessionDetails",
                    name: this.gameMap.name,
                    seed: this.gameMap.seed,
                    hash: this.gameMap.hashValue,
                    id: this.gameMap.nextThingId,
                    entities: entityList
                })
            }
        }
    }

    /**
     * Got some updates to apply
     */
    onUpdates(message?:GameMessage) {
        if (message && message.requestType === "Updates") {
            // This is a set of updates. Apply them all in order.
            const updates:ThingUpdate[] = message.updates;
            updates.forEach(update => {
                if (this.gameMap) {
                    let thing:Thing = this.gameMap.things[update.id];
                    console.log(update.id, thing, this.gameMap.things);
                    if (update.position) {
                        thing.move(update.position);
                    }
                    if (update.message) {
                        if (update.message === "disconnected") {
                            console.log("Friendo disconnected.");
                            thing.die();
                            if (this.gameMap.things[thing.id] === thing) {
                                delete this.gameMap.things[thing.id];
                            }
                        }
                    }
                }
            });
            this.gameMap?.refresh();
        }
    }

    /**
     * Something new has been created
     */
    onSpawn(message?:GameMessage) {
        if (message && message.requestType === "Spawn" && this.gameMap) {
            let newThing:Thing;
            this.gameMap.setThingId(message.id);
            if (message.kind === "player") {
                newThing = new Entity('@', message.position, this.gameMap);
            } else {
                newThing = new Thing('&', message.position, this.gameMap);
            }
            newThing.kind = message.kind;
            this.gameMap.refresh();
        }
    }
}

export default GameManager;