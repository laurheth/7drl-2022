import { Random } from "roguelike-pumpkin-patch";
import GameMap from "./GameMap";
import Tile from "./Tile";

class Room {
    position:[number, number, number];
    instantiate:()=>void;
    random:Random;
    map:GameMap;

    constructor(position:[number, number, number], map:GameMap, instantiate?:()=>void) {
        this.position = [...position];
        if (instantiate) {
            this.instantiate = instantiate;
        } else {
            this.instantiate = ()=>this.rectangle();
        }
        this.random = map.random;
        this.map = map;
    }


    rectangle() {
        const width = this.random.getNumber(5,9,true);
        const height = this.random.getNumber(5,9,true);
        const offsetX = Math.floor(-width/2);
        const offsetY = Math.floor(-height/2);

        const colors = ['green','blue','purple'];
        const color = this.random.getRandomElement(colors);

        for (let x=0; x<=width; x++) {
            for (let y=0; y<=height; y++) {
                let newTile:Tile;
                const thisPos:[number, number, number] = [
                    this.position[0] + offsetX + x,
                    this.position[1] + offsetY + y,
                    this.position[2]
                ];
                const thisKey = this.map.locationKey(...thisPos);
                if (x === 0 || y === 0 || x===width || y===height) {
                    const currentTile = this.map.mapData[thisKey];
                    // if (currentTile && currentTile.replaceable) {
                    //     continue;
                    // }
                    if (currentTile && currentTile.art === '.') {
                        newTile = new Tile(
                            thisPos, '+', ['floor'], true, true, false
                        );
                    } else {
                        newTile = new Tile(
                            thisPos, '#', ['wall',color], false, true, true
                        );
                    }
                } else {
                    newTile = new Tile(
                        thisPos, '.', ['floor', 'room'], true, false, true
                    );
                }
                this.map.mapData[thisKey] = newTile;
            }
        }
    }

    distanceFrom(otherPos:[number, number, number]) {
        let squareDist = 0;
        for (let i=0; i<=2; i++) {
            squareDist += (otherPos[i] - this.position[i])**2;
        }
        return Math.sqrt(squareDist);
    }
}

export default Room;
