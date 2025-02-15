class BoundingBox(dataclass):
    x_min: int
    y_min: int
    z_min: int
    x_max: int
    y_max: int
    z_max: int

class WorldState(dataclass):
    coordinates: tuple[int, int, int]
    health: int
    hunger: int
    time_of_day: str
    currently_in: str  # E.g., "overworld:snowy_tundra:snowy_weapon_smith_1"
    inventory: dict[str, int]
    equipped: list[str]
    immediate_vicinity: dict[str, dict[str, list[tuple[int, int, int] | BoundingBox]]]  # E.g., {"blocks": {"diorite": [(-3, 65, -3), (-3, 65, -2), ...], "chest": [(0, 66, 2)], ...}, "structures": {"snowy_weapon_smith_1": [BoundingBox(...)]}, "pois": {"grindstone": [(-3, 66, 0)]}}
    somewhat_nearby: dict[str, dict[str, list[str]]]  # E.g., {"north": {"blocks": ["iron_bars", "lava", ...], "structures": ["snowy_farm_1", ...], "pois": [...], "biomes": ["taiga"]}, ...}

    def __str__(self):
        """Returns "pretty" string representation of Semantic Steve's current world state."""
        ...

class SemanticSteve:
    def __init__(self):
        ...

    def pathfind_to_coordinates(self, coordinates=(0, 64, 0), also_stop_if_found=["iron_ore", "coal_ore"]) -> tuple[WorldState, Optional[ResultInfo]]:
        """Pathfinds to a set of coordinates (digging/bridging as needed), stopping when..."""
        ...

    def search_for_thing(self, thing="stronghold", direction="down", also_stop_if_found=["chest", "diamond_ore"], stay_in="nether_fortress") -> tuple[WorldState, Optional[ResultInfo]]:
        """Pathfinds in a direction for up to approximately 100 blocks (digging/bridging as needed), stopping when..."""  # Make this have memory such that while thing is the same, don't backtrack in pathfinding
        ...

    def explore_for_thing(self, thing="jungle", direction="north", also_stop_if_found=["village", "ruined_portal"]) -> tuple[WorldState, Optional[ResultInfo]]:
        """Pathfinds in a direction for up to approximately 300 blocks (digging/bridging as needed), stopping when..."""
        ...

    def approach_something_somewhat_nearby(self, something="weaponsmith", direction="north") -> tuple[WorldState, Optional[ResultInfo]]:
        """Pathfinds to nearest of something from somewhat nearby (digging/bridging as needed), stopping once the "something" is in the immediate vicinity."""
        ...

    def enter_structure(self, structure=""):  # Are these necessary?
        """"""
        ...

    def exit_structure(self):  # Are these necessary?
        """"""
        ...