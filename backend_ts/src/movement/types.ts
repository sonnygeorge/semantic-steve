import type { Entity, EntityType } from "prismarine-entity";
import type {Block as PBlock }from "prismarine-block"



export type PathfinderAbstractionEvents = {
    mobCancel: (e: Entity) => void;
    blockCancel: (b: PBlock[]) => void;
  }

export interface PathfinderAbstractionOptions {
  mobCheck?: {
    types: EntityType[];
    radius: number;
  };
}

export interface PathfinderStopConditions {
  blocks?: {
    types: number[];
    radius: number;
  };
  entities?: {
    radius: number;
  } & (
    | {
        entityTypes: EntityType[];
      }
    | { ids: number[] }
  );
}
