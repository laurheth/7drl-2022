import Tile from "./Tile";
import { Random } from "roguelike-pumpkin-patch";
import Player from "./Player";
import Thing from "./Thing";
import GameManager from "./GameManager";
import Entity from "./Entity";
import NetHandler from "./NetHandler";
import { EntityDetails } from "../interfaces/NetInterfaces";

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
                    newThing = new Entity('@', position, this);
                    console.log(newThing.position, newThing.tile);
                }
                if (newThing) {
                    newThing.kind = entity.kind;
                    newThing.setId(entity.id);
                }
            })
        }

        // Add in a hash check, to make sure we didn't fuck up
        // Store the hash
        this.hashValue = hash;

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
        this.game.display.draw(this, ...this.cameraPosition);
    }

    /**
     * Fetch an ID for a thing to use
     */
    getId() {
        console.log(this.nextThingId);
        return this.nextThingId++;
    }

    /**
     * Increment the thing ID
     */
    setThingId(id:number) {
        console.log(this.nextThingId, id);
        this.nextThingId = id;
    }

    // All the map generating methods below this point...
    /**
     * Generate a map!
     */
     generateMap(generateThings:boolean = true) {
        for (let z=0; z<5; z++) {
            this.coreArea(z, 4);
            this.drawHallways(z, this.random.getNumber(3, 4, true), 250);
        }
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
                const newTile:Tile = new Tile(char, char !== '#', replaceable);
                this.mapData[this.locationKey(x - xOffset, y - yOffset, z)] = newTile;
            });
        });
    }

    /**
     * Draw some cool hallways. This is some messy as shit spaghetti.
     */
    drawHallways(z:number, thickness:number, targetIterations:number) {
        const position:[number, number, number] = [0,0,z];
        let direction:number[];
        const branchOptions = [[0,1],[-1,0],[1,0]];
        const xOffset = Math.floor(thickness / 2);
        const yOffset = Math.floor(thickness / 2);
        for (let branchNum=0; branchNum<6; branchNum++) {
            position[0] = 0;
            position[1] = 0;
            const branch = this.random.getRandomElement(branchOptions);
            direction = [...branch];
            let minSteps = this.random.getNumber(5 + thickness * 2 - branchNum, 15 + thickness * 2, true);
            
            for (let i = 0; i < targetIterations / 6 + 1; i++) {
                position[0] += direction[0];
                position[1] += direction[1];
                if (position[1] < 0 && Math.abs(position[0]) < 5) {
                    minSteps -= 5;
                }
                const timeToHeadHome = Math.abs(position[0]) + Math.abs(position[1]) + i >= (targetIterations / 6 - 2);
                if (timeToHeadHome) {
                    minSteps = minSteps > Math.max(Math.abs(position[0]), Math.abs(position[1])) ? 0 : minSteps;
                }
                for (let dx = 0; dx <= thickness; dx++) {
                    for (let dy = 0; dy <= thickness; dy++) {
                        const key = this.locationKey(
                            position[0] + dx - xOffset,
                            position[1] + dy - yOffset,
                            z);
                        const currentTile = this.mapData[key];
                        if (!currentTile || currentTile.replaceable) {
                            let newTile:Tile;
                            if (dx === 0 || dy === 0 || Math.abs(dx) === thickness || Math.abs(dy) === thickness) {
                                newTile = new Tile('#', false, true);
                            } else {
                                newTile = new Tile('.', true, false);
                            }
                            this.mapData[key] = newTile;
                        }
                    }
                }
                minSteps--;
                // Weave around randomly
                if (minSteps <= 0 && !timeToHeadHome) {
                    if (this.random.getRandom() > 0.5) {
                        direction = [direction[1], direction[0]];
                    } else {
                        direction = [-direction[1], -direction[0]];
                    }
                    minSteps = minSteps = this.random.getNumber(thickness * 2, 10 + thickness * 2, true);
                }
                // Head back home to make nice loops
                if (minSteps <= 0 && timeToHeadHome) {
                    if (Math.abs(position[1]) > Math.abs(position[0])) {
                        direction = [0, -Math.sign(position[1])]
                    } else {
                        direction = [-Math.sign(position[0]), 0]
                    }
                    minSteps = Math.max(Math.abs(position[0]), Math.abs(position[1]));
                }
                // Don't overlap with the garbage room though
                if (position[1] < 0) {
                    if (direction[1] !== 0) {
                        direction[1] = 1;
                    } else {
                        direction[0] = Math.sign(position[0]);
                    }
                }
            }
        };
    }
}

export default GameMap;