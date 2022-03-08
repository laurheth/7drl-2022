import { Display } from "roguelike-pumpkin-patch";
import GameMap from "./GameMap";

class GameDisplay {
    width = 20;
    height = 20;
    display:Display;

    // Game display constructor
    constructor(width=20, height=20) {
        this.height = height;
        this.width = width;

        // First, select the target element you want the display to be within
        const target = document.getElementById("display");

        if (!target) {
            throw new Error("Missing display.");
        }
        
        // Paramaters object
        const params = {
            // Required! The display must go somewhere
            target: target,
            // Width of the display in tiles
            width: this.width,
            // Height of the display in tiles
            height: this.height,
        };

        this.display = new Display(params);

        // Set the tile size so that it fits its container
        this.display.tileSize = this.display.calculateTileSize();

        // One cool thing you can do is add a listener for window resizing
        // Keep your display looking good!
        window.addEventListener("resize",()=>{
            this.display.tileSize = this.display.calculateTileSize();
        });
    }

    /**
     * Draw the map
     */
    draw(map:GameMap, x:number, y:number, z:number) {

        const xx = x - Math.floor(this.width / 2);
        const yy = y - Math.floor(this.height / 2);

        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                this.display.setTile(i, j, {
                    content: map.getTile(i + xx, j + yy, z)?.getArt()
                });
            }
        }
    }
}

export default GameDisplay;