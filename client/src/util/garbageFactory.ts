import GameMap from "../classes/GameMap";
import Garbage from "../classes/Garbage";

interface GarbageFact {
    art: string;
}

const garbages:{[key:string]:GarbageFact} = {
    "banana": {
        art: "🍌"
    },
    "waste": {
        art: "💩"
    },
    "lost socks": {
        art: "🧦"
    },
    "useless floppy disk": {
        art: "💾"
    },
    "used bandage": {
        art: "🩹"
    },
    "funged token": {
        art: "💸"
    },
    "unexplained moistness": {
        art: "💦"
    },
    "old pizza": {
        art: "🍕"
    },
    "glitter": {
        art: "✨"
    },
    "worthless rock": {
        art: "💎"
    },
    "spam": {
        art: "📧"
    },
    "bad album": {
        art: "💿"
    },
};

const kinds:string[] = [];

/**
 * Helper function to make some garbage.
 */
export const makeSomeGarbage = (position:[number, number, number], map:GameMap, kind:string = ""):Garbage => {
    if (!kind || !garbages[kind]) {
        if (kinds.length === 0) {
            for (const key in garbages) {
                kinds.push(key);
            }
        }

        kind = map.random.getRandomElement(kinds);
    }

    const garbage = new Garbage(garbages[kind].art, position, map);
    garbage.kind = kind;
    return garbage;
}

export const isGarbage = (kind:string) => {
    return garbages[kind] ? true : false;
}