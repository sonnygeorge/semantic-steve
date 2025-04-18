export type MaybePromise<T, E = undefined> = Promise<T | E> | T | E;

export class InvalidThingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidThingTypeError";
  }
}

export interface SemanticSteveConfigOptions {
  selfPreservationCheckThrottleMS?: number;
  immediateSurroundingsRadius?: number;
  distantSurroundingsRadius?: number;
  botHost?: string;
  botPort?: number;
  mfViewerPort?: number;
  zmqPort?: number;
  username?: string;
}

export class SemanticSteveConfig {
  selfPreservationCheckThrottleMS: number;
  immediateSurroundingsRadius: number;
  distantSurroundingsRadius: number;
  botHost: string;
  botPort: number;
  mfViewerPort: number;
  zmqPort: number;
  username: string;

  constructor(options: SemanticSteveConfigOptions = {}) {
    this.selfPreservationCheckThrottleMS =
      options.selfPreservationCheckThrottleMS ?? 1500;
    this.immediateSurroundingsRadius = options.immediateSurroundingsRadius ?? 5;
    this.distantSurroundingsRadius = options.distantSurroundingsRadius ?? 13;
    this.botHost = options.botHost ?? "localhost";
    this.botPort = options.botPort ?? 25565;
    this.mfViewerPort = options.mfViewerPort ?? 3000;
    this.zmqPort = options.zmqPort ?? 5555;
    this.username = options.username ?? "SemanticSteve";
  }
}

export interface SkillResult {
  message: string;
}
