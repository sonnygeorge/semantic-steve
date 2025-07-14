import assert from "assert";
import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { MAX_PLACEMENT_REACH } from "../constants";
import { SerializedVoxelOffset, VoxelFace } from "../types";
import { serializeVec3 } from "./generic";

export function isVoxel(vec: Vec3): boolean {
  return (
    Number.isInteger(vec.x) &&
    Number.isInteger(vec.y) &&
    Number.isInteger(vec.z)
  );
}

/**
 * Helper function to serialize a face consistently
 * Uses the voxel that the face is the bottom, north, or west face of
 *
 * @returns A string in the format "${serializeVec3(voxelOffset)},${BlockFace}"
 */
export function serializeVoxelOffsetFace(
  voxelPos: Vec3,
  face: number
): SerializedVoxelOffset {
  let canonicalVoxel: Vec3;

  switch (face) {
    case VoxelFace.BOTTOM:
    case VoxelFace.TOP:
      // For vertical faces, use the lower voxel (smaller Y)
      canonicalVoxel =
        face === VoxelFace.BOTTOM
          ? new Vec3(voxelPos.x, voxelPos.y - 1, voxelPos.z)
          : new Vec3(voxelPos.x, voxelPos.y, voxelPos.z);
      return `${serializeVec3(canonicalVoxel)},${VoxelFace.BOTTOM}`;

    case VoxelFace.NORTH:
    case VoxelFace.SOUTH:
      // For north-south faces, use the northern voxel (smaller Z)
      canonicalVoxel =
        face === VoxelFace.NORTH
          ? new Vec3(voxelPos.x, voxelPos.y, voxelPos.z - 1)
          : new Vec3(voxelPos.x, voxelPos.y, voxelPos.z);
      return `${serializeVec3(canonicalVoxel)},${VoxelFace.NORTH}`;

    case VoxelFace.WEST:
    case VoxelFace.EAST:
      // For east-west faces, use the western voxel (smaller X)
      canonicalVoxel =
        face === VoxelFace.WEST
          ? new Vec3(voxelPos.x - 1, voxelPos.y, voxelPos.z)
          : new Vec3(voxelPos.x, voxelPos.y, voxelPos.z);
      return `${serializeVec3(canonicalVoxel)},${VoxelFace.WEST}`;

    default:
      throw new Error(`Unknown face: ${face}`);
  }
}

export class VoxelFaceAroundBot {
  private bot: Bot;
  public readonly corners: [Vec3, Vec3, Vec3, Vec3];

  constructor(bot: Bot, c1: Vec3, c2: Vec3, c3: Vec3, c4: Vec3) {
    for (const corner of [c1, c2, c3, c4]) {
      assert(isVoxel(corner));
    }
    this.bot = bot;
    this.corners = [c1, c2, c3, c4];
  }

  public getCenter(): Vec3 {
    const [c1, c2, c3, c4] = this.corners;
    return new Vec3(
      (c1.x + c2.x + c3.x + c4.x) / 4,
      (c1.y + c2.y + c3.y + c4.y) / 4,
      (c1.z + c2.z + c3.z + c4.z) / 4
    );
  }

  public isWithinReachForPlacement(): boolean {
    const center = this.getCenter();
    const distance = this.bot.entity.position.distanceTo(center);
    return distance <= MAX_PLACEMENT_REACH;
  }
}

export class VoxelAroundBot {
  private bot: Bot;
  public readonly coords: Vec3;
  public readonly faces: Map<VoxelFace, VoxelFaceAroundBot>;

  constructor(bot: Bot, coords: Vec3) {
    assert(isVoxel(coords));
    this.bot = bot;
    this.coords = coords;
    this.faces = this.createFaces();
  }

  private createFaces(): Map<VoxelFace, VoxelFaceAroundBot> {
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
    const sideToFaceMapping: [VoxelFace, VoxelFaceAroundBot][] = [
      [
        VoxelFace.WEST,
        new VoxelFaceAroundBot(
          this.bot,
          corners[0],
          corners[3],
          corners[7],
          corners[4]
        ),
      ],
      [
        VoxelFace.EAST,
        new VoxelFaceAroundBot(
          this.bot,
          corners[1],
          corners[5],
          corners[6],
          corners[2]
        ),
      ],
      [
        VoxelFace.BOTTOM,
        new VoxelFaceAroundBot(
          this.bot,
          corners[0],
          corners[1],
          corners[2],
          corners[3]
        ),
      ],
      [
        VoxelFace.TOP,
        new VoxelFaceAroundBot(
          this.bot,
          corners[4],
          corners[7],
          corners[6],
          corners[5]
        ),
      ],
      [
        VoxelFace.NORTH,
        new VoxelFaceAroundBot(
          this.bot,
          corners[0],
          corners[4],
          corners[5],
          corners[1]
        ),
      ],
      [
        VoxelFace.SOUTH,
        new VoxelFaceAroundBot(
          this.bot,
          corners[3],
          corners[2],
          corners[6],
          corners[7]
        ),
      ],
    ];
    const facesMap = new Map<VoxelFace, VoxelFaceAroundBot>();
    for (const [side, face] of sideToFaceMapping) {
      facesMap.set(side, face);
    }
    return facesMap;
  }

  public getThreeClosestFaces(): Map<VoxelFace, VoxelFaceAroundBot> {
    const faceDistances: { side: VoxelFace; distance: number }[] = [];
    for (const [side, face] of this.faces) {
      const center = face.getCenter();
      const distance = this.bot.entity.position.distanceTo(center);
      faceDistances.push({ side, distance });
    }
    faceDistances.sort((a, b) => a.distance - b.distance);
    const closestFaces = new Map<VoxelFace, VoxelFaceAroundBot>();
    for (let i = 0; i < 3; i++) {
      const { side } = faceDistances[i];
      closestFaces.set(side, this.faces.get(side)!);
    }
    return closestFaces;
  }
}
