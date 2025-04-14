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
})(GenericSkillResults || (exports.GenericSkillResults = GenericSkillResults = {}));
