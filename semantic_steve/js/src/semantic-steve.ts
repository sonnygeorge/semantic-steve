import * as zmq from "zeromq";
import assert from "assert";
import { Bot, StorageEvents } from "mineflayer";
import { SkillInvocation, DataFromMinecraft } from "./py-messages";
import { SelfPreserver } from "./self-preserver";
import { Skill } from "./skill";
import { buildSkillsRegistry } from "./skill";
import PItemLoader, { Item as PItem } from "prismarine-item";
import { Window as PWindow, WindowsExports } from "prismarine-windows";
import nbt from "prismarine-nbt";
import { SkillResult, SemanticSteveConfig } from "./types";
import {
  InventoryChanges,
  InventoryChangesDTO,
  getInventoryChangesDTO,
} from "./inventory-changes";
import { GenericSkillResults } from "./skill/generic-results";
import { getDurability as getDurability } from "./utils";
import { exit } from "process";

export class SemanticSteve {
  private bot: Bot;
  private socket: zmq.Pair;
  private zmqPort: number;
  private selfPreserver: SelfPreserver;
  private skills: { [key: string]: Skill };
  private currentSkill?: Skill;
  private timeOfLastSkillInvocation?: number;
  private invAtTimeOfLastMsgToPython?: Bot["inventory"];

  private hasDiedWhileAwaitingInvocation: boolean = false;
  private PWindow: WindowsExports;
  private PItem: typeof PItem;

  constructor(
    bot: Bot,
    config: SemanticSteveConfig = new SemanticSteveConfig()
  ) {
    this.bot = bot;

    this.PWindow = require("prismarine-windows")(bot.version);
    this.PItem = require("prismarine-item")(bot.registry);

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

  private buildInventoryCopy(): PWindow<StorageEvents> {
    const window: PWindow<StorageEvents> = this.PWindow.createWindow(
      0,
      "minecraft:inventory",
      "Inventory"
    );
    const slots = this.bot.inventory.slots;
    slots.forEach((slot, idx) => {
      if (slot) {
        const newItem = this.PItem.fromNotch(
          this.PItem.toNotch(slot, true),
          slot.stackId ?? undefined
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
    this.invAtTimeOfLastMsgToPython = this.buildInventoryCopy();
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
    // Add skill invocation to the macrotask queue (wrapped w/ handling of errors)
    setTimeout(async () => {
      try {
        if (!this.skills[skillInvocation.skillName]) {
          const result = new GenericSkillResults.SkillNotFound(
            skillInvocation.skillName
          );
          this.handleSkillResolution(result);
          return;
        }
        const skillToInvoke = this.skills[skillInvocation.skillName];
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
    this.currentSkill = this.skills[skillInvocation.skillName] ?? undefined;
    this.timeOfLastSkillInvocation = Date.now();
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
    const invChanges = this.getInventoryChanges();

    // Unset fields that are only to be set while skills are running
    this.currentSkill = undefined;
    this.timeOfLastSkillInvocation = undefined;

    // Prepare the data to send to Python
    // TODO: Add invChanges to what we send to Python once getting this (maybe someday) gets implemented
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

  private getInventoryChanges(): InventoryChanges {
    console.log("Getting inventory changes...");
    if (!this.invAtTimeOfLastMsgToPython) {
      throw new Error(
        "This should never be called if `invAtTimeOfLastOutoingPythonMsg` is not set"
      );
    }

    const differential: InventoryChanges = {};

    // iterate over slots, report the item differential.
    for (
      let i = this.invAtTimeOfLastMsgToPython.inventoryStart;
      i < this.invAtTimeOfLastMsgToPython.inventoryEnd;
      i++
    ) {
      const itemFromOldInv = this.invAtTimeOfLastMsgToPython.slots[i];
      if (!itemFromOldInv) {
        continue;
      }

      const oldDurability = getDurability(this.bot, itemFromOldInv);

      // find item in the current inventory
      const itemFromCurrentInv = this.bot.inventory.findItemRange(
        this.bot.inventory.inventoryStart,
        this.bot.inventory.inventoryEnd,
        itemFromOldInv.type,
        itemFromOldInv.metadata,
        false,
        itemFromOldInv.nbt
      );

      if (!itemFromCurrentInv) {
        // item was lost or consumed
        differential[itemFromOldInv.type] = {
          metadata: itemFromOldInv.metadata,
          countDifferential: -itemFromOldInv.count,
        };
      } else if (
        itemFromCurrentInv &&
        itemFromCurrentInv.count !== itemFromOldInv.count
      ) {
        // item exists, but count is different
        differential[itemFromOldInv.type] = {
          countDifferential: itemFromCurrentInv.count - itemFromOldInv.count,
        };
      } else if (oldDurability !== undefined) {
        // item is a non-stackable item with a durability value, check for changes
        const curDurability = getDurability(this.bot, itemFromCurrentInv);
        assert(
          curDurability !== undefined,
          "Should be defined if oldDurability is defined"
        );
        if (oldDurability !== curDurability) {
          differential[itemFromOldInv.type] = {
            durabilityUsed: oldDurability - curDurability,
            curDurability: curDurability,
          };
        }
        // } else {
        //   // check if the nbt is different
        //   differential[itemFromOldInv.type] = {
        //     metadata: itemFromOldInv.metadata,
        //     countDifferential: itemFromCurrentInv.count - itemFromOldInv.count,
        //   };
        // }
      }
    }
    return differential;
  }

  private async checkForAndHandleSkillTimeout(): Promise<undefined> {
    if (!this.currentSkill) {
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
        this.invAtTimeOfLastMsgToPython,
        "A skill is running, but inventory at time of last outgoing python msg is not set"
      );
      const curSkillClass = this.currentSkill.constructor as typeof Skill;
      if (
        Date.now() - this.timeOfLastSkillInvocation >
        curSkillClass.TIMEOUT_MS
      ) {
        const skillClass = this.currentSkill.constructor as typeof Skill;
        const result = new GenericSkillResults.SkillTimeout(
          skillClass.METADATA.name,
          curSkillClass.TIMEOUT_MS / 1000
        );
        this.handleSkillResolution(result);
      }
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
        if (this.currentSkill) {
          await this.currentSkill.pause();
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
        if (this.currentSkill) {
          await this.currentSkill.resume();
        }
      }
    }
  }
}
