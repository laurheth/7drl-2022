import Tile from "./Tile";
import GameDisplay from "./GameDisplay";
import { Random } from "roguelike-pumpkin-patch";
import Player from "./Player";

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
     * Display to use to show this map.
     */
    display:GameDisplay;

    /**
     * Center to display the view from.
     */
    cameraPosition:[number, number, number];

    constructor(name:string, seed:number, hash:number, display:GameDisplay) {
        this.name = name;

        this.seed = Math.floor(seed);
        
        // Random numbers wowow
        this.random = new Random(this.seed);

        // Generate map data
        this.mapData = {};
        this.generateMap();

        // Add in a hash check, to make sure we didn't fuck up
        // Store the hash
        this.hashValue = hash;

        this.display = display;

        this.cameraPosition = [0,0,0];
    }

    /**
     * Generate a map!
     */
    generateMap() {
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
                if (i === 0 && j === 0) {
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
        this.display.draw(this, ...this.cameraPosition);
    }
}

export default GameMap;