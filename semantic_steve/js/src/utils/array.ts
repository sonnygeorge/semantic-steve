import { Vec3 } from "vec3";

/**
 * A symmetrical 3D array data structure that stores values in a cubic grid using a Map for lazy initialization.
 * The array has equal dimensions in all three axes and supports tracking of explicitly set values.
 *
 * @template T The type of elements stored in the array
 */
export class Symmetrical3DArray<T> {
  private dimension: number;
  private data: Map<string, T>;
  private defaultValue: T | (() => T);
  public idxsWithSetValues = new Map<string, [number, number, number]>();

  /**
   * Creates a new symmetrical 3D array with the specified dimensions.
   *
   * @param dimension The size of each dimension (creates a dimension³ cube)
   * @param defaultValue The default value for unset positions, or a factory function to create default values
   */
  constructor(dimension: number, defaultValue: T | (() => T)) {
    if (dimension <= 0 || !Number.isInteger(dimension)) {
      throw new Error("Dimension must be a positive integer");
    }
    this.dimension = dimension;
    this.defaultValue = defaultValue;
    this.data = new Map<string, T>(); // O(1) initialization
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
   * Validates that the provided coordinates are within bounds.
   *
   * @param x The x coordinate
   * @param y The y coordinate
   * @param z The z coordinate
   * @throws Error if any coordinate is out of bounds
   */
  private validateIndices(x: number, y: number, z: number): void {
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      !Number.isInteger(z) ||
      x < 0 ||
      x >= this.dimension ||
      y < 0 ||
      y >= this.dimension ||
      z < 0 ||
      z >= this.dimension
    ) {
      throw new Error(
        `Index out of bounds: (${x}, ${y}, ${z}) for dimension ${this.dimension}`,
      );
    }
  }

  /**
   * Retrieves the value at the specified 3D coordinates.
   *
   * @param x The x coordinate
   * @param y The y coordinate
   * @param z The z coordinate
   * @returns The value stored at the given coordinates, or the default value if unset
   */
  public get(x: number, y: number, z: number): T {
    this.validateIndices(x, y, z);
    const key = this.serializeIdx(x, y, z);
    const value = this.data.get(key);
    if (value !== undefined) {
      return value;
    }
    return typeof this.defaultValue === "function"
      ? (this.defaultValue as () => T)()
      : this.defaultValue;
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
    this.validateIndices(x, y, z);
    const defaultValue =
      typeof this.defaultValue === "function"
        ? (this.defaultValue as () => T)()
        : this.defaultValue;
    if (value === defaultValue) {
      throw new Error(
        "Cannot set a value equal to the default value. Use unset() to reset.",
      );
    }
    const key = this.serializeIdx(x, y, z);
    this.data.set(key, value);
    this.idxsWithSetValues.set(key, [x, y, z]);
  }

  /**
   * Resets a position to its default value and removes it from the set values tracking.
   *
   * @param x The x coordinate
   * @param y The y coordinate
   * @param z The z coordinate
   */
  public unset(x: number, y: number, z: number): void {
    this.validateIndices(x, y, z);
    const key = this.serializeIdx(x, y, z);
    this.data.delete(key);
    this.idxsWithSetValues.delete(key);
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
  public readonly radiusOfInterest: number;

  /** The underlying symmetrical 3D array storing the voxel data */
  public array: Symmetrical3DArray<T>;

  /** The dimension of each axis in the internal array */
  public readonly dimension: number;

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
      indices[2] - this.radiusOfInterest,
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
