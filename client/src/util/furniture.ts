import Entity from "../classes/Entity";
import GameMap from "../classes/GameMap";
import Tile from "../classes/Tile";

interface FurnitureFact {
    name: string;
    art: string;
}

export const furniture:FurnitureFact[] = [
    {
        name: "Toilet",
        art: "🚽"
    },
    {
        name: "Bed",
        art: "🛏"
    },
    {
        name: "Chair",
        art: "🪑"
    },
    {
        name: "Bathtub",
        art: "🛁"
    },
    {
        name: "TV",
        art: "📺"
    },
    {
        name: "Radio",
        art: "📻"
    },
    {
        name: "Telephone",
        art: "☎"
    },
];

export const furnitureFactory = (kind:string, position:[number, number, number], map:GameMap):Entity => {
    let newFurniture:Entity|undefined;
    for (let i=0; i<furniture.length; i++) {
        if (furniture[i].name === kind) {
            newFurniture = new Entity(furniture[i].art, position, map);
        }
    }
    if (!newFurniture) {
        newFurniture = new Entity('?', position, map);
    }
    newFurniture.kind = kind;
    newFurniture.pushable = true;

    return newFurniture;
};