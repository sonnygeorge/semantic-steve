# mctextworld

`mctextworld` is a Python package that provides semantically intuitive high-level functions for controlling a Minecraft player (bot), effectively turning Minecraft into a text-based game for the purpose of building language based planning algorithms (e.g., using LLMs).

🚧 This project is currently under development! 🚧


## Installation

```bash
pip install mctextworld
```

## Usage

```python
from mctextworld import Player, Minecraft

# Launch Minecraft instance
minecraft = Minecraft(headless=False)
# Create/connect to a singleplayer world
player = Player(minecraft, multiplayer_server_ip=None)
# Prints the details of the player's state in natural language
print(player.state)
# Call high-level functions to control the player
player.approach("oak_log")
player.mine("oak_log")
```

## Goals

### Unlocking Game States

We want to build (and document) a set of semantically intuitive set of general functions that can robustly unlock most game states in:

1. **Overworld (Peaceful Mode)** - The immediate goal (very difficult)
2. **Overworld** - A hopeful goal if we can achieve #1 (requires logic that constantly checks for hostile mobs and, interrupting other function/code execution, triggers rule-based combat AI when needed)
3. **Overworld+Nether** - Will essentially require further testing and tweaking in order for functions to be robust for unlocking states/surviving in the (more difficult) nether.
4. **Overworld+Nether+End** - The moonshot goal: implement a minimal set of semantically intuitive general functions that could beat the game (e.g., if used to play the "textworld" game by an intelligent human). 

### Semantically Intuitive General Functions

- **General:** The functions need to be general such that the total number of functions is minimized (whilst still being robust).
- **Semantically intuitive:** We also need them to be semantically intuitive and idiomatic such that an LLM could easily read their (succinct) documentation and have a high chance of understanding how to use them.

### Error Handling

We will need to carefully catch and handle errors in as semantic a way as possible. For example, if the `craft` function is called without a recipe's necessary ingredients, the user/LLM should be informed that this was the cause of failure.

### Robustly and succinctly representing the current game state

Concurrent to the development of our functions, we will figure out the best way to represent all necessary information about the current state in natural language (so that the user/LLM doesn't need to see the GUI).

Here is my current (working) idea (via an example):

```text
CURRENT STATE:

Minecraft v1.17.1
Mode: Survival
Difficulty: Peaceful

Coordinates: (0, 64, 0)
Health: 20/20
Hunger: 16.5/20
Time of day: 12:00
Weather: Clear
In structure: None

Notepad:
- There exists an unexplored shipwreck visible from overworld(-100, 67, 100).

Inventory:
{
    "oak_log": 16,
    "wooden_pickaxe": 1,
    "cooked_porkchop": 3,
}

In immediate vicinity:
{
    "blocks": {
        "grass_block": 12,
        "oak_log": 4,
        "oak_leaves": 26,
        "furnace": 1,
    }
    "special": {
        chest: (2, 64, 0),
    }
}

Beyond immediate vicinity:
{
    "north: {
        "biomes": [
            "plains",
        ],
        "structures": [
            "village",
        ],
        "mobs": [
            "cow",
            "sheep",
            "villager"
        ],
        "blocks": [
            "oak_log",
            "oak_leaves",
            "grass_block",
            "cobblestone",
            "oak_fence",
            "oak_door",
            "oak_trap_door
            "poppy",
            "dandelion",
        ]
    },
    "west": {
        "biomes": [
            "desert",
        ],
        "dropped_items": [
            "rabbit_hide",
        ],
        "blocks": [
            "grass_block",
            "stone",
            "sand",
            "sandstone",
            "dead_bush",
        ]
        "other": [
            "ravine",
            "lava_pool",
        ]
    },
    ...    
}
```

### My (Current Working) Idea For Functions

I am writing this in Python becuase that is what I (and LLMs!) tend to understand best.

```python
from typing import Literal, Optional

Mob = Literal["cow", "skeleton", "zombie", "creeper", "enderman", "..."]
Block = Literal["oak_log", "oak_leaves", "..."]
Item = Literal["diamond_sword", "diamond_pickaxe", "..."]
Structure = Literal["stronghold", "village", "..."]
Biome = Literal["plains", "desert", "..."]
Other = Literal["ravine", "lava_pool", "nether_portal_lit", "nether_portal_unlit", "..."]
Entity = Mob | Block | Structure | Biome | Other

TowardsDirection = Literal["up", "down", "north", "south", "east", "west"]
TowardsCoordinates = tuple[int, int, int]

###############################
## Basic Movement Primitives ##
###############################

def travel(
        stop_if_found: Optional[Entity | list[Entity]],
        direction: Optional[TowardsDirection | TowardsCoordinates],
        stay_in: Optional[Structure] = None,
    ):  # Main workhorse for digging, exploring, etc.
    """Travels in the specified direction for a short period of time, stopping if one or
    more of the specified entities is found (i.e., registers as existing either 'in the
    immediate vicinity' or 'beyond the immediate vicinity'). If no direction is specified,
    the function will explore in some direction, trying not to backtrack on previous
    paths.

    Note:
    - The pathfinding will dig if there is not an obvious path.
    - The pathfinding will bridge if it saves time and blocks are available.
    - Since the search time is short, one should expect to use this function many
      times, continually assessing and updating the appropriate direction, before
      encountering a desired entity.

    Usage:
        # Dig down for an increment of time, stopping if a cave is found
        travel(until_found="cave", direction="down")

        # Explore nether fortress for an increment of time, stopping early if a blaze spawner or chest is found
        travel(until_found=["blaze_spawner", "chest"], stay_in="nether_fortress")

        # Travel for an increment of time towards a set of coordinates
        travel(direction=(100, 64, 100))

        # Search north for an increment of time, stopping if a jungle biome is found
        travel(until_found="jungle", direction="north")
    """
    pass

def approach(
        entity: Entity, direction: Optional[TowardsDirection | TowardsCoordinates] = None
    ):
    """Approaches the nearest of the specified entity until it registers as being 'in the
    immediate vicinity'.

    Note:
    - If a direction is specified, the function will approach the nearest entity instance
      in that direction, ignoring those in the immediate vicinity.
    - If the specified entity is not 'beyond the immediate vicinity' at the time of call,
      the function will fail.
    """
    pass

##########################
## Right Click Variants ##
##########################

def apply(item: Item, entity: Optional[Entity]):
    """Applies the right-click action of the specified item to the specified entity.

    Note:
    - Fails if item not in inventory.
    - Fails if specified entity not in immediate vicinity.
    """
    # NOTE: flint_and_steel applied to nether_portal_unlit must be done from the correct angle
    # (i.e., the portal must be lit from the inside)
    # NOTE: `entity` is optional since, e.g., eyes of ender are applied to the sky (nothing)
    pass

def consume(item: Item):
    """Consumes the specified item.

    Note:
    - Fails if item not in inventory.
    - Fails if item is not food or a potion.
    """
    pass

def inspect_one_or_more_chests(at: Optional[list[tuple[int, int, int]]] = None) -> dict:
    """Inspects the contents of all chests in the immediate vicinity or at the specified
    coordinates.
    """
    pass

def right_click(block: Block):
    """Used for the generic right clicking of blocks like buttons, doors, beds, etc.
    
    Note:
    - Fails if block not in immediate vicinity.
    """
    pass

###########
## Misc. ##
###########

def retrieve_from_chest(
    item: Item,
    quantity: int = 1,
    chest_coordinates: Optional[tuple[int, int, int]] = None,
):
    """Retrieves the specified item from either (1) the nearest chest 'in the immediate
    vicinity' containing it or (2) from the chest at the specified coordinates (assuming
    it's in a chest that indeed does exist).
    """
    pass

def equip(item: Item):
    """Equips armor/tools/weapons from inventory.
    
    Note:
    - Fails if item not in inventory.
    """
    pass

###########
## Misc. ##
###########

QuantityOfItem = tuple[Item, int]

def retrieve_from_chest(
    item: QuantityOfItem,
    chest_coordinates: Optional[tuple[int, int, int]] = None,
):
    """Retrieves the specified item from either (1) the nearest chest 'in the immediate
    vicinity' containing it or (2) from the chest at the specified coordinates (assuming
    it's in a chest that indeed does exist).
    """
    pass

def craft(item: QuantityOfItem):
    """Tries to craft the specified item using a crafting table in the nearby vicinity or
    in the inventory (if a crafting table is necessary).
    
    Note:
    - Fails if necessary ingredients not in inventory.
    - Crafting table not necessary for some items.
    - If crafting table is necessary, fails if not in inventory or immediate vicinity.
    """

def smelt(item: QuantityOfItem, fuel: QuantityOfItem):
    """Tries to smelt the specified item using a furnace in the nearby vicinity or in the
    the inventory.

    Note:
    - Fails if item not in inventory.
    - Fails if fuel not in inventory or already in furnace.
    """
    pass

def kill(mob: Mob):
    """Utilizes rule-based combat AI to kill the specified mob and, if the drops can be
    pathfinded to and the inventory is not full, pathfinds to them and picks them up.
    
    Note:
    - The specified mob must register as either  'in the immediate vicinity' or 'beyond
      the immediate vicinity' at the time of call.
    """
    pass

def mine(block: Block, stop_at_quantity: Optional[int]) -> int:
    """Attempts to mine/gather as many of the specified block from the immediate vicinity,
    stopping at the `stop_at_quantity` if specified.

    Note:
    - Automatically equips the best tool for the job.
    - Fails if block not in immediate vicinity.


    Returns:
    - The number of the specified block mined.
    """
    pass

def place(
    block: Block,
    onto: Block,
    how: Literal["on top", "below", "north", "south", "east", "west"],
):
    """Places the specified block onto the specified block in the specified way.

    Note:
    - Fails if block not in inventory.
    - Fails if onto block not in immediate vicinity.
    """
    pass

#############
## Special ##
#############

def build(
    description: str = "6x7x6 house using planks, a door, and a glass pane for a window",
):
    """Invokes an LLM to write arbitrary mineflayer code to attempt to build what's
    described in the passed description.
    """
    # NOTE: We have to make sure arbitrarily written scripts cannot inject 'cheats' to achieve game states
    pass

def take_screenshot(of: Entity):
    """Employing logic to make sure to ensure a clear, comprehensinve vantage point, takes
    a screenshot of the specified entity.

    Note:
    - Fails if entity not in immediate vicinity.
    """
    pass

def add_to_notepad(note: str):
    """Adds the specified note to the notepad."""
    # NOTE: (to self) adhp.Planner should not plan this (as a primitive call) unless as the next-most subtask
    pass
```


