import Thing from "./Thing";
import Tile from "./Tile";

/**
 * Something that exists in the map and moves around.
 */
class Entity extends Thing {
    /**
     * Do a steppy.
     */
    step(diff:[number, number, number]):boolean {
        const newPosition:[number, number, number] = [
            diff[0] + this.position[0],
            diff[1] + this.position[1],
            diff[2] + this.position[2]
        ];
        return this.move(newPosition);
    }

    /**
     * Expand upon move.
     */
    move(newPosition:[number, number, number]):boolean {
        const newTile:Tile|null = this.map.getTile(...newPosition);

        if (newTile && newTile.entity) {
            this.interact(newTile.entity);
        }
        
        return super.move(newPosition);
    }

    /**
     * Interact with someone else.
     */
    interact(otherEntity:Entity) {

    }
}

export default Entity;
