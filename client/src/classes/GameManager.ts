import GameDisplay from "./GameDisplay";
import GameMap from "./GameMap";
import Net from "./NetHandler";

/**
 * Bundles up the large scale game logic
 */
class GameManager {

    /**
     * Main display to use for the game
     */
    display:GameDisplay;

    /**
     * Map handler
     */
    gameMap:GameMap|null;

    /**
     * Network handler
     */
    net:Net;

    constructor() {
        this.display = new GameDisplay();
        this.net = new Net(this);
        this.gameMap = new GameMap("Cool map", Date.now(), 0, this);
        this.gameMap.refresh();
    }
}

export default GameManager;