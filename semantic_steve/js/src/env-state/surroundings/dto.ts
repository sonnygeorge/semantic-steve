/**
 * Lower-detail "Data Transfer Object" (DTO) version of `ImmediateSurroundings`.
 *
 * Unlike its full-detail counterpart, this DTO contains only the information that we want
 * to send to the Python client (i.e., that we want  the LLM to see).
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type ImmediateSurroundingsDTO = {
  visibleBlocks: { [key: string]: [number, number, number][] };
  visibleBiomes: string[];
  visibleItems: { [key: string]: [number, number, number][] };
};

/**
 * Lower-detail "Data Transfer Object" (DTO) version of `DistantSurroundingsInADirection`.
 *
 * Unlike its full-detail counterpart, this DTO contains only the information that we want
 * to send to the Python client (i.e., that we want the LLM to see).
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type DistantSurroundingsInADirectionDTO = {
  visibleBlockCounts: { [key: string]: number };
  visibleBiomes: string[];
  visibleItemCounts: { [key: string]: number };
};

/**
 * Lower-detail "Data Transfer Object" (DTO) version of `Surroundings`.
 *
 * Unlike its full-detail counterpart, this DTO contains only the information that we want
 * to send to the Python client (i.e., that we want the LLM to see).
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type SurroundingsDTO = {
  immediateSurroundings: ImmediateSurroundingsDTO;
  distantSurroundings: { [key: string]: DistantSurroundingsInADirectionDTO };
};
