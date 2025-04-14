import * as zmq from "zeromq";
import assert from "assert";
import { Bot, StorageEvents } from "mineflayer";
import { SkillInvocation, DataFromMinecraft } from "./py-messages";
import { SkillResult, GenericSkillResults } from "./skill-results";
import { SelfPreserver } from "./self-preserver";
import { Skill } from "./skill";
import { buildSkillsRegistry } from "./skill";
import PItemLoader, { Item as PItem } from "prismarine-item";
import { Window as PWindow, WindowsExports } from "prismarine-windows";
import nbt from "prismarine-nbt";

export interface InventoryDifferential {
  [id: number]: {
    metadata?: any;
    damageDifferential?: number;
    count: number;
  };
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

export class SemanticSteve {
  private bot: Bot;
  private socket: zmq.Pair;
  private zmqPort: number;
  private selfPreserver: SelfPreserver;
  private skills: { [key: string]: Skill };
  private currentSkill?: Skill;
  private inventoryAtTimeOfCurrentSkillInvocation?: Bot["inventory"]; // Not implemented (placeholder)
  private hasDiedWhileAwaitingInvocation: boolean = false;
  private PWindow: WindowsExports;
  private PItem: typeof PItem;

  constructor(
    bot: Bot,
    config: SemanticSteveConfig = new SemanticSteveConfig(),
  ) {
    this.bot = bot;

    this.PWindow = require("prismarine-windows")(bot.version);
    this.PItem = require("prismarine-item")(bot.registry);

    this.socket = new zmq.Pair({ receiveTimeout: 0 });
    this.zmqPort = config.zmqPort;

    this.selfPreserver = new SelfPreserver(
      this.bot,
      config.selfPreservationCheckThrottleMS,
    );

    // Skills setup
    this.skills = buildSkillsRegistry(
      this.bot,
      this.handleSkillResolution.bind(this),
    );
  }

  private buildInventoryCopy(): PWindow<StorageEvents> {
    const window: PWindow<StorageEvents> = this.PWindow.createWindow(
      0,
      "minecraft:inventory",
      "Inventory",
    );
    const slots = this.bot.inventory.slots;
    slots.forEach((slot, idx) => {
      if (slot) {
        const newItem = this.PItem.fromNotch(
          this.PItem.toNotch(slot, true),
          slot.stackId ?? undefined,
        );
        if (newItem != null) {
          newItem.slot = idx;
        }
        window.updateSlot(idx, newItem as PItem);
      }
    });
    return window;
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
          error as Error,
        );
        this.handleSkillResolution(result);
      }
    }, 0);
    // Set fields that are to be set while skills are running
    this.currentSkill = skillToInvoke;
    this.inventoryAtTimeOfCurrentSkillInvocation = this.buildInventoryCopy(); // Not implemented (placeholder)
  }

  private getToolDamage(item: PItem) {
    // if (!item || !item.nbt) return 0;

    // const raw = item.nbt.value as any;
    // const simplified = nbt.simplify(raw.Damage);
    // // Check if the item has NBT data and a Damage tag
    // // if (item.nbt && item.nbt.value && item.nbt.value.Damage) {
    // //   return item.nbt.value.Damage.value;
    // // }
    // if (simplified !== undefined) {
    //   return simplified;
    // }
    if (item.durabilityUsed) {
      return item.durabilityUsed;
    }

    if (this.bot.registry.supportFeature("nbtOnMetadata")) {
      if (item.metadata !== undefined) {
        return item.metadata;
      }
    }
    // For older Mineflayer versions that use metadata directly

    return 0;
  }
  private getInventoryChangesSinceCurrentSkillWasInvoked(): InventoryDifferential {
    if (!this.inventoryAtTimeOfCurrentSkillInvocation) {
      throw new Error(
        "This should never occur when the last known inventory is not ran",
      );
    }

    const differential: InventoryDifferential = {};

    // iterate over slots, report the item differential.
    for (
      let i = this.inventoryAtTimeOfCurrentSkillInvocation.inventoryStart;
      i < this.inventoryAtTimeOfCurrentSkillInvocation.inventoryEnd;
      i++
    ) {
      const oldItem = this.inventoryAtTimeOfCurrentSkillInvocation.slots[i];
      if (!oldItem) {
        continue;
      }

      // find item in the current inventory
      const found = this.bot.inventory.findItemRange(
        this.bot.inventory.inventoryStart,
        this.bot.inventory.inventoryEnd,
        oldItem.type,
        oldItem.metadata,
        false,
        oldItem.nbt,
      );

      if (!found) {
        // item was removed
        differential[oldItem.type] = {
          metadata: oldItem.metadata,
          count: -oldItem.count,
        };
      }

      // item exists, but count is different
      if (found && found.count !== oldItem.count) {
        differential[oldItem.type] = { count: found.count - oldItem.count };
      }

      // item exists, but nbt is different
      if (found && found.nbt && found.nbt !== oldItem.nbt) {
        // check damage first
        const oldDmg = this.getToolDamage(oldItem);
        const newDmg = this.getToolDamage(found);
        if (oldDmg !== newDmg) {
          differential[oldItem.type] = {
            damageDifferential: oldDmg - newDmg,
            count: found.count - oldItem.count,
          };
        } else {
          // check if the nbt is different
          differential[oldItem.type] = {
            metadata: oldItem.metadata,
            count: found.count - oldItem.count,
          };
        }
      }
    }
    return differential;
  }

  private handleSkillResolution(
    result: SkillResult,
    // NOTE: Although worrying about this isn't their responsability, `Skill`s can
    // propogate this flag if they have _just barely_ hydrated the envState
    envStateIsHydrated?: boolean,
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
      inventoryChanges: invChanges,
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
            skillInvocation.skillName,
          );
          this.handleSkillResolution(result);
        } else if (skillInvocation.skillName in this.skills) {
          this.invokeSkill(skillInvocation);
        } else {
          const result = new GenericSkillResults.SkillNotFound(
            skillInvocation.skillName,
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
