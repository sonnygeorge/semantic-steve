import assert from "assert";
import * as fs from "fs";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { SurroundingsRadii, VicinityName, DirectionName } from "../common";
import { Block as PBlock } from "prismarine-block";
import { getVicinitiesToOffsets } from "./vicinity";
import { getEyePos } from "../../../utils/misc";
import { VisibilityRaycaster } from "./visibility-raycaster";
import { ThreeDimOrientation } from "./types";

export class VicinitiesObserver {
  private bot: Bot;
  private visibilityRaycaster: VisibilityRaycaster;
  private curEyeVoxel?: Vec3;
  public vicinitiesToOffsets: Map<VicinityName, Vec3[]>;
  public radii: SurroundingsRadii;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    console.log("INITIALIZING V-OBSERVER");
    this.bot = bot;
    this.radii = radii;
    this.visibilityRaycaster = new VisibilityRaycaster(
      bot,
      this.radii.distantSurroundingsRadius
    );
    this.vicinitiesToOffsets = getVicinitiesToOffsets(bot, radii);
  }

  public beginObservation(): void {
    console.log("V-OBSERVER SETTING UP LISTENERS");
    this.curEyeVoxel = this.bot.entity.position.floor();
    // Setup listeners
    this.bot.on("blockUpdate", this.handleBlockUpdate.bind(this));
    this.bot.on("move", this.handleBotMove.bind(this));
  }

  public handleBotMove(newBotPos: Vec3): void {
    const newEyeVoxel = getEyePos(this.bot, newBotPos).floor();
    if (this.curEyeVoxel && newEyeVoxel.equals(this.curEyeVoxel)) return;
    this.curEyeVoxel = newEyeVoxel;

    console.log("BOT MOVED TO NEW VOXEL, PERFORMING RAYCASTING");
    const start = performance.now();

    const raycasts: Array<
      [
        {
          phi: number;
          theta: number;
          hit: null | { x: number; y: number; z: number };
        }
      ]
    > = [];
    for (const [vecNorm, pBlock] of this.visibilityRaycaster.doRaycasting(
      this.curEyeVoxel
    )) {
      const orientation = new ThreeDimOrientation(vecNorm);

      // Save phi-theta pair
      const { phi, theta } = orientation.sphericalAngles;
      let offset = null;
      if (pBlock) {
        offset = pBlock.position.minus(newEyeVoxel);
        if (offset.y < -8) {
          console.log("here");
        }
      }
      raycasts.push([
        {
          phi,
          theta,
          hit: offset
            ? {
                x: offset.x,
                y: offset.y,
                z: offset.z,
              }
            : null,
        },
      ]);
    }

    const end = performance.now();
    console.log(`${raycasts.length} orientations raycasted`);
    console.log(`Num of hits: ${raycasts.filter((r) => r[0].hit).length}`);
    console.log(`Raycasting took ${(end - start).toFixed(4)} milliseconds`);

    // Save to file
    fs.writeFileSync("raycasts.json", JSON.stringify(raycasts));
  }

  public handleBlockUpdate(
    oldBlock: PBlock | null,
    newBlock: PBlock | null
  ): void {
    if (oldBlock && newBlock) {
      assert(oldBlock.position.equals(newBlock.position));
    } // I think this is always true since falling (moving) blocks are considered 'entities'
  }
}
