import { Bot } from "mineflayer";

export class SelfPreserver {
  // Not yet implemented
  private bot: Bot;
  private checkThrottleMS: number;

  constructor(bot: Bot, checkThrottleMS: number) {
    this.bot = bot;
    this.checkThrottleMS = checkThrottleMS;
  }

  public shouldSelfPreserve(): boolean {
    // this.bot.envState.hydrate(this.CheckThrottleMS);
    // TODO: Check hydrated envState for threatening mobs, low hunger, drowning, etc.
    return false; // FIXME
  }

  public async invoke(): Promise<string> {
    return ""; // TODO: Implement self-preservation (and returning of results?)
  }
}
