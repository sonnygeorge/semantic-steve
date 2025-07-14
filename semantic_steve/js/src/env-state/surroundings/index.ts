import {
  ImmediateSurroundingsDTO,
  DistantSurroundingsInADirectionDTO,
} from "./dto";
import {
  VisibleVicinityContents,
  ImmediateSurroundings,
  DistantSurroundingsInADirection,
  Vicinity,
  VicinitiesObserver,
} from "./vicinity";
import { SurroundingsDTO } from "./dto";
import { Surroundings } from "./surroundings";

export {
  ImmediateSurroundingsDTO,
  DistantSurroundingsInADirectionDTO,
  VisibleVicinityContents,
  ImmediateSurroundings,
  DistantSurroundingsInADirection,
  VicinitiesObserver,
  Vicinity,
  SurroundingsDTO,
  Surroundings,
};

// TODO:
// - Update VicinitiesObserver to:
//   - Keep track of item itentities and mob entities
//   - For each vicinity, store distance-sorted, offset-based idxs for accessing the `OffsetBased3DArray`s
// - Write the Vicinity class to expose the expected API for querying the surroundings's vicinities
// - Write the ImmediateSurroundings and DistantSurroundingsInADirection classes to implement getDTO methods
// - Add MobType to thing-type implementations and test approaching mobs
// - Add KillMob skill
