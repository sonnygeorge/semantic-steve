import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { ConnectingSide } from "../types";
import { MAX_PLACEMENT_REACH } from "../constants";

/**
 * Represents a face connecting two adjacent cubed meters in the Minecraft world.
 */
export class CubedMeterFace {
  private bot: Bot;
  public readonly corners: [Vec3, Vec3, Vec3, Vec3];

  constructor(bot: Bot, c1: Vec3, c2: Vec3, c3: Vec3, c4: Vec3) {
    for (const corner of [c1, c2, c3, c4]) {
      if (
        !Number.isInteger(corner.x) ||
        !Number.isInteger(corner.y) ||
        !Number.isInteger(corner.z)
      ) {
        throw new Error("All corner coordinates must be integers");
      }
    }
    this.bot = bot;
    this.corners = [c1, c2, c3, c4];
  }

  public getCenter(): Vec3 {
    const [c1, c2, c3, c4] = this.corners;
    return new Vec3(
      (c1.x + c2.x + c3.x + c4.x) / 4,
      (c1.y + c2.y + c3.y + c4.y) / 4,
      (c1.z + c2.z + c3.z + c4.z) / 4,
    );
  }

  public isWithinReachForPlacement(): boolean {
    const center = this.getCenter();
    const distance = this.bot.entity.position.distanceTo(center);
    return distance <= MAX_PLACEMENT_REACH;
  }
}

/**
 * Represents a cubic meter in the Minecraft world, with connections to its adjacent blocks.
 */
export class CubedMeter {
  private bot: Bot;
  public readonly coords: Vec3;
  public readonly faces: Map<ConnectingSide, CubedMeterFace>;

  constructor(bot: Bot, coords: Vec3) {
    if (
      !Number.isInteger(coords.x) ||
      !Number.isInteger(coords.y) ||
      !Number.isInteger(coords.z)
    ) {
      throw new Error("Cubed meter coords must be integers");
    }
    this.bot = bot;
    this.coords = coords;
    this.faces = this.createFaces();
  }

  private createFaces(): Map<ConnectingSide, CubedMeterFace> {
    const x = this.coords.x;
    const y = this.coords.y;
    const z = this.coords.z;
    const corners: Vec3[] = [
      new Vec3(x, y, z), // 0: bottom, north, west
      new Vec3(x + 1, y, z), // 1: bottom, north, east
      new Vec3(x + 1, y, z + 1), // 2: bottom, south, east
      new Vec3(x, y, z + 1), // 3: bottom, south, west
      new Vec3(x, y + 1, z), // 4: top, north, west
      new Vec3(x + 1, y + 1, z), // 5: top, north, east
      new Vec3(x + 1, y + 1, z + 1), // 6: top, south, east
      new Vec3(x, y + 1, z + 1), // 7: top, south, west
    ];
    const sideToFaceMapping: [ConnectingSide, CubedMeterFace][] = [
      [
        ConnectingSide.WEST,
        new CubedMeterFace(
          this.bot,
          corners[0],
          corners[3],
          corners[7],
          corners[4],
        ),
      ],
      [
        ConnectingSide.EAST,
        new CubedMeterFace(
          this.bot,
          corners[1],
          corners[5],
          corners[6],
          corners[2],
        ),
      ],
      [
        ConnectingSide.BOTTOM,
        new CubedMeterFace(
          this.bot,
          corners[0],
          corners[1],
          corners[2],
          corners[3],
        ),
      ],
      [
        ConnectingSide.TOP,
        new CubedMeterFace(
          this.bot,
          corners[4],
          corners[7],
          corners[6],
          corners[5],
        ),
      ],
      [
        ConnectingSide.NORTH,
        new CubedMeterFace(
          this.bot,
          corners[0],
          corners[4],
          corners[5],
          corners[1],
        ),
      ],
      [
        ConnectingSide.SOUTH,
        new CubedMeterFace(
          this.bot,
          corners[3],
          corners[2],
          corners[6],
          corners[7],
        ),
      ],
    ];
    const facesMap = new Map<ConnectingSide, CubedMeterFace>();
    for (const [side, face] of sideToFaceMapping) {
      facesMap.set(side, face);
    }
    return facesMap;
  }

  public getThreeClosestFaces(): Map<ConnectingSide, CubedMeterFace> {
    const faceDistances: { side: ConnectingSide; distance: number }[] = [];
    for (const [side, face] of this.faces) {
      const center = face.getCenter();
      const distance = this.bot.entity.position.distanceTo(center);
      faceDistances.push({ side, distance });
    }
    faceDistances.sort((a, b) => a.distance - b.distance);
    const closestFaces = new Map<ConnectingSide, CubedMeterFace>();
    for (let i = 0; i < 3; i++) {
      const { side } = faceDistances[i];
      closestFaces.set(side, this.faces.get(side)!);
    }
    return closestFaces;
  }
}
