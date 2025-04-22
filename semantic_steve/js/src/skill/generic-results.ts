import { SkillResult } from "../types";

export namespace GenericSkillResults {
  export class SkillNotFound implements SkillResult {
    message: string;
    constructor(skillName: string) {
      this.message = `SkillInvocationError: '${skillName}' is not a recognized or supported skill function. Please check the spelling and try again.`;
    }
  }

  export class UnhandledInvocationError implements SkillResult {
    message: string;
    constructor(skillName: string, error: Error) {
      const errorString = error.toString();
      this.message = `SkillRuntimeError: An unexpected/unhandled error occurred while attempting to execute '${skillName}': ${errorString}`;
    }
  }

  export class DeathDuringExecution implements SkillResult {
    message: string;
    constructor() {
      this.message = `For some reason, while executing your last skill, you died. This is your new state after respawning.`;
    }
  }

  export class DeathWhileAwaitingInvocation implements SkillResult {
    message: string;
    constructor(skillName: string) {
      this.message = `For some reason, before your skill could be invoked, you died. Since death results in a respawn (changed state), the invocation '${skillName}' was never attempted. This is your new state after respawning.`;
    }
  }

  export class SkillTimeout implements SkillResult {
    message: string;
    constructor(skillName: string, timeoutSeconds: number) {
      this.message = `SkillTimeoutError: The execution of skill '${skillName}' passed the hard-coded time limit of '${timeoutSeconds}' seconds. If something about your arguments made the skill take a very long time; try changing them (e.g., reducing a quantity). Otherwise, the player likely found its way into a bad state that caused it to get stuck; try doing something else and coming back to this skill later. If the issue persists, perhaps the skill is broken for your use case. Maybe try some other approach to your goals?`;
    }
  }
}
