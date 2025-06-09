import assert from "assert";
import { Bot } from "mineflayer";
import { SkillResult } from "../types";

export enum SkillStatus {
  PENDING_INVOCATION = "PENDING_INVOCATION",
  ACTIVE_RUNNING = "ACTIVE_RUNNING",
  ACTIVE_PAUSED = "ACTIVE_PAUSED",
  STOPPED = "STOPPED",
}

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
  public static readonly METADATA: SkillMetadata;
  public static readonly TIMEOUT_MS: number = 40000;
  public status: SkillStatus;
  protected bot: Bot;
  private onResolution: SkillResolutionHandler;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    this.bot = bot;
    this.onResolution = onResolution;
    this.status = SkillStatus.PENDING_INVOCATION;
  }

  public resolve(result: SkillResult): void {
    assert(
      this.status === SkillStatus.ACTIVE_RUNNING ||
        this.status === SkillStatus.STOPPED,
      `Skill must be in ACTIVE or STOPPED state to resolve, but was in ${this.status}`,
    );
    this.status = SkillStatus.PENDING_INVOCATION;
    setTimeout(() => {
      this.onResolution(result);
    }, 0);
  }

  /**
   * Invokes the skill with the given arguments.
   * Requires that the skill be in the PENDING_INVOCATION state and immediately sets the
   * status to ACTIVE_RUNNING.
   */
  public async invoke(...args: any[]): Promise<void> {
    assert(
      this.status === SkillStatus.PENDING_INVOCATION,
      `Skill must be in PENDING_INVOCATION state to invoke, but was in ${this.status}`,
    );
    this.status = SkillStatus.ACTIVE_RUNNING;
    await this.doInvoke(...args);
  }

  /**
   * Pauses an active skill.
   * Requires that the skill be in the ACTIVE state and immediately sets the
   * status to ACTIVE_PAUSED.
   */
  public async pause(): Promise<void> {
    assert(
      this.status === SkillStatus.ACTIVE_RUNNING,
      `Skill must be in ACTIVE state to pause, but was in ${this.status}`,
    );
    this.status = SkillStatus.ACTIVE_PAUSED;
    await this.doPause();
  }

  /**
   * Resumes a paused skill.
   * Requires that the skill be in the ACTIVE_PAUSED state and immediately sets the
   * status to ACTIVE_RUNNING.
   */
  public async resume(): Promise<void> {
    assert(
      this.status === SkillStatus.ACTIVE_PAUSED,
      `Skill must be in PAUSED state to resume, but was in ${this.status}`,
    );
    this.status = SkillStatus.ACTIVE_RUNNING;
    await this.doResume();
  }

  /**
   * Stops a skill.
   * Requires that the skill be in the ACTIVE_RUNNING or ACTIVE_PAUSED state and
   * immediately sets the status to STOPPED.
   */
  public async stop(): Promise<void> {
    assert(
      this.status === SkillStatus.ACTIVE_RUNNING ||
        this.status === SkillStatus.ACTIVE_PAUSED,
      `Skill must be in ACTIVE or PAUSED state to stop, but was in ${this.status}`,
    );
    this.status = SkillStatus.STOPPED;
    await this.doStop();
  }

  // These are the methods that subclasses must implement
  protected abstract doInvoke(...args: any[]): Promise<void>;
  protected abstract doPause(): Promise<void>;
  protected abstract doResume(): Promise<void>;
  protected abstract doStop(): Promise<void>;
}
