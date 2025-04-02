<!-- ```python
# semantic-steve
# ├── docs
# |   └── ...
# |
# ├── semantic_steve
# │   ├── js/
# │   │   │   build/
# │   │   │   └── ...
# │   │   │
# │   │   │   src/
# │   │   │   ├── constants/
# │   │   │   |   ├── direction.ts
# │   │   │   |   ├── misc.ts
# │   │   │   │   └── results-messages.ts
# │   │   │   │
# │   │   │   ├── core/
# │   │   │   |   ├── environment/
# │   │   │   │   │   ├── surroundings.ts
# │   │   │   │   │   └── state.ts
# │   │   │   │   │
# │   │   │   |   ├── things/  # ...├── structures?
# │   │   │   │   │   └── parse-array.ts
# │   │   │   │   │
# │   │   │   |   └── pathfind.ts
# │   │   │   │
# │   │   │   ├── skills/
# │   │   │   |   |   # These orchestrate high-level logic (invoking each other & core logic)
# │   │   │   │   ├── _approach.ts
# │   │   │   │   ├── _pathfind-to-coordinates.ts
# │   │   │   │   ├── _take-screenshot.ts
# │   │   │   |   |   # These validate and parse inputs
# │   │   │   │   ├── approach.ts
# │   │   │   │   ├── pathfind-to-coordinates.ts
# │   │   │   │   └── take-screenshot.ts
# │   │   │   │
# │   │   │   ├── index.ts
# │   │   │   ├── registry.ts
# │   │   │   ├── types.ts
# │   │   │   └── utils.ts  # getDirFromYaw()
# │   │   │
# │   │   └── ...
# │   │
# │   ├── skills/  # For autogeneration of docs? Do we want to use python style for function invocation?
# │   │   ├── __init__.py
# │   │   ├── approach.py
# │   │   ├── pathfind_to_coordinates.py
# │   │   └── take_screenshot.py
# │   │
# │   └── __init__.py
# │
# ├── tests/  # How to do these?
# │
# ├── ...
# ├── .pre-commit-config.yaml
# └── README.md
``` -->

TODO:

- Basic re-org to new files
- Add unit tests for cross-validating skill names+args and i/o messages
- Add command to re-build docs to Makefile
- Figure out how to do `getReportSinceLastFunctionTermination`
- How to add tests for each results String? -- [this](https://discord.com/channels/413438066984747026/799108880218980382/1303466848356143154) Discord message

> It’s a pretty heavily modified version of mindcraft, i added a benchmarking thingy that sets up a new server similar to how it does in the mineflayer tests that gives it a specific goal and waits for the agent to complete the goal then repeats, then I can run it in the same scenarios over and over after I make changes to see if what I’m changing is actually improving its performance

What if:

```typescript
envState.surroundings.hydrate();
thing.isInSurroundings();
envState.surroundings.isThreatPresent();
```

```python
class Thing(Protocol):
    bot: Bot

    def isInSurroundings() -> bool:
        ...

class Block(Thing):  # TODO: Naming conflict with PBlock
    bot: Bot

    def isInSurroundings() -> bool:
        # Check the bot's surroundings to see if the block is present
        ...

def thingFactory(thing: str) -> Thing:
    if "is a block":
        return Block()
    elif ...
        return ...
    else:
        raise ValueError(f"Unknown thing type: {thing}")
```

Next:

(Can I fully) Rewrite pathfindToCoordinates with the ^^^^ interface... (?)
