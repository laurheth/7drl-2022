import GameDisplay from "./classes/GameDisplay";
import GameMap from "./classes/GameMap";
import Net from "./classes/NetHandler";

const display = new GameDisplay();
const gameMap = new GameMap("Cool map", Date.now(), 0, display);
const net = new Net();

display.draw(gameMap, 0, 0, 0);