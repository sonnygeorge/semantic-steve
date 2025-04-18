"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericSkillResults = void 0;
var GenericSkillResults;
(function (GenericSkillResults) {
    class SkillNotFound {
        constructor(skillName) {
            this.message = `SkillInvocationError: '${skillName}' is not a recognized or supported skill function. Please check the spelling and try again.`;
        }
    }
    GenericSkillResults.SkillNotFound = SkillNotFound;
    class UnhandledRuntimeError {
        constructor(skillName, error) {
            const errorString = error.toString();
            this.message = `SkillRuntimeError: An unexpected/unhandled error occurred while attempting to execute '${skillName}': ${errorString}`;
        }
    }
    GenericSkillResults.UnhandledRuntimeError = UnhandledRuntimeError;
    class DeathDuringExecution {
        constructor() {
            this.message = `For some reason, while executing your last skill, you died. This is your new state after respawning.`;
        }
    }
    GenericSkillResults.DeathDuringExecution = DeathDuringExecution;
    class DeathWhileAwaitingInvocation {
        constructor(skillName) {
            this.message = `For some reason, before your skill could be invoked, you died. Since death results in a respawn (changed state), the invocation '${skillName}' was never attempted. This is your new state after respawning.`;
        }
    }
    GenericSkillResults.DeathWhileAwaitingInvocation = DeathWhileAwaitingInvocation;
    class SkillTimeout {
        constructor(skillName, timeoutSeconds) {
            this.message = `SkillTimeoutError: The execution of skill '${skillName}' passed the hard-coded time limit of '${timeoutSeconds}' seconds. If your arguments make the skill take a long time; try changing them. Otherwise, the player likely found its way into a bad state that caused it to get stuck; try doing something else and coming back to this skill later. If the issue persists, perhaps the skill is broken for your use case.`;
        }
    }
    GenericSkillResults.SkillTimeout = SkillTimeout;
})(GenericSkillResults || (exports.GenericSkillResults = GenericSkillResults = {}));
