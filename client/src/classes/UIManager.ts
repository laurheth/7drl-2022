import { quickChats } from "../util/quickChats";
import GameManager from "./GameManager";
import GameMap from "./GameMap";
import NetHandler from "./NetHandler";
import Player from "./Player";
import Thing from "./Thing";
import Tile from "./Tile";

let twemoji:{parse:(str:string)=>string};
try {
    twemoji=require('twemoji');
}
catch {
    twemoji={
        parse:(str:string)=>str
    }
}

interface ActionWeCanDo {
    description: string;
    action: ()=>void;
    element?:HTMLElement;
    needToRegenerate:boolean;
}

/**
 * Class to handle all of the UI elements.
 */
class UIManager {

    /**
     * Mostly used here to send quick chat
     */
    netManager:NetHandler;

    /**
     * Shows to player what they're holding
     */
    heldItemElement:HTMLParagraphElement;

    /**
     * List special actions the player can do right now
     */
    actionList:HTMLUListElement;

    lastBatchOfActions:ActionWeCanDo[] = [];

    /**
     * Form to handle quick chat messages
     */
    quickChatForm:HTMLFormElement;

    /**
     * The dropdown full of quickchat messages.
     */
    quickChatSelector:HTMLSelectElement;

    /**
     * The list of log messages.
     */
    messageLog:HTMLOListElement;

    messageLogLength:number = 50;

    quickChatsPhrases:{[key:string]:string};

    game:GameManager;

    /**
     * Initialize and grab all of the elements we want
     */
    constructor(netManager:NetHandler, game:GameManager) {
        this.netManager = netManager;
        this.heldItemElement = document.getElementById("heldItem") as HTMLParagraphElement;
        this.actionList = document.getElementById("actionList") as HTMLUListElement;
        this.quickChatForm = document.getElementById("chatForm") as HTMLFormElement;
        this.messageLog = document.getElementById("log") as HTMLOListElement; 
        this.quickChatSelector = document.getElementById("quickChatSelect") as HTMLSelectElement;
        // Add in the quickchat options
        this.quickChatsPhrases = {};
        // From util/quickChats
        quickChats.forEach((phrase, i) => {
            const option = document.createElement('option');
            option.innerText = phrase;
            const key = `message:${i.toString()}`;
            option.value = key;
            this.quickChatSelector.appendChild(option);
            this.quickChatsPhrases[key] = phrase;
        });
        // Get game object we're working with
        this.game = game;
        // Add event listener for chat
        this.quickChatForm.addEventListener("submit",this.onChatMessageSubmit.bind(this));
    }

    /**
     * Update held items and actions
     */
    updateControls(player:Player, map:GameMap) {
        // What is the player holding right now?
        if (player.holding) {
            let heldText = `${player.holding.art} ${player.holding.getName()}`;
            // Try to do some twemoji shit
            try {
                heldText = twemoji.parse(heldText);
            }
            catch {
                // Eh, stick with default
            }

            this.heldItemElement.innerHTML = heldText;

        } else {
            this.heldItemElement.innerHTML = "Nothing right now."
        }

        // Next, figure out what special actions are available to them
        const tile:Tile|null = player.tile;
        const actions:ActionWeCanDo[] = [];
        if (tile) {
            if (player.holding) {
                actions.push({
                    description: `Drop ${player.holding.getName()}`,
                    action: ()=>{
                        player.dropThing();
                        player.updateAndRefresh();
                    },
                    needToRegenerate: true
                });
            }
            if (tile.garbage) {
                actions.push({
                    description: `Pick up ${tile.garbage.getName()}`,
                    action: ()=>{
                        if (tile.garbage) {
                            player.grabThing(tile.garbage);
                        }
                        player.updateAndRefresh();
                    },
                    needToRegenerate: true
                });
            }
        }

        // Clear actions that are no longer relevant
        if (this.lastBatchOfActions.length <= 0) {
            this.actionList.innerHTML = "";
        }
        this.lastBatchOfActions.forEach(oldAction => {
            const index = actions.map(action=>action.description).indexOf(oldAction.description);
            if (index >= 0) {
                actions[index].needToRegenerate = false;
                actions[index].element = oldAction.element;
            } else {
                if (oldAction.element) {
                    this.actionList.removeChild(oldAction.element);
                }
            }
        });

        // Add in the new actions
        if (actions.length > 0) {
            actions.forEach(action => {
                if (!action.needToRegenerate) {
                    return;
                }
                const button = document.createElement("button");
                button.innerText = action.description;
                button.addEventListener("click", action.action);
                const listElement = document.createElement("li");
                listElement.appendChild(button);
                this.actionList.appendChild(listElement);
                action.element = listElement;
            });
        } else {
            this.actionList.innerHTML = "";
            const listElement = document.createElement("li");
            listElement.innerText = "Nothing right now.";
            this.actionList.appendChild(listElement);
        }

        // Remember for next time
        this.lastBatchOfActions = actions;
    }

    /**
     * Display a chat message that has been received
     */
    displayChatMessage(messageKey:string, sender:Thing) {
        const phrase:string|undefined = this.quickChatsPhrases[messageKey];
        if (phrase) {
            this.addMessageToLog(`${sender.getName()} says "${phrase}"`);
        }
    }

    /**
     * Send a chat message
     */
    onChatMessageSubmit(event:SubmitEvent) {
        event.preventDefault();
        const messageKey = this.quickChatSelector.value;
        const phrase:string|undefined = this.quickChatsPhrases[messageKey];
        console.log(messageKey, phrase);
        if (phrase) {
            this.addMessageToLog(`You say "${phrase}"`);
            if (this.game.gameMap?.player) {
                const senderId = this.game.gameMap.player.id;
                this.netManager.broadcast({
                    requestType: "Updates",
                    sender: senderId,
                    updates: [{
                        id: senderId,
                        message: messageKey
                    }],
                })
            }
        }
    }

    /**
     * Add message to the message log
     */
    addMessageToLog(message:string) {
        // Keep us under the log length.
        if (this.messageLog.childNodes.length > this.messageLogLength && this.messageLog.lastChild) {
            this.messageLog.removeChild(this.messageLog.lastChild);
        }

        // Add the message to the top
        const newMessageElement = document.createElement("li");
        newMessageElement.innerText = message;
        this.messageLog.prepend(newMessageElement);
    }
}

export default UIManager;