# Contributing

For now, please contact me directly first.

TODO:

- Re-implement `generate_skills_docs()`
- Test `pathfindToCoordinates` manually
- Figure out how to handle/transmute results from internal skill calls... make a `Result` interface w/ constructor that does the f-string thing--instead of merely current functions--in order to use `type of` to determine the type of the inner-call result (will help for tests too)
- Reimplement `approach`
- Figure out clean (decoupled/general) way to detect/propogate `UNHANDLED_RUNTIME_ERROR` to python... Try/catch arround `_invoke()`?
- Implement general death result in a general/clean (out of scope for skills):
  - If death happened before skill-invocation message received, once received, discard and resolve w/ death result
  - If death happened during skill-execution, pause skill, unset `SemanticSteve.currentSkill`, and resolve with death result
- Figure out how to do `getReportSinceLastSkillResolution()` in a clean way
- How to add tests for each skill result? (Remember [this](https://discord.com/channels/413438066984747026/799108880218980382/1303466848356143154) Discord message...)
