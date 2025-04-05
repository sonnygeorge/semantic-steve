import { Bot } from "mineflayer";
import { SkillResult } from "../skill-results";

export type SkillResolutionHandler = (result: SkillResult) => void;

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
  public static readonly metadata: SkillMetadata;
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
