# semantic-steve

![semantic-steve banner](https://i.imgur.com/omL5Fax.png)

<div align="left">
	<img src="https://img.shields.io/badge/status-under%20development-orange"/></a>
	<a href="https://github.com/sonnygeorge/semantic-steve/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue"/></a>
</div>

A semantic wrapper for controlling Minecraft 'Steve'

UNDER HEAVY DEVELOPMENT

## Overview

`semantic-steve` is (will be) a Python package that provides a semantically intuitive high-level wrapper for controlling an in-game Minecraft bot.

The primary design goal of `semantic-steve` is as an easy-to-understand, yet _generally capable_ controller for **language-model-driven agent systems**. In pursuit of this goal, `semantic-steve` automates away fast-reflex actions (e.g., reactive self-defense) with classical "game AI" ([Mineflayer](https://github.com/PrismarineJS/mineflayer) bot code) in order to allow language models to focus on high-level strategic decision-making.

`semantic-steve` is not affiliated with Mojang Studios or Microsoft Corporation.

## Project Goal

Abstract away the stuff that is hard to do (fast) w/ only natural language observations & commands into a **_semantically intuitive_** [textworld](https://www.microsoft.com/en-us/research/project/textworld/) **API designed for LLM comprehension & usage**, e.g.:

```python
"""High-level semantic API for controlling Minecraft 'Steve' with a purely text-based interface—e.g., only observing:
INVENTORY: ...
(hunger, health, weather, etc.)
IMMEDIATE_SURROUNDINGS: ...
NEARBY: ...
"""
def pathfind_to_coordinates(coordinates, also_stop_if_found):
    ...
def search_for_thing(thing, direction, also_stop_if_found, stay_in):
    ...
def explore_for_thing(thing, direction, also_stop_if_found):
    ...
def approach_something_nearby(something, direction):
    ...
# craft, kill_mob, smelt, etc.
```

## How to Run

See or run `usage_example.py` (with command `python usage_example.py`):

```python
"""
Right now, only the CLI interface is importable. Soon, we will have a better importable
interface for controlling Semantic Steve programatically, e.g., so LLMs can "hook up" to
it easily.
"""

from semantic_steve import run_textworld_cli

run_textworld_cli(rebuild_backend=True)
```

You will need to:

1. Install the `requirements.txt`
2. Install the backend dependencies in `backend_ts/yarn.lock`
3. Make sure the typescript backend gets built, e.g., by passing `rebuild_backend=True` to `run_textworld_cli`
4. Make sure you have a local Java Minecraft world that is open to LAN on port 25565.

NOTE: Sometimes, @gen's Mineflayer-[$x$] packages don't always end up in the `yarn.lock`, presumably, because he always already has them on his machine. So, sorry if you have to find/install them manually. 

## Current Project State

Right now, we've completed what I'm calling, **_"phase 1"_**, with two functions (mostly) built out:

1. Pathfind to (near) arbitrary coordinates

```typescript
export default async function pathfindToCoordinates(bot: Bot, coords: number[], stopIfFound: string[]): Promise<SemanticSteveFunctionReturnObj>  {
    ...
}
```

E.g., from the CLI: `pathfindToCoordinates([101, 64, 23], ["iron_ore"])`

Obviously, we want this to be as "intelligent" as possible—getting as close as possible, knowing when to break blocks or bridge, and outputting highly semantic, useful "results" messages like, `f"You came close to your target (20 blocks below, and 5 blocks to the west), but couldn't proceed further because block type {block_type} was not breakable or traversable."`.

2. 

```typescript
export default async function approach(bot: Bot, thing: string, direction?: string): Promise<SemanticSteveFunctionReturnObj> {
    ...
}
```

E.g., from the CLI: `approach("iron_ore")` or `approach("iron_ore", "north")` to specify a direction when there's `"iron_ore"` in multiple directions.

**The main UX idea we are trying dial in:**

The user, in theory will only see our stringified representation of the environment. Our stringified representation will show the user what "things" (blocks, biomes, etc.) are around them in the "distant surroundings".

The idea is that, cognitively, one "explores" simply by going towards ("approaching") things that lead you to believe that a given direction is more promising for you goal.

Of course, it's still very probable that, out-of-the-box, LLMs will still go in circles by, e.g., going back and forth between 2-4 "things" that it finds interesting, not realizing that it's stuck in a loop. But that's a problem we'll solve once we have it (i.e., get this much working well).

**Plans for the future:**

### "Phase 2"

The next big thing I'm hoping to figure out is something like a `takeScreenshotOf(thing: string)` function.

The reason being: If we can expose a function that can reliably get a .png of some "thing" it has "approached", then we can, by sending the .png to a Vision-Language Model (VLM) (and "asking" if the image depicts the "thing"), **_programatically benchmark_** an LLM reasoning system's explore and find arbitrary "things".

(at least, for now, in peaceful mode, with ample bridging blocks already in the bot's inventory)

## "Phase 3" and Beyond

After nailing at least this much, then the world is our oyster for adding all the other possible functions/functionality (crafting, mining, killing mobs, reactive self-defense, etc.) to create a more behaviorally comprehensive semantic-API-obfuscation of "fast-reflex" Minecraft gameplay.
