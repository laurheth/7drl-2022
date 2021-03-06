import GameMap from "./GameMap";
import Thing from "./Thing";
import Tile from "./Tile";

/**
 * Something that lies on the ground and is stationary unless moved
 */
class Garbage extends Thing {
    constructor(art:string, position:[number,number,number], map:GameMap) {
        super(art, position, map);
        this.kind = "garbage";
    }

    canFitHere(tile:Tile):boolean {
        return tile && tile.passable && !tile.garbage;
    }

    /**
     * Expand on move to also include a check for winning
     */
    move(newPosition: [number, number, number]): boolean {
        const result = super.move(newPosition);
        this.map.checkForWin();
        return result;
    }
}

export default Garbage;
