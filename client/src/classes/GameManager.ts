import GameDisplay from "./GameDisplay";
import GameMap from "./GameMap";
import Net from "./NetHandler";
import { ThingUpdateBundle, ThingUpdate, SessionDetails, GameRequest, GameMessage, EntityDetails } from "../interfaces/NetInterfaces";
import Thing from "./Thing";
import Entity from "./Entity";
import UIManager from "./UIManager";
import { randomStreet } from "../../../server/nameGeneration";;

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

    /**
     * UI Manager
     */
    uiManager:UIManager;

    /**
     * Server id we are connected to
     */
    serverId:number = -1;

    constructor() {
        this.display = new GameDisplay(30, 30);
        this.net = new Net(this);
        this.net.addCallback("SessionDetails", this.onSessionDetails.bind(this));
        this.net.addCallback("GameList", this.onGameList.bind(this));
        this.net.addCallback("Updates", this.onUpdates.bind(this));
        this.net.addCallback("Spawn", this.onSpawn.bind(this));
        this.net.addCallback("NameAssignment", this.onNameAssignment.bind(this));
        this.net.addCallback("close", this.onConnectionLost.bind(this));
        this.uiManager = new UIManager(this.net, this);
        this.uiManager.showStartMenu();
    }

    /**
     * Connect to server...
     */
    tryToConnect(callback:()=>void) {
        if (this.net.ws) {
            // Already connected.
            this.onConnected(callback);
        } else {
            this.net.init(callback);
        }
    }

    /**
     * What to do when we first connect
     */
    onConnected(callback:()=>void) {
        callback();
    }

    /**
     * What to do if the connection was lost
     */
    onConnectionLost() {
        if (this.serverId >= 0 && this?.gameMap?.name) {
            this.uiManager.showConnectionLostModal(this.gameMap.name);
        }
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
            
            this.uiManager.addMessageToLog(`Welcome to ${name}! Things are a bit of a mess, and there's garbage everywhere. Fill the garbage room with trash to save the day!`);
        }
    }

    /**
     * Got a list of active games
     */
    onGameList(message?:GameMessage) {
        if (message && message.requestType === "GameList") {
            this.uiManager.hideModal();
            const gameList = message.games;
            this.uiManager.showGameList(gameList);
        }
    }

    /**
     * Got a name assignment message
     */
    onNameAssignment(message?:GameMessage) {
        if (message && message.requestType === "NameAssignment") {
            if (this.gameMap) {
                this.gameMap.name = message.gameName;
                this.gameMap.player?.setName(message.name);
                this.serverId = message.serverId;

                this.uiManager.addMessageToLog(`Welcome to ${message.gameName}! Things are a bit of a mess, and there's garbage everywhere. Fill the garbage room with trash to save the day!`);
            }
        }
    }

    /**
     * Create a new game
     */
    createNewGame(multiplayer:boolean = true) {
        this.gameMap = new GameMap(`${Math.floor(Math.random() * 100 + 1)} ${randomStreet()}`, Date.now(), 0, this);
        this.gameMap.refresh();
        const entityList:EntityDetails[] = [];
        for (const key in this.gameMap.things) {
            const thing = this.gameMap.things[key];
            entityList.push({
                id: thing.id,
                position: thing.position,
                kind: thing.kind,
                name: (thing.kind === "player") ? thing.name : thing.getName(),
                art: (thing.kind === "player") ? thing.art : undefined
            })
        }
        if (multiplayer) {
            this.net.broadcast({
                requestType: "SessionDetails",
                name: this.gameMap.name,
                seed: this.gameMap.seed,
                hash: this.gameMap.hashValue,
                id: this.gameMap.nextThingId,
                entities: entityList,
                creatorId: this.gameMap.player?.id ? this.gameMap.player.id : 0
            })
        } else {
            this.uiManager.addMessageToLog(`Welcome to Garbage Quest! Things are a bit of a mess, and there's garbage everywhere. Fill the garbage room with trash to save the day!`);
        }
    }

    /**
     * Got some updates to apply
     */
    onUpdates(message?:GameMessage) {
        if (message && message.requestType === "Updates") {
            // This is a set of updates. Apply them all in order.
            const updates:ThingUpdate[] = message.updates;
            let sender:Thing|null = null;
            let addToLog = false;
            if (message.sender && this.gameMap) {
                sender = this.gameMap.things[message.sender];
                if (sender && sender.tile && sender.tile.visible) {
                    addToLog = true;
                }
            }
            updates.forEach(update => {
                if (this.gameMap) {
                    let thing:Thing = this.gameMap.things[update.id];
                    if (update.position) {
                        thing.move(update.position);
                    }
                    if (update.message) {
                        if (update.message === "disconnected") {
                            this.uiManager.addMessageToLog(thing.getName() + " disconnected.");
                            thing.die();
                            if (this.gameMap.things[thing.id] === thing) {
                                delete this.gameMap.things[thing.id];
                            }
                        } else if (update.message === "status:hidden") {
                            if (addToLog && sender) {
                                this.uiManager.addMessageToLog(`${sender.getName()} picks up the ${thing.getName()}.`);
                            }
                            thing.hideMe();
                        } else if (update.message === "status:show") {
                            if (addToLog && sender) {
                                this.uiManager.addMessageToLog(`${sender.getName()} drops the ${thing.getName()}.`);
                            }
                            thing.hidden = false;
                        } else if (sender && update.message.indexOf("message:") === 0) {
                            let displayMessage = true;

                            if (this.gameMap.player?.position && sender.position) {
                                const pos1 = this.gameMap.player.position;
                                const pos2 = sender.position;
                                let distance = 0;
                                for (let i=0; i<3;i++) {
                                    const factor = (i >= 2) ? 5 : 1;
                                    distance += factor * Math.abs(pos1[i] - pos2[i]);
                                }
                                if (distance > 25) {
                                    displayMessage = false;
                                }
                            } 

                            if (displayMessage) {
                                this.uiManager.displayChatMessage(update.message, sender);
                            }
                        }
                    }
                }
            });
            this.gameMap?.refresh();
            if (this.gameMap?.player) {
                this.uiManager.updateControls(this.gameMap.player, this.gameMap);
            }
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
                const art = (message.art) ? message.art : '🙂';
                const name = (message.name) ? message.name : "Mystery Friend";
                newThing = new Entity(art, message.position, this.gameMap);
                newThing.setName(name);
                this.uiManager.addMessageToLog(`${name} has joined the game.`);
            } else {
                newThing = new Thing('&', message.position, this.gameMap);
            }
            newThing.kind = message.kind;
            this.gameMap.refresh();
        }
    }
}

export default GameManager;