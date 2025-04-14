export interface SkillResult {
  message: string;
}

export namespace GenericSkillResults {
  export class SkillNotFound implements SkillResult {
    message: string;
    constructor(skillName: string) {
      this.message = `SkillInvocationError: '${skillName}' is not a recognized or supported skill function. Please check the spelling and try again.`;
    }
  }

  export class UnhandledRuntimeError implements SkillResult {
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
}
