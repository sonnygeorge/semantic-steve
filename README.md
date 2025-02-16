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

Abstract away the stuff that is hard to do (fast) w/ only natural language observations & commands...

E.g., in order of priority:

1. "Smart" pathfinding (w/ automatic digging, bridging, & block interaction heuristics):
    - To arbitrary coordinates, into structures (assuming proximity), & out of structures
    - Avoiding backtracking whilst "exploring"/"searching" w/in structures
2. Mob-killing:
    - Auto-equipping best gear, automated chasing/attacking, auto-looting
3. Reactive self defense:
    - Continual monitoring for hostile mobs
    - Immediate interruption of current action to handle immediate threat(s) w/ mob-killing program(s)
    - Attempted return to bot state at time of interruption

...into a **_semantically intuitive_** [textworld](https://www.microsoft.com/en-us/research/project/textworld/) **API designed for LLM comprehension & usage**, e.g.:

```python
"""High-level semantic API for controlling Minecraft 'Steve' with text alone—e.g., only observing:
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
