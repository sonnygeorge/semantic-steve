import type { Entity, EntityType } from "prismarine-entity";
import type {Block as PBlock }from "prismarine-block"
import type {Vec3} from 'vec3'


export type PathfinderAbstractionEvents = {
    mobCancel: (e: Entity) => void;
    blockCancel: (b: PBlock[]) => void;
    biomeCancel: (b: number, pos: Vec3) => void; // TODO: add positional data?
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
  biomes?: {
    types: number[];
    radius: number;
  }
}
