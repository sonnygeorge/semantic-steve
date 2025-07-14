import { Vec3 } from "vec3";

/**
 * A symmetrical 3D array data structure that stores values in a cubic grid.
 * The array has equal dimensions in all three axes and supports tracking
 * of which indices have been explicitly set with non-default values.
 *
 * @template T The type of elements stored in the array
 */
export class Symmetrical3DArray<T> {
  private array: T[][][];
  private defaultValue: T | (() => T);

  /** Map storing serialized indices of positions that have been explicitly set */
  public idxsWithSetValues = new Map<string, [number, number, number]>();

  /**
   * Creates a new symmetrical 3D array with the specified dimensions.
   *
   * @param dimension The size of each dimension (creates a dimension³ cube)
   * @param defaultValue The default value for unset positions, or a factory function to create default values
   */
  constructor(dimension: number, defaultValue: T | (() => T)) {
    this.defaultValue = defaultValue;
    const defaultFactory =
      typeof defaultValue === "function"
        ? (defaultValue as () => T)
        : () => defaultValue as T;
    this.array = Array.from({ length: dimension }, () =>
      Array.from({ length: dimension }, () =>
        Array.from({ length: dimension }, () => defaultFactory())
      )
    );
  }

  /**
   * Converts 3D coordinates to a string key for efficient storage and lookup.
   *
   * @param x The x coordinate
   * @param y The y coordinate
   * @param z The z coordinate
   * @returns A string representation of the coordinates in format "x,y,z"
   */
  public serializeIdx(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  /**
   * Converts a serialized index string back to 3D coordinates.
   *
   * @param key The serialized index string in format "x,y,z"
   * @returns A tuple containing the [x, y, z] coordinates
   */
  public deserializeIdx(key: string): [number, number, number] {
    const parts = key.split(",");
    return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
  }

  /**
   * Retrieves the value at the specified 3D coordinates.
   *
   * @param x The x coordinate
   * @param y The y coordinate
   * @param z The z coordinate
   * @returns The value stored at the given coordinates
   */
  public get(x: number, y: number, z: number): T {
    try {
      return this.array[x][y][z];
    } catch {
      console.log("crap");
      return this.array[x][y][z];
    }
  }

  /**
   * Sets a value at the specified 3D coordinates and tracks it as an explicitly set value.
   *
   * @param x The x coordinate
   * @param y The y coordinate
   * @param z The z coordinate
   * @param value The value to store at the given coordinates
   */
  public set(x: number, y: number, z: number, value: T): void {
    if (value === this.defaultValue) {
      throw new Error(
        "Cannot set a value equal to the default value. Use unset() to reset."
      );
    }
    this.array[x][y][z] = value;
    this.idxsWithSetValues.set(this.serializeIdx(x, y, z), [x, y, z]);
  }

  /**
   * Resets a position to its default value and removes it from the set values tracking.
   *
   * @param x The x coordinate
   * @param y The y coordinate
   * @param z The z coordinate
   */
  public unset(x: number, y: number, z: number): void {
    const defaultFactory =
      typeof this.defaultValue === "function"
        ? (this.defaultValue as () => T)
        : () => this.defaultValue as T;
    this.array[x][y][z] = defaultFactory();
    this.idxsWithSetValues.delete(this.serializeIdx(x, y, z));
  }
}

/**
 * A 3D array that uses offset-based coordinates centered around a point of interest.
 * This class wraps a Symmetrical3DArray and provides an interface for working with
 * 3D coordinates that can be negative, positive, or zero, centered around origin (0,0,0).
 *
 * The internal array indices are mapped to offset coordinates where:
 * - Offset (0,0,0) maps to the center of the internal array
 * - Negative offsets map to the lower indices
 * - Positive offsets map to the higher indices
 *
 * @template T The type of elements stored in the array
 */
export class OffsetBased3DArray<T> {
  private radiusOfInterest: number;

  /** The underlying symmetrical 3D array storing the voxel data */
  public array: Symmetrical3DArray<T>;

  /** The dimension of each axis in the internal array */
  public dimension: number;

  /**
   * Creates a new offset-based 3D array centered around origin (0,0,0).
   *
   * @param radiusOfInterest The radius from the center point that defines the bounds.
   *                        Total dimension will be (radiusOfInterest * 2 + 1)
   * @param defaultValue The default value for unset positions, or a factory function to create default values
   */
  constructor(radiusOfInterest: number, defaultValue: T | (() => T)) {
    this.radiusOfInterest = radiusOfInterest;
    this.dimension = radiusOfInterest * 2 + 1;
    this.array = new Symmetrical3DArray(this.dimension, defaultValue);
  }

  /**
   * Iterates through all possible offset coordinates within the radius of interest.
   * Yields Vec3 objects representing each valid offset position.
   *
   * @yields Vec3 objects for each valid offset coordinate
   */
  public *iterAllOffsets(): Generator<Vec3> {
    for (let x = -this.radiusOfInterest; x <= this.radiusOfInterest; x++) {
      for (let y = -this.radiusOfInterest; y <= this.radiusOfInterest; y++) {
        for (let z = -this.radiusOfInterest; z <= this.radiusOfInterest; z++) {
          yield new Vec3(x, y, z);
        }
      }
    }
  }

  /**
   * Iterates through only the offset coordinates that have been explicitly set with values.
   * This is more efficient than iterating all offsets when you only need the active positions.
   *
   * @yields Vec3 objects for each offset coordinate that has been explicitly set
   */
  public *iterOffsetsWithSetValues(): Generator<Vec3> {
    // NOTE: Copy to avoid mutation during iteration
    for (const idxs of new Map(this.array.idxsWithSetValues).values()) {
      yield this.indicesToOffset(idxs)!;
    }
  }

  /**
   * Checks if the given array indices are within the bounds of the internal array.
   *
   * @param indices The [x, y, z] array indices to check
   * @returns True if the indices are within bounds, false otherwise
   */
  private areIndicesWithinBounds(indices: [number, number, number]): boolean {
    return (
      indices[0] >= 0 &&
      indices[0] < this.dimension &&
      indices[1] >= 0 &&
      indices[1] < this.dimension &&
      indices[2] >= 0 &&
      indices[2] < this.dimension
    );
  }

  /**
   * Converts internal array indices to offset coordinates.
   *
   * @param indices The [x, y, z] array indices
   * @returns The corresponding Vec3 offset coordinates, or null if indices are out of bounds
   */
  public indicesToOffset(indices: [number, number, number]): Vec3 | null {
    if (!this.areIndicesWithinBounds(indices)) {
      return null;
    }
    return new Vec3(
      indices[0] - this.radiusOfInterest,
      indices[1] - this.radiusOfInterest,
      indices[2] - this.radiusOfInterest
    );
  }

  /**
   * Converts offset coordinates to internal array indices.
   * The offset is floored to get the voxel position.
   *
   * @param offset The Vec3 offset coordinates
   * @returns The corresponding [x, y, z] array indices, or null if offset is out of bounds
   */
  public offsetToIndices(offset: Vec3): [number, number, number] | null {
    const voxelOfOffset = offset.floor();
    const idxs: [number, number, number] = [
      voxelOfOffset.x + this.radiusOfInterest,
      voxelOfOffset.y + this.radiusOfInterest,
      voxelOfOffset.z + this.radiusOfInterest,
    ];
    if (this.areIndicesWithinBounds(idxs)) {
      return idxs;
    } else {
      return null;
    }
  }

  /**
   * Retrieves the value at the specified offset coordinates.
   *
   * @param offset The Vec3 offset coordinates
   * @returns The value at the given offset, or null if the offset is out of bounds
   */
  public getFromOffset(offset: Vec3): T | null {
    const indices = this.offsetToIndices(offset);
    if (!indices) {
      return null;
    }
    return this.array.get(indices[0], indices[1], indices[2]);
  }

  /**
   * Sets a value at the specified offset coordinates.
   *
   * @param offset The Vec3 offset coordinates
   * @param value The value to store at the given offset
   * @returns True if the value was successfully set, false if the offset is out of bounds
   */
  public setFromOffset(offset: Vec3, value: T): boolean {
    const indices = this.offsetToIndices(offset);
    if (!indices) {
      return false;
    }
    this.array.set(indices[0], indices[1], indices[2], value);
    return true;
  }

  /**
   * Resets the value at the specified offset coordinates to the default value.
   *
   * @param offset The Vec3 offset coordinates
   * @returns True if the value was successfully unset, false if the offset is out of bounds
   */
  public unsetFromOffset(offset: Vec3): boolean {
    const indices = this.offsetToIndices(offset);
    if (!indices) {
      return false;
    }
    this.array.unset(indices[0], indices[1], indices[2]);
    return true;
  }
}
