import assert from "assert";
import { Bot } from "mineflayer";
import { TakeScreenshotOfResults as Results } from "../skill-results";
import { Skill, SkillMetadata, SkillResolutionHandler } from "./skill";

export class TakeScreenshotOf extends Skill {
  public static readonly metadata: SkillMetadata = {
    name: "takeScreenshotOf",
    signature: "takeScreenshotOf(thing: string)",
    docstring: `
      /**
       * Attempts to take a screenshot of the specified thing, assuming it is in the
       * immediate surroundings.
       * @param thing - The thing to take a screenshot of.
       */
    `,
  };

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  public async invoke(thing: string): Promise<void> {
    // TODO
  }

  public async pause(): Promise<void> {
    console.log(`Pausing '${TakeScreenshotOf.metadata.name}'`);
  }

  public async resume(): Promise<void> {
    console.log(`Resuming '${TakeScreenshotOf.metadata.name}'`);
  }
}
