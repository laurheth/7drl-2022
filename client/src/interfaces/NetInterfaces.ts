/**
 * Generic messages that can be sent to update things.
 */
 export interface ThingUpdate {
    id: number;
    position?:[number, number, number];
    message?:string;
}

export interface ThingUpdateBundle {
    requestType: "Updates";
    sender?:number;
    updates: ThingUpdate[];
}

/**
 * List of entitiees, what kind they are, and where they are
 */
export interface EntityDetails {
    id: number;
    kind: string;
    position:[number, number, number];
    status?: string;
    art?: string;
    name?:string;
}

/**
 * Information needed to connect to another game, or help others connect to us
 */
export interface SessionDetails {
    requestType: "SessionDetails";
    name: string;
    seed: number;
    hash: number;
    id: number;
    entities: EntityDetails[];
    creatorId?: number;
}

/**
 * Teaser summary of a game that's available to join.
 */
export interface GameSummary {
    id: number;
    name: string;
    players: number;
}

/**
 * Set of games to join
 */
export interface GameList {
    requestType: "GameList";
    games: GameSummary[];
}

/**
 * Ask the server for something
 */
export interface GameRequest {
    requestType: "Request";
    details: string;
    id?: number;
}

export interface JoinRequest extends GameRequest {
    requestType: "Request";
    details: "join";
    id: number;
    name: string;
    art: number;
}

/**
 * Spawn a new thing
 */
export interface Spawn {
    requestType: "Spawn";
    id: number;
    kind: string;
    name?: string;
    art?: string;
    position: [number, number, number];
}

export interface NameAssignment {
    requestType: "NameAssignment";
    name: string;
    gameName: string;
    serverId: number;
}

/**
 * Generic message
 */
export type GameMessage = GameRequest | GameList | SessionDetails | ThingUpdateBundle | Spawn | JoinRequest | NameAssignment;
