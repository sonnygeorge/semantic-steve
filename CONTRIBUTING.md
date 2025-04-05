# Contributing

For now, please contact me directly first.

TODO:

- Put `pathfindToCoordinates` through its paces more (see TODOs in file)...
- Implement general death result in a general/clean (out of scope for skills) way:
  - If death happened before skill-invocation message received, once received, discard and resolve w/ death result
  - If death happened during skill-execution, pause skill, unset `SemanticSteve.currentSkill`, and resolve with death result
- Figure out how to do `getReportSinceLastSkillResolution()` in a clean way
- Implement `approach`
- How to add tests for each skill result? (Remember [this](https://discord.com/channels/413438066984747026/799108880218980382/1303466848356143154) Discord message...)
