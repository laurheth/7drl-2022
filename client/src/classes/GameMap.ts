import Tile from "./Tile";
import { Random } from "roguelike-pumpkin-patch";
import Player from "./Player";
import Thing from "./Thing";
import GameManager from "./GameManager";
import Entity from "./Entity";
import NetHandler from "./NetHandler";
import { EntityDetails } from "../interfaces/NetInterfaces";
import Room from "./Room";

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

        this.nextThingId = 0;

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
                    entity.kind = "player";
                } else if (entity.kind === "player") {
                    newThing = new Entity('🦝', position, this);
                }
                if (newThing) {
                    newThing.kind = entity.kind;
                    newThing.setId(entity.id);
                }
            })
        }

        // Add in a hash check, to make sure we didn't fuck up
        // Store the hash
        this.hashValue = this.calculateHash();
        
        // Compare hashes to make sure we're actually on the same map.
        if (hash && this.hashValue !== hash) {
            console.log("The hashes don't match", this.hashValue, hash);
        }

        this.cameraPosition = [0,0,0];
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
        console.log("cam", this.cameraPosition);
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

    /**
     * Calculate a hash value for this map
     */
    calculateHash() {
        const tiles:string[] = [];
        for (const key in this.mapData) {
            tiles.push(key + this.mapData[key].art);
        }
        tiles.sort();
        let hash:number = 0;
        tiles.forEach(tile => {
            for (let i=0; i<tile.length; i++) {
                hash = (31 * hash + tile.charCodeAt(i)) << 0;
            }
        });
        return hash;
    }

    // All the map generating methods below this point...
    /**
     * Generate a map!
     */
     generateMap(generateThings:boolean = true) {
        for (let z=0; z<5; z++) {
            // Draw the core area
            this.coreArea(z, 4);
            const rooms:Room[] = [];

            // Pseudo room object to represent where the core area is
            rooms.push(new Room([0,0,z], this, ()=>{}));
            
            const nextPosition:[number, number, number] = [0,0,z];
            let maxSteps = 100;
            while (rooms.length < 10 && maxSteps > 0) {
                nextPosition[0] += this.random.getNumber(-10, 10, true);
                nextPosition[1] += this.random.getNumber(0, 3, true);
                if (rooms.every(room=>{
                    return (room.distanceFrom(nextPosition) > 13)
                })) {
                    rooms.push(new Room(nextPosition, this));
                    nextPosition[0] = 0;
                    nextPosition[1] = 0;
                }
                maxSteps--;
            }

            // Draw hallways between all of the rooms that have been prepped
            rooms.forEach((room, i) => {
                if (i === 0) {
                    return;
                }
                const otherRooms:Room[] = rooms.filter((_,j)=>i!==j && j < i);
                otherRooms.sort((a, b) => a.distanceFrom(room.position) - b.distanceFrom(room.position));
                for (let j=0; j<Math.min(2, otherRooms.length); j++) {
                    this.drawHallway(room.position, otherRooms[j].position);
                }
            });

            rooms.forEach(room => room.instantiate());
        }

        // Time to do some post-processing for doors
        const doorTiles:Tile[] = this.getTilesOfType('+');
        const doorTilesToFix:Tile[] = [];
        doorTiles.forEach(tile=>{
            const position = tile.position;
            let walls = [0, 0];
            let floors = [0, 0];
            let doors = [0, 0];
            for (let x=-1;x<2;x++) {
                for (let y=-1;y<2;y++) {
                    if (x !== 0 && y !== 0) {
                        continue;
                    }
                    if (x === 0 && y === 0) {
                        continue;
                    }
                    let index = 0;
                    if (y !== 0) {
                        index = 1;
                    }
                    const otherTile = this.getTile(
                        position[0] + x,
                        position[1] + y,
                        position[2]
                    );
                    if (otherTile) {
                        switch(otherTile.art) {
                            case '#':
                                walls[index]++;
                                break;
                            case '+':
                                doors[index]++;
                                break;
                            case '.':
                            case ' ':
                                floors[index]++;
                                break;
                        }
                    }
                }
            }
            
            for (let i=0; i<2; i++) {
                floors[i] += floors[i] * doors[i];
                walls[i] += walls[i] * doors[i];
            }
            
            if (!(floors.includes(2) && walls.includes(2))) {
                doorTilesToFix.push(tile);
            } else {
                tile.hideBaseArt = true;
                tile.classList.push('doorClosed');
            }
        });

        doorTilesToFix.forEach(tile=>{
            tile.art = '.';
            tile.hideBaseArt = true;
        });

        // Do some postprocessing for walls
        const wallTiles:Tile[] = this.getTilesOfType('#');

        if (generateThings) {
            new Player([0,0,0], this);
        }
    }

    /**
     * Central area with stairs, garbage chute, maybe an elevator shaft for the lols
     */
    coreArea(z:number, top:number) {
        let design:string[];
        if (z > 0) {
            design = [
                '    ####    ',
                '   ##XX##   ',
                '   #....#   ',
                '   #....#   ',
                '***##++##***',
                '*..........*',
                '*..........*',
                '*..######..*',
                '*..#XXXX#..*',
                '*..#XXXX#..*',
                '*..#XXXX#..*',
                '*..#XXXX#..*',
                '*..##++##..*',
                '*..........*',
                '*....><....*',
                '************',
            ];
        } else {
            design = [
                '    ####    ',
                '#####..#####',
                '#..........#',
                '#..........#',
                '#..........#',
                '#..........#',
                '#..........#',
                '#++######++#',
                '*..#....#..*',
                '*..#....#..*',
                '*..#....#..*',
                '*..#....#..*',
                '*..##++##..*',
                '*..........*',
                '*....<.....*',
                '************',
            ];
        }

        const xOffset = Math.floor(design[0].length / 2);
        const yOffset = Math.floor(design.length / 2);

        design.forEach((row,y)=>{
            row.split('').forEach((char,x)=>{
                let hideBase:boolean = false;
                let classList:string[] = [];
                if (char === ' ') {
                    return;
                }
                if (char === 'X') {
                    char = ' ';
                }
                if (z > 0 && z % 2 === 0) {
                    if (char === '>') {
                        char = '<';
                    } else if (char === '<') {
                        char = '>';
                    }
                }
                if (z >= top && char === '<') {
                    char = '.';
                }
                let replaceable = false;
                if (char === '*') {
                    replaceable = true;
                    char = '#';
                }
                switch (char) {
                    case '#':
                        hideBase = true;
                        classList.push('wall');
                        break;
                    case '.':
                        hideBase = true;
                    case '>':
                    case '<':
                    case '+':
                        classList.push('floor');
                }
                const newTile:Tile = new Tile([x - xOffset, y - yOffset, z], char, classList, char !== '#', replaceable, hideBase);
                this.mapData[this.locationKey(x - xOffset, y - yOffset, z)] = newTile;
            });
        });
    }

    /**
     * Draw some cool hallways. This is some messy as shit spaghetti.
     */
    drawHallway(start:[number, number, number], end:[number, number, number], thickness:number=2) {
        const position:[number, number, number] = [...start];
        const branchOptions = [[0,1],[-1,0],[1,0]];
        const xOffset = Math.floor(thickness / 2);
        const yOffset = Math.floor(thickness / 2);

        let direction:number[];
        if (this.random.getRandom() > 0.5) {
            direction = [ Math.sign(end[0] - start[0]), 0 ];
        } else {
            direction = [ 0, Math.sign(end[1] - start[1]), 0 ];
        }
            
        while (position.some((x,i) => x !== end[i])) {
            position[0] += direction[0];
            position[1] += direction[1];
            for (let dx = 0; dx <= thickness; dx++) {
                for (let dy = 0; dy <= thickness; dy++) {
                    const tilePos:[number, number, number] = [
                        position[0] + dx - xOffset,
                        position[1] + dy - yOffset,
                        position[2]];
                    const key = this.locationKey(...tilePos);
                    const currentTile = this.mapData[key];
                    if (!currentTile || currentTile.replaceable) {
                        let newTile:Tile;
                        if (dx === 0 || dy === 0 || Math.abs(dx) === thickness || Math.abs(dy) === thickness) {
                            newTile = new Tile(tilePos, '#', ['wall'], false, true, true);
                        } else {
                            newTile = new Tile(tilePos, '.', ['floor'], true, false, true);
                        }
                        this.mapData[key] = newTile;
                    }
                }
            }
            if (position[0] === end[0] || position[1] === end[1]) {
                if (Math.floor(Math.abs(end[1] - position[1])) > 0) {
                    direction = [ 0, Math.sign(end[1] - start[1]) ];
                } else if (Math.floor(Math.abs(end[0] - position[0])) > 0) {
                    direction = [ Math.sign(end[0] - start[0]), 0 ];
                } else {
                    return
                }
            }
        }
    }

    /**
     * Get tiles of a certain type to do something
     */
    getTilesOfType(char:string):Tile[] {
        const tiles:Tile[] = [];

        for (const key in this.mapData) {
            const thisTile = this.mapData[key];
            if (thisTile.art === char) {
                tiles.push(thisTile);
            }
        }

        return tiles;
    }
}

export default GameMap;