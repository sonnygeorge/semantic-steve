export const genericResults = {
  ERROR_SKILL_NAME_NOT_FOUND: (skillName: string) =>
    `SkillInvocationError: '${skillName}' is not a recognized or supported skill function. Please check the spelling and try again.`,

  UNHANDLED_RUNTIME_ERROR: (skillName: string, error: string) =>
    `SkillRuntimeError: An unexpected/unhandled error occurred while attempting to execute '${skillName}': ${error}`,
};

export const pathfindToCoordinatesResults = {
  ERROR_INVALID_THING: (thing: string, supportedThingTypes: string) =>
    `SkillInvocationError: '${thing}' is not a recognized or supported thing. Currently, only these varieties of things can be stopped at if found: ${supportedThingTypes}.`,

  ERROR_INVALID_COORDS: (coords: string) =>
    `SkillInvocationError: '${coords}' is not a valid coordinates array. Expected an array of three numbers ordered as [x, y, z].`,

  FOUND_THING_IN_IMMEDIATE_SURROUNDINGS: (
    targetCoords: string,
    foundThingName: string
  ) =>
    `Your pathfinding to or near ${targetCoords} was terminated early since '${foundThingName}' was found visible in the immediate surroundings.`,

  FOUND_THING_IN_DISTANT_SURROUNDINGS: (
    targetCoords: string,
    foundThingName: string
  ) =>
    `Your pathfinding to or near ${targetCoords} was terminated early since '${foundThingName}' was found visible in the distant surroundings.`,

  PARTIAL_SUCCESS: (
    reachedCoords: string,
    targetCoords: string
    // TODO: Is it possible to add layman-understandable reasons to this?
    // E.g., "because these blocks were impeding the way: '{impedingBlockNames}'"...
    // ...allowing the LLM to reason that, if it really wanted to proceeed towards these
    // coords, it might want to acquire a tool that is better fit for breaking such blocks.
  ) =>
    `You were only able to pathfind to ${reachedCoords} and not ${targetCoords}.`,

  SUCCESS: (targetCoords: string) =>
    `You were able to successfully pathfind to or near ${targetCoords} (such that these coordinates are now in your immediate surroundings).`,
};

export const approachResults = {
  ERROR_INVALID_THING: (thing: string, supportedThingTypes: string) =>
    `SkillInvocationError: '${thing}' is not a recognized or supported thing. Currently, only these varieties of things can be approached: ${supportedThingTypes}.`,

  ERROR_THING_NOT_IN_DISTANT_SURROUNDINGS: (thing: string) =>
    `SkillInvocationError: '${thing}' not found in your distant surroundings. A thing must be visible in your distant surroundings in order to be approached.`,

  ERROR_THING_NOT_IN_DISTANT_SURROUNDINGS_DIRECTION: (
    thing: string,
    direction: string
  ) =>
    `SkillInvocationError: '${thing}' not found in your distant surroundings ${direction} direction. The thing you want to approach must be visible in the specified direction of your distant surroundings.`,

  SUCCESS: (approachedThing: string) =>
    `You successfully approached '${approachedThing}'. It should now be present in your immediate surroundings.`,

  SUCCESS_DIRECTION: (thing: string, direction: string) =>
    `You successfully approached '${thing}' from the '${direction}' direction. '${thing}' should now be present in your immediate surroundings.`,

  FAILURE: (thing: string, pathfindingPartialSuccessResult: string) =>
    `You were unable to approach thing '${thing}'. ${pathfindingPartialSuccessResult}`,
};
