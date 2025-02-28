import { goals } from "mineflayer-pathfinder";
import type { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { PathfinderAbstractionEvents, PathfinderAbstractionOptions, PathfinderStopConditions } from "./types";
import type { Entity } from "prismarine-entity";
import { EventEmitter } from "events";
import TypedEmitter from "typed-emitter"
import type {Block as PBlock} from "prismarine-block"
import { Direction } from "../constants";


// TODO: this should REALLY be in a state machine implementation, but for phase 1 I'll do this instead.
export class PathfinderAbstraction extends (EventEmitter as new () => TypedEmitter<PathfinderAbstractionEvents>) {
  public constructor(private readonly bot: Bot) {
    super();
  }

  private setupListeners(goal: goals.Goal, stopIfFound: PathfinderStopConditions) {
    const eFilter = (e: Entity) => {
      if (stopIfFound.entities == null) return false;
      

      // check if the entity is in the list of entities to stop for
      if (Object.prototype.hasOwnProperty.call(stopIfFound.entities, "entityTypes")) {
        const care = (stopIfFound.entities as any).entityTypes.includes(e.type);
        if (!care) return false;
      }

      // lmao this code sucks
      if (Object.prototype.hasOwnProperty.call(stopIfFound.entities, "ids")) {
        if (!e.name) return false;
        const mobId = this.bot.registry.entitiesByName[e.name].id;
        const care = (stopIfFound.entities as any).ids.includes(mobId);
        if (!care) return false;
      }

      const dist = e.position.distanceTo(this.bot.entity.position);
      return dist <= stopIfFound.entities.radius;
    };

    const blCheck = () => {
      if (stopIfFound.blocks == null) return false;
      
      const bPos = this.bot.findBlocks({
        matching: (block) => stopIfFound.blocks?.types.includes(block.type) ?? false,
        maxDistance: stopIfFound.blocks?.radius ?? 0, // should always exist, but just in case
      });

      const blocks = bPos.map((b) => this.bot.blockAt(b)!);
      const visible = blocks.filter((b) => this.bot.canSeeBlock(b));
      return visible
    }

    // TODO: temporary fix to make the biome check work (TOO LAGGY, NEEDS A FIX)
    let lastCheck = this.bot.entity.position.clone();
    const biCheck = () => {
      if (stopIfFound.biomes == null) return false;

      if (lastCheck.distanceTo(this.bot.entity.position) < 1) return false;
      lastCheck = this.bot.entity.position.clone();

      const biomes = this.bot.semanticWorld.nearbySurroundings.biomes(Direction.ALL, stopIfFound.biomes.radius);
      for (const [num, pt] of biomes.entries()) {
        if (stopIfFound.biomes.types.includes(num)) {
          return {id: num, position: pt};
        }
      }
      return false;
    }

    const moveListener = (lastMove: Vec3) => {
      // sanity check

       // check if there is a mob in the way
      if (stopIfFound.entities != null) {
        const e = this.bot.nearestEntity(eFilter);
        if (e != null) {
          cleanup();
          this.emit('mobCancel', e);
        }
      }

      // check if there is a block we want to stop for
      if (stopIfFound.blocks != null) {
        const res = blCheck(); // uses current pos, not last pos, so no need to pass this in.
        if (res !== false && res.length > 0) {
          cleanup();
          this.emit('blockCancel', res);
        }
      }

      if (stopIfFound.biomes != null) { 
        const b = biCheck()
        if (b !== false) {
          cleanup();
          this.emit('biomeCancel', b.id, b.position)
        }
      }
    };

    const cleanup = () => {
      this.bot.off("goal_reached", cleanup);
      this.bot.off("path_stop", cleanup);
      this.bot.off("move", moveListener);

      if (goal === this.bot.pathfinder.goal) {
        this.bot.pathfinder.stop()
      }
    };

    this.bot.on('move', moveListener); // handle intermittent movement // lol spelled that wrong probably
    this.bot.on('goal_reached', cleanup); // handle completion
    this.bot.on('path_stop', cleanup); // handle cancelling/interrupt
  }

  // TODO: make return typing more concise so both LLM (string format) and CLI (basic/no output) can use this.
  public async pathfindToCoordinate(coords: Vec3, stopIfFound: PathfinderStopConditions = {}) {
    // this will break the block if it is inside a block
    const goal = new goals.GoalBlock(coords.x, coords.y, coords.z); 
    this.bot.pathfinder.setGoal(goal);

    this.setupListeners(goal, stopIfFound)

    const res = await new Promise<void | string>((resolve) => {
      this.bot.on('goal_reached', () => {
        resolve();
      });

      this.bot.on('path_stop', () => {
        resolve(`cancelled pathfinding`);
      });

      this.on('mobCancel', (e) => {
        resolve(`cancelled pathfinding due to mob: ${e}`);
      })

      this.on('blockCancel', (b) => {
        resolve(`cancelled pathfinding due to block: ${b}`);
      })

      this.on('biomeCancel', (b, pos) => {
        resolve(`cancelled pathfinding due to biome: ${b} at ${pos}`);
      })
    });

    return res;
  }
}
