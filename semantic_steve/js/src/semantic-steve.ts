import * as zmq from "zeromq";
import assert from "assert";
import { Bot } from "mineflayer";
import { SkillInvocation, DataFromMinecraft } from "./py-messages";
import { SkillResult, GenericSkillResults } from "./skill-results";
import { SelfPreserver } from "./self-preserver";
import { Skill } from "./skill";
import { buildSkillsRegistry } from "./skill";

export interface SemanticSteveConfigOptions {
  selfPreservationCheckThrottleMS?: number;
  immediateSurroundingsRadius?: number;
  distantSurroundingsRadius?: number;
  botPort?: number;
  mfViewerPort?: number;
  zmqPort?: number;
}

export class SemanticSteveConfig {
  selfPreservationCheckThrottleMS: number;
  immediateSurroundingsRadius: number;
  distantSurroundingsRadius: number;
  botPort: number;
  mfViewerPort: number;
  zmqPort: number;

  constructor(options: SemanticSteveConfigOptions = {}) {
    this.selfPreservationCheckThrottleMS =
      options.selfPreservationCheckThrottleMS ?? 1500;
    this.immediateSurroundingsRadius = options.immediateSurroundingsRadius ?? 5;
    this.distantSurroundingsRadius = options.distantSurroundingsRadius ?? 13;
    this.botPort = options.botPort ?? 25565;
    this.mfViewerPort = options.mfViewerPort ?? 3000;
    this.zmqPort = options.zmqPort ?? 5555;
  }
}

export class SemanticSteve {
  private bot: Bot;
  private socket: zmq.Pair;
  private zmqPort: number;
  private selfPreserver: SelfPreserver;
  private skills: { [key: string]: Skill };
  private currentSkill?: Skill;
  private inventoryAtTimeOfCurrentSkillInvocation: undefined = undefined; // Not implemented (placeholder)
  private hasDiedWhileAwaitingInvocation: boolean = false;

  constructor(
    bot: Bot,
    config: SemanticSteveConfig = new SemanticSteveConfig()
  ) {
    this.bot = bot;

    this.socket = new zmq.Pair({ receiveTimeout: 0 });
    this.zmqPort = config.zmqPort;

    this.selfPreserver = new SelfPreserver(
      this.bot,
      config.selfPreservationCheckThrottleMS
    );

    // Skills setup
    this.skills = buildSkillsRegistry(
      this.bot,
      this.handleSkillResolution.bind(this)
    );
  }

  // =======================================
  // Sending and receiving data from Python
  // =======================================

  private async sendDataToPython(data: DataFromMinecraft): Promise<void> {
    await this.socket.send(JSON.stringify(data));
  }

  private async checkForMsgFromPython(): Promise<string | undefined> {
    try {
      const [msgFromPython] = await this.socket.receive();
      return msgFromPython.toString();
    } catch (e) {
      assert(e && typeof e === "object" && "code" in e);
      assert(e.code === "EAGAIN");
    }
  }

  // ================================
  // Skill invocation and resolution
  // ================================

  private invokeSkill(skillInvocation: SkillInvocation): void {
    const skillToInvoke: Skill = this.skills[skillInvocation.skillName];
    // Add skill invocation to the macrotask queue (wrapped w/ handling of errors)
    setTimeout(async () => {
      try {
        await skillToInvoke.invoke(...skillInvocation.args);
      } catch (error) {
        const result = new GenericSkillResults.UnhandledRuntimeError(
          skillInvocation.skillName,
          error as Error
        );
        this.handleSkillResolution(result);
      }
    }, 0);
    // Set fields that are to be set while skills are running
    this.currentSkill = skillToInvoke;
    this.inventoryAtTimeOfCurrentSkillInvocation = undefined; // Not implemented (placeholder)
  }

  // Not implemented (placeholder)
  private getInventoryChangesSinceCurrentSkillWasInvoked(): undefined {
    // TODO: Compare current inventory with `this.inventoryAtTimeOfCurrentSkillInvocation`
  }

  private handleSkillResolution(
    result: SkillResult,
    // NOTE: Although worrying about this isn't their responsability, `Skill`s can
    // propogate this flag if they have _just barely_ hydrated the envState
    envStateIsHydrated?: boolean
  ): void {
    // Hydrate the envState if it wasn't just hydrated by a skill
    if (!envStateIsHydrated) {
      this.bot.envState.hydrate();
    }

    // Get Inventory changes since the skill was invoked
    const invChanges = this.getInventoryChangesSinceCurrentSkillWasInvoked();

    // Unset fields that are only to be set while skills are running
    this.currentSkill = undefined;
    this.inventoryAtTimeOfCurrentSkillInvocation = undefined;

    // Prepare the data to send to Python
    // TODO: Add invChanges to what we send to Python once getting this (maybe someday) gets implemented
    const toSendToPython: DataFromMinecraft = {
      envState: this.bot.envState.getDTO(),
      skillInvocationResults: result.message,
    };

    this.sendDataToPython(toSendToPython);
  }

  // ==============
  // Other helpers
  // ==============

  public async initializeSocket(): Promise<void> {
    // Now we bind and properly await it
    await this.socket.bind(`tcp://*:${this.zmqPort}`);
  }

  private async getAndSendInitialState(): Promise<void> {
    this.bot.envState.surroundings.hydrate();
    let toSendToPython: DataFromMinecraft = {
      envState: this.bot.envState.getDTO(),
      // NOTE: No skill invocation results yet
    };
    await this.sendDataToPython(toSendToPython);
  }

  private handleDeath(): void {
    if (!this.currentSkill) {
      // We don't have a current skill, therefore, we are awaiting an invocation from Python
      // Set this flag so that, once we receive an invocation, we can immediately respond w/
      // DeathBeforeInvocation
      this.hasDiedWhileAwaitingInvocation = true;
    } else {
      // We have a current skill, therefore, we are in the middle of executing a skill
      // Terminate the skill by stopping its execution and unsetting this.currentSkill
      this.currentSkill.pause();
      this.currentSkill = undefined;
      // Now we resolve the skill with a DeathDuringExecution result
      const result = new GenericSkillResults.DeathDuringExecution();
      this.handleSkillResolution(result);
    }
  }

  // ===========================
  // Main entrypoint/run method
  // ===========================

  public async run(): Promise<void> {
    await this.initializeSocket();
    await this.getAndSendInitialState();

    this.bot.once("death", () => {
      this.handleDeath();
    });

    while (true) {
      const msgFromPython = await this.checkForMsgFromPython();

      if (msgFromPython) {
        assert(!this.currentSkill, "Got invocation before resolution");
        const skillInvocation: SkillInvocation = JSON.parse(msgFromPython);
        if (this.hasDiedWhileAwaitingInvocation) {
          this.hasDiedWhileAwaitingInvocation = false; // Reset the flag
          const result = new GenericSkillResults.DeathWhileAwaitingInvocation(
            skillInvocation.skillName
          );
          this.handleSkillResolution(result);
        } else if (skillInvocation.skillName in this.skills) {
          this.invokeSkill(skillInvocation);
        } else {
          const result = new GenericSkillResults.SkillNotFound(
            skillInvocation.skillName
          );
          this.handleSkillResolution(result);
        }
      }

      // 10 ms non-blocking sleep to allow current skill to run / avoid busy-waiting
      await new Promise((res) => setTimeout(res, 10));

      if (this.selfPreserver.shouldSelfPreserve()) {
        if (this.currentSkill) {
          await this.currentSkill.pause();
        }
        await this.selfPreserver.invoke(); // Await resolution before continuing
        if (this.currentSkill) {
          await this.currentSkill.resume();
        }
      }
    }
  }
}
