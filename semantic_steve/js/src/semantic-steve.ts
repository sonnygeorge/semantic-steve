/**
 * Main code/abstraction for program flow of SemanticSteve.
 * NOTE: See README.md of src/js for a diagrams of the program flow.
 */

import * as zmq from "zeromq";
import assert from "assert";
import { Bot } from "mineflayer";
import { SkillInvocation, DataFromMinecraft } from "./py-messages";
import { SelfPreserver } from "./self-preserver";
import {
  Skill,
  buildSkillsRegistry,
  SkillStatus,
  GenericSkillResults,
} from "./skill";
import { SkillResult, SemanticSteveConfig } from "./types";
import { getInventoryChangesDTO } from "./utils/inventory-changes";

export class SemanticSteve {
  private bot: Bot;
  private socket: zmq.Pair;
  private zmqPort: number;
  private selfPreserver: SelfPreserver;
  private skills: { [key: string]: Skill };
  private activeSkill?: Skill;
  private timeOfLastSkillInvocation?: number;
  private itemTotalsAtTimeOfLastMsgToPython?: Map<string, number>;
  private hasDiedWhileAwaitingInvocation: boolean = false;

  constructor(
    bot: Bot,
    config: SemanticSteveConfig = new SemanticSteveConfig()
  ) {
    console.log("Javascript: Initializing SemanticSteve...");
    this.bot = bot;

    this.socket = new zmq.Pair({ receiveTimeout: 0 });
    this.zmqPort = config.zmqPort;

    this.selfPreserver = new SelfPreserver(
      this.bot,
      config.selfPreservationCheckThrottleMS
    );

    this.skills = buildSkillsRegistry(
      this.bot,
      this.handleSkillResolution.bind(this)
    );
  }

  // =======================================
  // Sending and receiving data from Python
  // =======================================

  private async sendDataToPython(data: DataFromMinecraft): Promise<void> {
    this.itemTotalsAtTimeOfLastMsgToPython =
      this.bot.envState.inventory.itemsToTotalCounts;
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
    assert(!this.activeSkill);
    // Add skill invocation to the macrotask queue (wrapped w/ handling of errors)
    setTimeout(async () => {
      if (!this.skills[skillInvocation.skillName]) {
        const result = new GenericSkillResults.SkillNotFound(
          skillInvocation.skillName
        );
        // NOTE: Faux skill-resolution w/out ever ever having an active skill
        this.handleSkillResolution(result);
        return;
      }
      const skillToInvoke = this.skills[skillInvocation.skillName];
      // Set fields that are to be set while skills are running
      this.activeSkill = this.skills[skillInvocation.skillName] ?? undefined;
      console.log(
        `Invoking skill ${skillInvocation.skillName} w/ args: ${skillInvocation.args}`
      );
      this.timeOfLastSkillInvocation = Date.now();
      try {
        await skillToInvoke.invoke(...skillInvocation.args);
      } catch (error) {
        if (!this.activeSkill) {
          console.warn(
            `Skill.invoke (${skillInvocation.skillName}) threw an error and, somehow, ` +
              `the SemanticSteve.activeSkill became undefined before the error was ` +
              `thrown. Presumably, ${skillInvocation.skillName} called ` +
              `Skill.onResolution (which should = SemanticSteve.handleSkillResolution,` +
              ` the only place where SemanticSteve.activeSkill is supposed to set to ` +
              `undefined). This is the error that was thrown by Skill.invoke()...`
          );
          console.error(error);
          return;
        }
        console.warn(`Skill ${skillInvocation.skillName} threw an error!`);
        console.error(error);
        const result = new GenericSkillResults.UnhandledInvocationError(
          skillInvocation.skillName,
          error as Error
        );
        this.activeSkill.stop();
        this.activeSkill.resolve(result);
      }
    }, 0);
  }

  private handleSkillResolution(
    result: SkillResult,
    // NOTE: Although worrying about this isn't their responsability, `Skill`s can
    // propogate this flag if they have _just barely_ hydrated the envState
    envStateIsHydrated?: boolean
  ): void {
    // Unset fields that are only to be set while skills are running
    console.log(
      `Skill ${this.activeSkill?.constructor.name} resolved with result: ${result.message}`
    );
    this.activeSkill = undefined;
    this.timeOfLastSkillInvocation = undefined;

    // Hydrate the envState if it wasn't just hydrated by a skill
    if (!envStateIsHydrated) {
      this.bot.envState.hydrate();
    }

    // Get Inventory changes since the skill was invoked
    const invChanges = this.getInventoryChanges();

    // Prepare the data to send to Python
    const toSendToPython: DataFromMinecraft = {
      envState: this.bot.envState.getDTO(),
      skillInvocationResults: result.message,
      inventoryChanges: getInventoryChangesDTO(this.bot, invChanges),
    };

    this.sendDataToPython(toSendToPython);
  }

  // ==============
  // Other helpers
  // ==============

  private getInventoryChanges(): Map<string, number> {
    console.log("Getting inventory changes...");
    if (!this.itemTotalsAtTimeOfLastMsgToPython) {
      throw new Error(
        "This should never be called if `invAtTimeOfLastOutoingPythonMsg` is not set"
      );
    }

    const differentials: Map<string, number> = new Map<string, number>();

    const curItemTotals = this.bot.envState.inventory.itemsToTotalCounts;
    const oldItemTotals = this.itemTotalsAtTimeOfLastMsgToPython;

    // Process all keys in current inventory
    for (const [itemName, currentCount] of curItemTotals.entries()) {
      const oldCount = oldItemTotals.get(itemName) || 0;
      const diff = currentCount - oldCount;
      if (diff !== 0) {
        differentials.set(itemName, diff);
      }
    }

    // Process keys that only exist in old inventory
    for (const [itemName, oldCount] of oldItemTotals.entries()) {
      if (!curItemTotals.has(itemName)) {
        differentials.set(itemName, -oldCount); // Item was removed completely
      }
    }

    return differentials;
  }

  private async checkForAndHandleSkillTimeout(): Promise<undefined> {
    if (!this.activeSkill) {
      assert(
        !this.timeOfLastSkillInvocation,
        "No skill running, but time of last invocation is set"
      );
    } else {
      assert(
        this.timeOfLastSkillInvocation,
        "A skill is running, but time of last invocation is not set"
      );
      assert(
        this.itemTotalsAtTimeOfLastMsgToPython,
        "A skill is running, but item totals at time of last outgoing python msg is not set"
      );
      const curSkillClass = this.activeSkill.constructor as typeof Skill;
      if (
        Date.now() - this.timeOfLastSkillInvocation >
        curSkillClass.TIMEOUT_MS
      ) {
        const skillClass = this.activeSkill.constructor as typeof Skill;
        const result = new GenericSkillResults.SkillTimeout(
          skillClass.METADATA.name,
          curSkillClass.TIMEOUT_MS / 1000
        );
        this.activeSkill.stop();
        this.activeSkill.resolve(result);
      }
    }
  }

  private handleDeath(): void {
    if (!this.activeSkill) {
      // We don't have a current skill, therefore, we are awaiting an invocation from Python
      // Set this flag so that, once we receive an invocation, we can immediately respond w/
      // DeathBeforeInvocation
      this.hasDiedWhileAwaitingInvocation = true;
    } else {
      const result = new GenericSkillResults.DeathDuringExecution();
      this.activeSkill.stop();
      this.activeSkill.resolve(result);
    }
  }

  public async initializeSocket(): Promise<void> {
    // Now we bind and properly await it
    await this.socket.bind(`tcp://*:${this.zmqPort}`);
  }

  private async getAndSendInitialState(): Promise<void> {
    this.bot.envState.surroundings.hydrate();
    let toSendToPython: DataFromMinecraft = {
      envState: this.bot.envState.getDTO(),
      // NOTE: No skill invocation results yet
      // NOTE: No inventory changes yet
    };
    await this.sendDataToPython(toSendToPython);
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
        assert(!this.activeSkill, "Got invocation before resolution");
        const skillInvocation: SkillInvocation = JSON.parse(msgFromPython);
        if (this.hasDiedWhileAwaitingInvocation) {
          this.hasDiedWhileAwaitingInvocation = false; // Reset the flag
          const result = new GenericSkillResults.DeathWhileAwaitingInvocation(
            skillInvocation.skillName
          );
          // NOTE: Faux skill-resolution w/out ever ever having an active skill
          this.handleSkillResolution(result);
        } else {
          this.invokeSkill(skillInvocation);
        }
      }

      // 10 ms non-blocking sleep to allow current skill to run / avoid busy-waiting
      await new Promise((res) => setTimeout(res, 10));

      // Check for and handle skill timeout
      await this.checkForAndHandleSkillTimeout();

      // Self-preservation
      if (this.selfPreserver.shouldSelfPreserve()) {
        if (this.activeSkill) {
          await this.activeSkill.pause();
          assert(this.activeSkill.status === SkillStatus.ACTIVE_PAUSED);
        }
        const start = Date.now();
        await this.selfPreserver.invoke(); // Await resolution before continuing
        const elapsed = Date.now() - start;
        if (this.timeOfLastSkillInvocation) {
          // We don't want to count self-preservation time against the skill timeout
          this.timeOfLastSkillInvocation += elapsed;
          // TODO: Come up with better system/naming--updating "timeOfLastSkillInvocation"
          // like this means the variable won't necessarily reflect what its name implies
          // (nitpick, not urgent)
        }
        if (this.activeSkill) {
          await this.activeSkill.resume();
        }
      }
    }
  }
}
