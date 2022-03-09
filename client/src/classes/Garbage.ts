import GameMap from "./GameMap";
import Thing from "./Thing";

/**
 * Something that lies on the ground and is stationary unless moved
 */
class Garbage extends Thing {
    constructor(art:string, position:[number,number,number], map:GameMap) {
        super(art, position, map);
        this.kind = "garbage";
    }
}

export default Garbage;
