import { Bot } from "mineflayer";
import { SkillResult } from "../types";

export type SkillResolutionHandler = (
  result: SkillResult,
  envStateIsHydrated?: boolean
) => void;

/**
 * The documentation we use to communicate to LLMs/users how to invoke the skills.
 */
export interface SkillMetadata {
  name: string;
  signature: string;
  docstring: string;
}

/**
 * The interface that all skills must implement.
 */
export abstract class Skill {
  public static readonly METADATA: SkillMetadata;
  public static readonly TIMEOUT_MS: number = 40000;
  protected bot: Bot;
  protected onResolution: SkillResolutionHandler;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    this.bot = bot;
    this.onResolution = onResolution;
  }

  abstract invoke(...args: any[]): Promise<void>;
  abstract pause(): Promise<void>;
  abstract resume(): Promise<void>;
}
