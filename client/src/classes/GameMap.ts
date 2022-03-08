import Tile from "./Tile";
import { Random } from "roguelike-pumpkin-patch";
import Player from "./Player";
import Thing from "./Thing";
import GameManager from "./GameManager";
import { EntityDetails, default as NetHandler } from "./NetHandler";
import Entity from "./Entity";

/**
 * Class to carry around all of the important map data.
 */
class GameMap {
    /**
     * Name of the map
     */
    name:string;

    /**
     * Map data.
     */
    mapData:{[key: string]:Tile};

    /**
     * Hash value of the map, to compare to other clients.
     */
    hashValue:number;

    /**
     * Random seed.
     */
    seed:number;

    /**
     * Randomizer
     */
    random:Random;

    /**
     * The main manager for the game
     */
    game:GameManager

    /**
     * Next thing ID
     */
    nextThingId:number;

    /**
     * Center to display the view from.
     */
    cameraPosition:[number, number, number];

    /**
     * Collection of things on the map
     */
    things:{[key:number]:Thing}

    constructor(name:string, seed:number, hash:number, game:GameManager, entities:EntityDetails[]|null = null) {
        this.game = game;

        this.things = {};

        this.name = name;

        this.seed = Math.floor(seed);

        // Random numbers wowow
        this.random = new Random(this.seed);

        // Generate map data
        this.mapData = {};
        this.generateMap(entities === null);

        if (entities) {
            entities.forEach(entity => {
                const position = entity.position;
                let newThing = null;
                if (entity.kind === "you") {
                    newThing = new Player(position, this);
                } else if (entity.kind === "player") {
                    newThing = new Entity('@', position, this);
                }
                if (newThing) {
                    newThing.setId(entity.id);
                }
            })
        }

        // Add in a hash check, to make sure we didn't fuck up
        // Store the hash
        this.hashValue = hash;

        this.cameraPosition = [0,0,0];

        this.nextThingId = 0;
    }

    /**
     * Generate a map!
     */
    generateMap(generateThings:boolean = true) {
        const dimensions = 10;
        for (let i=-dimensions; i<=dimensions; i++) {
            for (let j=-dimensions; j<=dimensions; j++) {
                let newTile:Tile;
                if (Math.abs(i) === dimensions || Math.abs(j) === dimensions) {
                    newTile = new Tile('#', false);
                } else {
                    newTile = new Tile('.', true);
                }
                this.mapData[this.locationKey(i, j, 0)] = newTile;
                if (i === 0 && j === 0 && generateThings) {
                    new Player([i,j,0], this);
                }
            }
        }
    }

    /**
     * Parse a location into a key string
     */
    locationKey(x:number, y:number, z:number):string {
        return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }

    /**
     * Parse a key location into coordinates.
     */
    locationFromKey(key:string) {
        return key.split(',').map(x=>parseInt(x));
    }

    /**
     * Get the tile at the position
     */
    getTile(x:number, y:number, z:number):Tile|null {
        return this.mapData[this.locationKey(x, y, z)];
    }

    /**
     * Refresh the view
     */
    refresh() {
        this.game.display.draw(this, ...this.cameraPosition);
    }

    /**
     * Fetch an ID for a thing to use
     */
    getId() {
        return this.nextThingId++;
    }

    /**
     * Increment the thing ID
     */
    setThingId(id:number) {
        this.nextThingId = id;
    }
}

export default GameMap;