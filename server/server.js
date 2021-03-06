'use strict';

// Some server setup
const express = require('express');
const { Server } = require('ws');
const { getRandomName, randomStreet } = require('./nameGeneration');

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

    getEntityList(noPlayers=false) {
        const list = [];
        for (const id in this.entities) {
            if (noPlayers) {
                if (this.entities[id].kind === "player") {
                    continue;
                }
                list.push({
                    id: this.entities[id].id,
                    kind: this.entities[id].kind,
                    position: this.entities[id].position
                });
            } else {
                list.push(this.entities[id]);
            }
        }
        return list;
    }
}

let gameId = 0;
const games = {};
const rememberGamesTime = 600000; // 10 minutes

// Connect to redis and try to find cached games

// Startup redis
const redis = require("redis");
const fs = require("fs");
let REDIS_HOST;
let useTls;
if (process.env.REDIS_HOST) {
    REDIS_HOST = process.env.REDIS_URL;
    useTls = true;
} else {
    REDIS_HOST = "6379";
    useTls = false;
}

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: (useTls) ? {
    tls: true,
    rejectUnauthorized: false
  } : undefined
});

// Function to add games to redis
const addToRedis = (id, gameToAdd) => {
    // Don't store won games
    if (gameToAdd.hasBeenWon) {
        client.del(`game${id}`);
        client.sRem("games", id);
        return;
    }
    client.sAdd("games", id);
    const entities = gameToAdd.getEntityList(true);
    const key = `game${id}`;
    client.hSet(key, "name", gameToAdd.name);
    client.hSet(key, "seed", gameToAdd.seed);
    client.hSet(key, "hash", gameToAdd.hash);
    client.hSet(key, "entities", JSON.stringify(entities));
    client.hSet(key, "timestamp", Date.now());
}

console.log("Connecting to redis...");
let redisConnected = false;
client.on('ready', async () => {
    console.log('Connected to redis.');
    redisConnected = true;
    // The primary reason to use this is to preserve game state if the server crashes, so, go find some games
    const redisGames = await client.sMembers("games");
    if (redisGames && redisGames.length > 0) {
        redisGames.forEach(gameId => {
            client.hGetAll(`game${gameId}`).then(result => {
                if (result.name && result.seed && result.hash && result.entities) {
                    try {
                        if (result.timestamp) {
                            if (Date.now() - result.timestamp > rememberGamesTime) {
                                console.log("Too old. Removing.");
                                client.del(`game${gameId}`);
                                client.sRem("games", gameId);
                                return;
                            }
                        }
                        const entities = JSON.parse(result.entities);
                        const newGame = new Game(result.name, result.seed, result.hash, entities);
                        games[gameId] = newGame;
                    } catch (error) {
                        console.log("Failed to retrieve game " + gameId);
                        client.del(`game${gameId}`);
                        client.sRem("games", gameId);
                    }
                }
            })
        });
    }
});

client.on("error", ()=>{
    redisConnected = false;
    console.log("Disconnected from redis...");
});

client.connect();

// New connections
wss.on('connection', function connection(ws) {

    console.log(`Client connected`);

    let myGameId = -1;
    let myEntityId = 0;

    ws.on('close', () => {
        console.log(`Client disconnected`);
        // Do all of the cleanup. Remove player from games they're in.
        if (myGameId >= 0) {
            const game = games[myGameId];
            const index = game.clients.indexOf(ws);
            if (index >= 0) {
                game.clients.splice(index, 1);
                if (game.clients.length <= 0) {
                    // Add a timestamp. Games empty for too long will be purged later on.
                    games[myGameId].emptySince = Date.now();
                }
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
    });

    // I want to avoid spam if possible. Try to rate limit identical messages
    const messageRateInMilliseconds = 1000;
    const messageTimes = {};

    // Handle messages. We're mostly just a fancy relay. Minimize server-side work. Opens it up to cheating, but this is a casual game; it's fine for our purposes.
    ws.on('message', (data, isBinary) => {
        const messageString = isBinary ? data : data.toString();

        // Don't re-send identical messages that are being sent too often.
        const timestamp = Date.now();
        for (let key in messageTimes) {
            if (timestamp - messageTimes[key] > messageRateInMilliseconds) {
                delete messageTimes[key];
            }
        }
        const lastTime = messageTimes[messageString];
        
        if (lastTime) {
            return;
        }
        messageTimes[messageString] = timestamp;

        let message;
        try {
            message = JSON.parse(messageString);
        } catch (error) {
            console.log("Unable to parse message", e);
        }

        switch(message.requestType) {
            case "Request":
                if (message.details === "games") {
                    const gameList = [];
                    for (const key in games) {
                        const game = games[key];

                        if (game.clients.length <= 0) {
                            if (game.emptySince && Number.isFinite(game.emptySince)) {
                                if ((Date.now() - game.emptySince > rememberGamesTime)) {
                                    delete games[key];
                                    if (redisConnected) {
                                        client.sRem("games", key);
                                        client.del(`game${key}`);
                                    }
                                    continue;
                                } else if (!game.hasBeenWon) {
                                    game.emptySince += 60000; // give the viewer a minute to figure shit out
                                }
                            } else {
                                game.emptySince = Date.now();
                            }
                        }

                        if (game.hasBeenWon) {
                            if (redisConnected) {
                                client.sRem("games", key);
                                client.del(`game${key}`);
                            }
                            // Don't show won games. Let them drift into the night.
                            continue;
                        }

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
                    const name = getRandomName();//message.name ? message.name : "Mystery Friend";
                    const artNum = (Number.isFinite(message.art) && message.art >= 0) ? message.art : 0;

                    const emojis = ["????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????","????"];

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
                } else if (message.details === "gameWon") {
                    const game = games[myGameId];
                    if (game) {
                        game.hasBeenWon = true;
                    }
                }
                break;
            // New game being created
            case "SessionDetails":
                gameId++;
                if (message.name, message.seed, message.hash, message.entities) {
                    const gameName = `${Math.floor(Math.random() * 100 + 1)} ${randomStreet()}`;
                    const newGame = new Game(gameName, message.seed, message.hash, message.entities);
                    games[gameId] = newGame;
                    myGameId = gameId;
                    if (message.creatorId) {
                        myEntityId = message.creatorId;
                    }
                    newGame.clients.push(ws);
                    ws.send(JSON.stringify({
                        requestType: "NameAssignment",
                        name: getRandomName(),
                        gameName: gameName,
                        serverId: myGameId
                    }));
                    if (redisConnected) {
                        addToRedis(myGameId, newGame);
                    }
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
                    let updateRedis = false;
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
                                if (entity.kind !== "player") {
                                    updateRedis = true;
                                }
                            }
                        }
                    });
                    if (redisConnected && updateRedis) {
                        addToRedis(myGameId, game);
                    }
                }
                break;
        }
    })
});
