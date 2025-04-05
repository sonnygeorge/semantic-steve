import * as zmq from "zeromq";
import assert from "assert";
import { Bot } from "mineflayer";
import { SkillInvocation, DataFromMinecraft } from "./py-messages";
import { Result, GenericResults } from "./results";
import { SelfPreserver } from "./self-preserver";
import { Skill } from "./skill";
import { buildSkillsRegistry } from "./skill";

export class SemanticSteveConfig {
  selfPreservationCheckThrottleMS: number;
  immediateSurroundingsRadius: number;
  distantSurroundingsRadius: number;
  mfViewerPort: number;
  zmqPort: number;

  constructor(
    selfPreservationCheckThrottleMS: number = 1500,
    immediateSurroundingsRadius: number = 5,
    distantSurroundingsRadius: number = 47,
    mfViewerPort: number = 3000,
    zmqPort: number = 5555,
  ) {
    this.selfPreservationCheckThrottleMS = selfPreservationCheckThrottleMS;
    this.immediateSurroundingsRadius = immediateSurroundingsRadius;
    this.distantSurroundingsRadius = distantSurroundingsRadius;
    this.mfViewerPort = mfViewerPort;
    this.zmqPort = zmqPort;
  }
}

export class SemanticSteve {
  private bot: Bot;
  private socket: zmq.Pair;
  private zmqPort: number;
  private selfPreserver: SelfPreserver;
  private skills: Record<string, Skill>; // TODO: Should this be Map?
  private currentSkill?: Skill;

  constructor(
    bot: Bot,
    config: SemanticSteveConfig = new SemanticSteveConfig(),
  ) {
    this.bot = bot;

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

  public async initializeSocket(): Promise<void> {
    // Now we bind and properly await it
    await this.socket.bind(`tcp://*:${this.zmqPort}`);
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
      // Safety checks to ensure this is working as expected ("failure"=receiveTimeout)
      assert(e && typeof e === "object" && "code" in e);
      assert(e.code === "EAGAIN");
    }
  }

  // ================================
  // Skill invocation and resolution
  // ================================

  private invokeSkill(skillInvocation: SkillInvocation): void {
    const skillToInvoke: Skill = this.skills[skillInvocation.skillName];
    skillToInvoke.invoke(...skillInvocation.args);
    this.currentSkill = skillToInvoke;
  }

  private handleSkillResolution(result: Result): void {
    assert(this.currentSkill, "Got resolution before invocation");
    this.currentSkill = undefined;
    // Always (re)hydrate the environment state after a skill resolves...
    // NOTE: A future performance optimization could be to propagate a flag to this method
    // indicating whether the environment state is already hydrated. For code cleanliness
    // right now, we'll avoid the many extra lines that this would create across the codebase.
    this.bot.envState.hydrate();
    // ...and send the result back to Python
    const toSendToPython: DataFromMinecraft = {
      envState: this.bot.envState.getDTO(),
      skillInvocationResults: result.message,
    };
    this.sendDataToPython(toSendToPython);
  }

  // ==============
  // Other helpers
  // ==============

  private async getAndSendInitialState(): Promise<void> {
    this.bot.envState.surroundings.hydrate();
    let toSendToPython: DataFromMinecraft = {
      envState: this.bot.envState.getDTO(),
      // NOTE: No skill invocation results yet
    };
    await this.sendDataToPython(toSendToPython);
  }

  // ===========================
  // Main entrypoint/run method
  // ===========================

  public async run(): Promise<void> {
    await this.initializeSocket();
    await this.getAndSendInitialState();
    while (true) {
      const msgFromPython = await this.checkForMsgFromPython();

      if (msgFromPython) {
        assert(!this.currentSkill, "Got invocation before resolution");
        const skillInvocation: SkillInvocation = JSON.parse(msgFromPython);
        if (skillInvocation.skillName in this.skills) {
          this.invokeSkill(skillInvocation);
        } else {
          const result = new GenericResults.SkillNotFound(
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
        await this.selfPreserver.invoke(); // Await resolution of preserver before continuing
        if (this.currentSkill) {
          await this.currentSkill.resume();
        }
      }
    }
  }
}
