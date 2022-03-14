import { GameSummary } from "../interfaces/NetInterfaces";
import { getRandomName } from "../../../server/nameGeneration";
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

    /**
     * The modal layer
     */
    modalLayer:HTMLDivElement;

     /**
      * The actual modal
      */
    modal:HTMLDivElement;

    /**
     * Menu buttons
     */
    aboutButton:HTMLButtonElement;
    closeButton:HTMLButtonElement;

    /**
     * Quick chat phrases
     */
    quickChatsPhrases:{[key:string]:string};

    /**
     * Game manager
     */
    game:GameManager;

    reloading:boolean = false;

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
        this.modalLayer = document.getElementById("modalLayer") as HTMLDivElement;
        this.modal = document.getElementById("modal") as HTMLDivElement;
        this.aboutButton = document.getElementById("aboutButton") as HTMLButtonElement;
        this.closeButton = document.getElementById("closeButton") as HTMLButtonElement;
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
        // Event listeners for menu buttons
        this.aboutButton.addEventListener("click", this.showAboutMenu.bind(this));
        this.closeButton.addEventListener("click", this.showCloseMenu.bind(this));
    }

    /**
     * Update held items and actions
     */
    updateControls(player:Player, map:GameMap) {
        // What is the player holding right now?
        if (player.holding) {
            let name = player.holding.getName();
            name = name.slice(0, 1).toUpperCase() + name.slice(1);
            let heldText = `${player.holding.art} ${name}`;
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
                // Check for empty space to drop a thing down the chute
                const chutePosition = player.adjacentChuteExists();
                // We found a chute to shove this thing down
                if (chutePosition) {
                    const holeType = (chutePosition.isChute) ? "garbage chute" : "elevator shaft";
                    actions.push({
                        description: `Throw ${player.holding.getName()} down the ${holeType}!`,
                        action: ()=>{
                            if (chutePosition) {
                                player.dropThing(chutePosition.position);
                            }
                            player.updateAndRefresh();
                        },
                        needToRegenerate: true
                    })
                } else {
                    // Generic dropping
                    actions.push({
                        description: `Drop ${player.holding.getName()}`,
                        action: ()=>{
                            player.dropThing();
                            player.updateAndRefresh();
                        },
                        needToRegenerate: true
                    });
                }

            }
            // Pick up!
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
            if (tile.art === '<') {
                actions.push({
                    description: `Go up the staircase`,
                    action: ()=>{
                        player.step([0,0,1]);
                        player.updateAndRefresh();
                    },
                    needToRegenerate: true
                });
            } else if (tile.art === '>') {
                actions.push({
                    description: `Go down the staircase`,
                    action: ()=>{
                        player.step([0,0,-1]);
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

    /**
     * A short about menu.
     */
    showAboutMenu() {
        const elements:HTMLElement[] = [];
        const header = document.createElement("h2");
        header.innerText = "About";
        elements.push(header);
        const paragraphs:string[] = [
            `Welcome to Garbage Quest! This is a game about picking up garbage with your friends and/or random people on the internet. Fill the garbage room on the main floor with garbage to win the game!`,
            `To play, move with the arrow keys. The 'g' and 'p' keys can be used to Grab and Put Down garbage. The '<' and '>' keys go up and down stairs. You can also use the buttons provided to the left!`,
            `Game by Lauren Hetherington. I hope you like it!`,
        ];
        const attribution:string[] = [
            `This game uses emoji from <a href="https://twemoji.twitter.com/" target="_blank" rel="noreferrer noopener">Twemoji</a>.`,
            `Copyright 2020 Twitter, Inc and other contributors`,
            `Code licensed under the <a href="http://opensource.org/licenses/MIT" target="_blank" rel="noreferrer noopener">MIT License</a>.`,
            `Graphics licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer noopener">CC-BY 4.0</a>.`,

        ]
        paragraphs.forEach(paragraph => {
            const element = document.createElement("p");
            element.innerText = paragraph;
            elements.push(element);
        });
        attribution.forEach(paragraph => {
            const element = document.createElement("p");
            element.classList.add("attribution");
            element.innerHTML = paragraph;
            elements.push(element);
        });
        this.buildModal({
            elements: elements,
            big: true
        })
    }

    /**
     * Close menu
     */
    showCloseMenu() {
        const header = document.createElement("h2");
        header.innerText = "Leave the game";
        const content = document.createElement("p");
        content.innerText = "Do you want to leave the current game?";
        this.buildModal({
            elements: [header, content],
            buttons: ["Leave the current game", "Stay in the current game"],
            buttonActions: [
                ()=>{
                    location.reload()
                    this.reloading = true;
                    this.hideModal();
                },
                ()=>this.hideModal()
            ],
        });
    }

    /**
     * The game has been won! Show the modal about it.
     */
    showWinModal() {
        const elements:HTMLElement[] = [];
        const header = document.createElement("h2");
        header.innerText = "Great job!";
        const content = document.createElement("p");
        content.innerText = "The garbage room is full! Of course, the onslaught of garbage never ends, but for today, it is time to rest. Thank you for playing!";
        this.buildModal({
            elements: [header, content],
            buttons: undefined,
            buttonActions: undefined,
        });
    }
    
    /**
     * Show the start menu!
     */
    showStartMenu() {
        const header = document.createElement("h2");
        header.innerText = "Garbage Quest";
        const content = document.createElement("p");
        content.innerText = "Welcome to garbage quest!";
        this.buildModal({
            elements: [header, content],
            buttons: [
                "Join a game",
                "Start a new public game",
                "Start a solo game"
            ],
            buttonActions: [
                () => {
                    this.showConnectingDialog();
                    this.game.tryToConnect(()=>{
                        this.game.net.broadcast({
                            requestType:"Request",
                            details:"games"
                        })
                    });
                },
                () => {
                    this.showConnectingDialog();
                    this.game.tryToConnect(()=>{
                        this.game.createNewGame(true);
                        this.hideModal();
                    });
                },
                () => {
                    this.game.createNewGame(false);
                    this.hideModal();
                }
            ],
        });
    }

    /**
     * Connecting.... dialog
     */
    showConnectingDialog() {
        const elements:HTMLElement[] = [];
        const header = document.createElement("h2");
        header.innerText = "Connecting...";
        this.buildModal({
            elements: [header],
            buttons: ["Cancel"],
            buttonActions: [() => {
                this.game.net.cancelInit();
                this.showStartMenu();
            }],
        });
    }

    /**
     * Lost connection :( Let the player know and offer to refresh
     */
    showConnectionLostModal(gameName:string) {
        if (this.reloading) {
            // Skip if we are mid-reconnect
            return;
        }
        const header = document.createElement("h2");
        header.innerText = "Connection lost";
        const content = document.createElement("p");
        content.innerText = `You lost connection. Don't worry, unless everything is on fire ${gameName} should be cached! You can refresh and try to rejoin.`
        this.buildModal({
            elements: [header, content],
            buttons: ["Refresh"],
            buttonActions: [()=>{
                location.reload();
                this.reloading = true;
                this.hideModal();
            }]
        })
    }

    /**
     * Show the list of available games
     */
    showGameList(games:GameSummary[]) {
        const buttons:string[] = [];
        const buttonActions:(()=>void)[] = [];
        const header = document.createElement("h2");
        if (games.length > 0) {
            header.innerText = "Join a game!";
            games.forEach(game=>{
                if (game && game.name && game.players !== undefined && game.players >= 0 && game.id) {
                    buttons.push(`${game.name} (${game.players} players)`);
                    buttonActions.push(() => {
                        this.game.serverId = game.id;
                        this.game.net.broadcast({
                            requestType:"Request",
                            details:"join",
                            id: game.id,
                            name: getRandomName(),
                            art: Math.floor(100*Math.random())
                        });
                        this.hideModal();
                    });
                }
            });
        } else {
            header.innerText = "There are no games currently available.";
        }
        buttons.push("Return to main menu");
        buttonActions.push(() => {
            this.showStartMenu();
        });
        this.buildModal({
            elements: [header],
            buttons: buttons,
            buttonActions: buttonActions,
        })
    }

    /**
     * Build and show a modal!
     */
    buildModal(params:{elements:HTMLElement[],buttons?:string[],buttonActions?:(()=>void)[],big?:boolean}) {
        let { elements, buttons, buttonActions, big=false } = params;
        this.modal.innerHTML = "";

        if (big) {
            this.modal.classList.add("big");
        } else {
            this.modal.classList.remove("big");
        }
        
        const buttonBox = document.createElement('div');
        buttonBox.classList.add("buttonBox");
        
        if (!buttons || !buttonActions || !(buttons.length > 0) || !(buttonActions.length > 0)) {
            buttons = ["Close window"];
            buttonActions = [()=>this.hideModal()];
        }

        for (let i=0; i<buttons.length; i++) {
            const newButton = document.createElement('button');
            newButton.innerText = buttons[i];
            newButton.addEventListener("click", () => {
                if (buttonActions && buttonActions[i]) {
                    buttonActions[i]();
                } else {
                    this.hideModal();
                }
            })
            buttonBox.appendChild(newButton);
        }
        elements.push(buttonBox);

        elements.forEach(element => this.modal.appendChild(element));
        this.revealModal();
    }
    

    /**
     * Reveal the modal layer
     */
    revealModal() {
        this.modalLayer.classList.remove("hidden");
    }

    /**
     * Hide the modal layer
     */
    hideModal() {
        this.modalLayer.classList.add("hidden");
    }
}

export default UIManager;