"""
This file contains unused Python pseudo-code for (old) Semantic Steve ideas.

You can think of it as the original brainstorm document for Semantic Steve functions/functionality.

It is not real (used) code, and it will be deleted (hopefully) soon.
"""

from typing import Any, Dict, Literal, Optional, TypedDict
from dataclasses import dataclass


####################################
#### World State Representation ####
####################################


class BoundingBox(dataclass):
    x_min: int
    y_min: int
    z_min: int
    x_max: int
    y_max: int
    z_max: int


@dataclass
class ImmediateSurroundings:
    """Detailed account of the VISIBLE immediate surroundings (i.e., w/in an n block radius)."""

    # Coords of all visible blocks, e.g., {"diorite": [(-3, 65, -3), (-3, 65, -2), ...], "chest": [(0, 66, 2)], ...}
    blocks: Optional[dict[str, list[tuple[int, int, int]]]]
    # Bounding boxes of all visible structures, e.g., {"snowy_weapon_smith_1": [BoundingBox(...)]}
    structures: Optional[dict[str, list[BoundingBox]]]
    # Coords of all visible POIs, e.g., {"grindstone": [(-3, 66, 0)]}
    pois: Optional[dict[str, list[tuple[int, int, int]]]]
    # Other visible things (e.g., mobs, item entities, etc.) TODO: Add specific attrs for these
    other: Optional[dict[str, list[tuple[int, int, int] | BoundingBox]]]


@dataclass
class VisibleNearbyThingsInADirection:
    # Quantities of block visible in this direction, e.g., {"iron_bars": 1, "lava": 2, ...}
    blocks: Optional[dict[str, int]]
    # Quantities of structures visible in this direction, e.g., {"snowy_farm_1": 1}
    structures: Optional[dict[str, int]]
    # Coords of visible POIs in this direction, e.g., {"composter": (14, 64, 20)}
    pois: Optional[dict[str, tuple[int, int, int]]]
    # What distinct biomes are visible in this direction. E.g., ["taiga", "snowy_tundra"]
    biomes: Optional[list[str]]  # FIXME: Technically a `set`
    # Quantities of other visible things in this direction (e.g., mobs, item entities, etc.) TODO: Add specific attrs for these
    other: Optional[dict[str, int]]


@dataclass
class NearbySurroundings(TypedDict):
    """Less detailed account of the VISIBLE nearby surroundings BEYOND the immediate surroundings."""

    up: VisibleNearbyThingsInADirection  # Presumably, we would never need down, since we can't see through blocks
    north: VisibleNearbyThingsInADirection
    northeast: VisibleNearbyThingsInADirection
    east: VisibleNearbyThingsInADirection
    southeast: VisibleNearbyThingsInADirection
    south: VisibleNearbyThingsInADirection
    southwest: VisibleNearbyThingsInADirection
    west: VisibleNearbyThingsInADirection
    northwest: VisibleNearbyThingsInADirection


@dataclass
class WorldState:
    coordinates: tuple[int, int, int]
    health: int
    hunger: int
    time_of_day: str
    currently_in: str  # E.g., "overworld:snowy_tundra:snowy_weapon_smith_1"
    inventory: dict[str, int]
    equipped: list[str]
    notepad: list[  # See `SemanticSteve.add_to_notepad` for justification/more info
        str
    ]  # E.g., ["Current spawn point: (45, 64, 23)", "Shipwreck visible from (101, 69, -56)"]
    immediate_surroundings: ImmediateSurroundings
    nearby_surroundings: NearbySurroundings

    def __str__(self):
        """Returns "pretty" string representation of Semantic Steve's current world state."""
        ...  # NOTE: This is what gets shown to the LLM or user in the "textworld" CLI


#####################
#### Misc. Types ####
#####################

Direction = Literal[
    "up",
    "down",
    "north",
    "northeast",
    "east",
    "southeast",
    "south",
    "southwest",
    "west",
    "northwest",
]
# TODO: Would we ever want to do a VERTICALLY DIAGONAL search, e.g., for a cave?

ContainerType = Literal[
    "chest",
    "barrel",
    "shulker_box",
    "ender_chest",
    "dispenser",
    "dropper",
    "hopper",
]

QuantitiesOfItems = Dict[str, int]

############################
#### Semantic Steve API ####
############################

# NOTE: The interface is probably better as a module than a class, but that's a non-urgent design choice for later
# e.g. import semantic_steve as ss; ss.pathfind_to_coordinates((0, 64, 0))


class ActionResultInfo(TypedDict):
    """Information about the result of an action taken by Semantic Steve.

    Attributes:
        known_failure_reason (Optional[str]): If a known failure case was caught, this string will describe it. Otherwise, it will be None.
        result_info (Any): Basic data structure to comunicate the "results" of the action, e.g., the items in an inspected chest.
    """

    known_failure_reason: Optional[str]
    result_info: Optional[Any]


class SemanticSteve:
    # NOTE: Reactive self-defense is accomplished by continually monitoring for hostile mobs, and interrupting current actions to engage in combat if necessary.
    # Hence, it is obfuscated from the API user.

    def __init__(self, headless: bool = False): ...

    #############################
    #### Movement/Navigation ####
    #############################

    def pathfind_to_coordinates(
        self,
        coordinates: tuple[int, int, int] = (0, 64, 0),
        also_stop_if_found: Optional[list[str]] = ["iron_ore", "coal_ore"],
    ) -> tuple[WorldState, Optional[ActionResultInfo]]:
        """Pathfinds to a set of coordinates (digging/bridging as needed), stopping when..."""
        ...

    def search_for_thing(
        self,
        thing: str = "stronghold",
        search_direction: Optional[Direction] = "down",
        also_stop_if_found: Optional[list[str]] = ["chest", "diamond_ore"],
        stay_in: Optional[str] = None,  # E.g., "nether_fortress", "jungle", etc.
    ) -> tuple[WorldState, Optional[ActionResultInfo]]:
        """Pathfinds in a direction for up to approximately 100 blocks (digging/bridging as needed), stopping when..."""
        ...  # TODO: Avoid backtracking when stay_in is specified and direction = None

    def explore_for_thing(
        self,
        thing: str = "jungle",
        exploration_direction: Optional[Direction] = "north",
        also_stop_if_found: Optional[list[str]] = ["village", "ruined_portal"],
    ) -> tuple[WorldState, ActionResultInfo]:
        """Pathfinds in a direction for up to approximately 300 blocks (digging/bridging as needed), stopping when..."""
        ...

    def approach_something_nearby(
        self,
        something: str = "weaponsmith",
        something_direction: Optional[Direction] = None,
    ) -> tuple[WorldState, ActionResultInfo]:
        """Pathfinds to nearest of something from somewhat nearby (digging/bridging as needed), stopping once the "something" is in the immediate surroundings."""
        ...

    def enter_thing(
        self,
        thing: str,
    ) -> tuple[WorldState, ActionResultInfo]:
        """Pathfinds into a thing (e.g., biome or structure), assuming it is in the immediate surroundings."""
        ...
        # TODO: Will there ever be 2 of the "thing" in the immediate surroundings? If so, how to disambiguate?
        # I dont think so...

    def exit_thing(
        self, thing: str, towards_direction: Optional[Direction] = None
    ) -> tuple[WorldState, ActionResultInfo]:
        """Pathfinds out of a thing (e.g., biome or structure) if possible."""
        ...

    ################################################
    #### Chest/Container/Inventory Interactions ####
    ################################################

    def pick_up_item_entities(
        items_to_pick_up: QuantitiesOfItems,
    ) -> tuple[WorldState, ActionResultInfo]:
        """Picks up item entities in the immediate surroundings."""
        ...

    def discard_items_from_inventory(
        self, items_to_discard: QuantitiesOfItems
    ) -> tuple[WorldState, ActionResultInfo]: ...

    def inspect_contents_of_chest_or_container(
        self,
        container_type: ContainerType = "chest",
        in_direction: Optional[Direction] = None,
        at_coordinates: Optional[tuple[int, int, int]] = None,
    ) -> tuple[WorldState, ActionResultInfo]:
        """Inspects the contents of a chest or container in the immediate surroundings, disambiguating which container via the optional `in_direction` or `at_coordinates` arguments."""
        ...

    def deposit_items_into_chest_or_container(
        self,
        to_deposit: QuantitiesOfItems,
        container_type: ContainerType = "chest",
        in_direction: Optional[Direction] = None,
        at_coordinates: Optional[tuple[int, int, int]] = None,
    ) -> tuple[WorldState, ActionResultInfo]:
        """Deposits items into a chest or container in the immediate surroundings, disambiguating which container via the optional `in_direction` or `at_coordinates` arguments."""
        ...

    def withdraw_items_from_chest_or_container(
        self,
        to_withdraw: QuantitiesOfItems,
        container_type: ContainerType = "chest",
        in_direction: Optional[Direction] = None,
        at_coordinates: Optional[tuple[int, int, int]] = None,
    ) -> tuple[WorldState, ActionResultInfo]:
        """Withdraws items from a chest or container in the immediate surroundings, disambiguating which container via the optional `in_direction` or `at_coordinates` arguments."""
        ...

    ####################################
    ####  Other Semantic Primitives ####
    ####################################

    def apply_item_to_something(
        self,
        item: str,
        something: str,
        something_coordinates: Optional[tuple[int, int, int]] = None,
    ) -> tuple[WorldState, ActionResultInfo]:
        """Applies an item to something in the immediate surroundings, disambiguating which "something" via the optional `something_coordinates` argument."""
        ...

    # flint_and_steel to nether_portal
    # bonemeal to crops
    # eye_of_ender to portal
    # bucket to water/lava
    # saddle to pig/horse
    # name_tag to mob
    # lead to mob
    # lead to fence
    # item to item frame

    def use_or_throw_item(
        self,
        item: str,
        direction: Optional[Direction] = None,
        towards_coordinates: Optional[tuple[int, int, int]] = None,
    ) -> tuple[WorldState, ActionResultInfo]:
        """Throws an item that has a "throwing" mechanic/effect, e.g., eye_of_ender or ender_pearl"""
        ...

    # eye of ender
    # ender pearl
    # splash potion
    # egg
    # firework rocket

    def eat_or_consume_items(
        self, items: QuantitiesOfItems
    ) -> tuple[WorldState, ActionResultInfo]: ...

    def equip_item(self, item: str) -> tuple[WorldState, ActionResultInfo]: ...

    def unequip_item(self, item: str) -> tuple[WorldState, ActionResultInfo]: ...

    def right_click_interact_with_block_or_mob() -> tuple[WorldState, ActionResultInfo]: ...

    # sit down a dog/cat/mob
    # bed
    # button
    # lever
    # door
    # trapdoor
    # change repeater state
    # bell

    def mount_rideable(to_mount: str) -> tuple[WorldState, ActionResultInfo]:
        """Mounts a rideable thing, assuming, if the rideable thing is a mob, it is nearby, else (e.g., if it is a boat), it is in the immediate surroundings."""
        ...

    # getting in Minecart/boat
    # sitting on horse/other rideable mob

    def dismount_rideable() -> tuple[WorldState, ActionResultInfo]: ...

    def craft_items(
        self, items_to_craft: QuantitiesOfItems
    ) -> tuple[WorldState, ActionResultInfo]:
        """Crafts items, assuming a crafting table (if necessary for the recipe) is either in inventory or in the immediate surroundings."""
        ...

    def smelt_items(
        self, items_to_be_smelted: QuantitiesOfItems, fuel_item: str
    ) -> tuple[WorldState, ActionResultInfo]:
        """Smelts items, assuming a furnace (or blast furnace or smoker) is either in inventory or in the immediate surroundings."""
        ...

    def mine_blocks(  # (from visible immediate surroundings)
        block_quantities: Dict[str : int | Literal["all"]],
    ) -> tuple[WorldState, ActionResultInfo]:
        """Auto-equipping the best tool(s) for the job, attempts to mine the specified block quantities from the immediate surroundings and collect their drops."""
        ...

    def kill_mob(self, mob: str) -> tuple[WorldState, ActionResultInfo]:
        """Pathfinds to and, auto-equipping best gear for the job, employs combat AI to kill a mob (assuming it is "nearby") and loot it drops."""
        ...  # NOTE: This and mount_rideable are the only functions that don't (always) require the acted-upon thing to be in immediate surroundings. This is because mobs move &, e.g., you wouldn't want to approach a skeleton before initiating combat AI (it will already have shot you multiple times)

    # TODO: Placed block orientation?
    def place_block(
        self, block: str, target_coordinates: tuple[int, int, int]
    ) -> tuple[WorldState, ActionResultInfo]: ...

    #################
    #### Special ####
    #################

    # NOTE: take_screenshot will be essential for the eventual benchmarking an LM agent's ability to complete arbitrary language tasks (e.g. "take a pic of a yourself on a horse in a jungle biome wearing a turtle helmet") using Semantic Steve.
    # This is because, with screenshots, we can use a VLM to judge whether arbitrary tasks do seem to have been completed.
    def take_screenshot(
        in_foreground: str, in_background: Optional[list[str]] = None
    ) -> tuple[WorldState, ActionResultInfo]: ...

    # NOTE: This is a design choice I am opting for, that is, to have an ongoing notepad of notes that get rendered with the world state.
    def add_to_notepad(self, text: str) -> tuple[WorldState, ActionResultInfo]: ...

    # NOTE: This is here since, e.g., it might be more feasible for an LM to, say, "build a house" by writing an arbitrary Mineflayer script for this purpose than to use the place_block API primitive.
    # NOTE: We would probably want to have safeguards to prevent "cheats" for unlocking game states. Also, arbitrary code execution is a security risk; using this with an LM should always be done in a safe (separate) container/VM (e.g., w/ Docker).
    def run_arbitrary_mineflayer_script(
        self, script: str
    ) -> tuple[WorldState, ActionResultInfo]: ...


# TODO: (maybe/hopefully)
# - Trading with villagers
# - Leading animals w/ food
# - Enchanting items
# - Fishing
# - Villager workbench interactions (highest priority = anvil)

# Misc.
# - Following a map for a structure/buried treasure = once 'map to something' acquired, just return coords of the 'something' so it can be pathfound to?
# - Breeding function? (breeding might hard with fast appy + fast-moving mobs)
# - Removing a saddle = remove item from container? unequip item?

################################
#### Command Line Interface ####
################################


# TODO: This is just a placeholder for now. If semantic Steve ends up as a module and not a class, you could maybe run the CLI w/ `python -m semantic_steve` or something
def cli(controller: SemanticSteve):
    """Command-line interface for controlling Minecraft from the command line like a textworld game via the Semantic Steve API."""
    ...
