'use strict';

// Some server setup
const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;

const server = express()
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

// Start listening to websockets
const wss = new Server({ server });

// List of active games
class Game {
    clients;
    name;
    seed;
    hash;
    entities;
    maxId;

    constructor(name, seed, hash, entities) {
        this.name = name;
        this.seed = seed;
        this.hash = hash;
        this.entities = {};
        this.maxId = 0;
        entities.forEach(entity => {
            this.maxId = Math.max(this.maxId, entity.id);
            this.entities[entity.id] = entity;
        })
        this.clients = [];
    }

    getEntityList() {
        const list = [];
        for (const id in this.entities) {
            list.push(this.entities[id]);
        }
        return list;
    }
}

let gameId = 0;
const games = {};

// New connections
wss.on('connection', function connection(ws) {

    console.log(`Client connected`);

    let myGameId = -1;
    let myEntityId = 0;

    ws.on('close', () => {
        console.log(`Client disconnected`);
        // Do all of the cleanup. Remove player from games they're in, and remove empty games.
        if (myGameId >= 0) {
            const game = games[myGameId];
            const index = game.clients.indexOf(ws);
            if (index >= 0) {
                game.clients.splice(index, 1);
                if (game.clients.length <= 0) {
                    delete games[myGameId];
                } else {
                    delete game.entities[myEntityId];
                    game.clients.forEach(client => {
                        client.send(JSON.stringify({
                            requestType: "Updates",
                            updates: [
                                {
                                    id: myEntityId,
                                    message: "disconnected"
                                }
                            ]
                        }))
                    })
                }
            }
        }
    });

    // Handle messages. We're mostly just a fancy relay. Minimize server-side work. Opens it up to cheating, but this is a casual game; it's fine for our purposes.
    ws.on('message', (data, isBinary) => {
        const messageString = isBinary ? data : data.toString();

        const message = JSON.parse(messageString);
        console.log(messageString);

        switch(message.requestType) {
            case "Request":
                if (message.details === "games") {
                    const gameList = [];
                    for (const key in games) {
                        const game = games[key];
                        gameList.push({
                            name: game.name,
                            id: key,
                            players: game.clients.length
                        });
                    }
                    // Send back the list of games
                    ws.send(JSON.stringify({
                        requestType: "GameList",
                        games: gameList
                    }));
                } else if (message.details === "join") {
                    // A new Player wants to join the game!
                    myGameId = message.id;
                    const name = message.name ? message.name : "Mystery Friend";
                    const artNum = (Number.isFinite(message.art) && message.art >= 0) ? message.art : 0;

                    const emojis = ["🙂","😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","😶","😏","🤐","😴","😌","🤑","😤","🤪","🥴","🤠","🧐","💀","👻","😺","🐵","🐶","🐺","🦊","🦝","🐮","🐗","🐭","🐹","🐰","🐻","🐼","🐸","🦓","🐴","🦄","🐔","🐲","🐌","🐦"];

                    const art = emojis[artNum % emojis.length];

                    // Assign them an entity ID, and send the session details to them.
                    const game = games[message.id];
                    if (game) {
                        myEntityId = ++game.maxId;
                        game.entities[myEntityId] = {
                            id:myEntityId,
                            kind:"you",
                            position:[0,0,0],
                            art: art,
                            name: name
                        }
                        ws.send(JSON.stringify({
                            requestType: "SessionDetails",
                            name: game.name,
                            seed: game.seed,
                            hash: game.hash,
                            id: message.id,
                            entities: game.getEntityList()
                        }));
                        game.entities[myEntityId].kind = "player";
                        game.clients.forEach(client => {
                            client.send(JSON.stringify({
                                requestType:"Spawn",
                                id: myEntityId,
                                position:[0,0,0],
                                kind:"player",
                                name: name,
                                art: art
                            }))
                        })
                        game.clients.push(ws);
                    } else {
                        console.log("Error, not a valid game. " + messageString);
                    }
                }
                break;
            // New game being created
            case "SessionDetails":
                gameId++;
                if (message.name, message.seed, message.hash, message.entities) {
                    const newGame = new Game(message.name, message.seed, message.hash, message.entities);
                    games[gameId] = newGame;
                    myGameId = gameId;
                    if (message.creatorId) {
                        myEntityId = message.creatorId;
                    }
                    newGame.clients.push(ws);
                } else {
                    console.log("Error, attempted new session while missing details. " + messageString);
                }
                break;
            // Updates from the client, gotta pass em along
            case "Updates":
                const game = games[myGameId];
                if (game) {
                    // Pass the message along
                    game.clients.forEach(client => {
                        if (client != ws) {
                            client.send(messageString);
                        }
                    });
                    // Update our local copy as well
                    const updates = message.updates;
                    updates.forEach(update => {
                        if (Number.isFinite(update.id)) {
                            const entity = game.entities[update.id];
                            if (entity) {
                                if (update.message) {
                                    if (update.message.indexOf("status:") === 0) {
                                        const status = update.message.split(":")[1];
                                        entity.status = status;
                                    }
                                }
                                if (update.position) {
                                    entity.position = update.position;
                                }
                            }
                        }
                    });
                }
                break;
        }
    })
});

// Debug stuff.
setInterval(()=>{
    console.log(`Games status:\n${JSON.stringify(games)}\n\n\n`);
}, 10000);