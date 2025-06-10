# semantic-steve

![semantic-steve banner](https://i.imgur.com/omL5Fax.png)

<div align="left">
	<img src="https://img.shields.io/badge/status-under%20development-orange"/></a>
	<a href="https://github.com/sonnygeorge/semantic-steve/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue"/></a>
    <a href="https://github.com/psf/black"><img src="https://img.shields.io/badge/code_style-black-000000.svg"/></a>
    <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square"/></a>
</div>

A semantic wrapper for controlling Minecraft 'Steve'

Think the project is interesting? Give it a star! ⭐

## Overview

`semantic-steve` is a Python package that provides a semantically intuitive high-level wrapper for controlling an in-game Minecraft bot.

The primary design goal of `semantic-steve` is as an easy-to-understand, yet _generally capable_ controller for **language-driven autonomous Minecraft-playing systems**. In pursuit of this goal, `semantic-steve` abstracts away low-level control (fast-reflex actions) with classical "game AI" ([Mineflayer](https://github.com/PrismarineJS/mineflayer) code) and exposes the set of high-level skills detailed below.

`semantic-steve` is not affiliated with Mojang Studios or Microsoft Corporation.

## Installation

While we have already reserved the `semantic-steve` package name on PyPI, we recommend installing directly from github for the provisional future:

```bash
pip install git+https://github.com/sonnygeorge/semantic-steve.git
```

## Usage

See `examples.py` for minimal code to:

- Control SemanticSteve from the CLI
- Control SemanticSteve using LMs

To run `examples.py`, you must:

- ⚠️ Have Node.js 22 installed such that `node --version` outputs `v22.x.x`.

  (`semantic-steve` runs JavaScript code that only works with this version)

- ⚠️ Have `yarn` installed.

  (so `semantic-steve` can automatically verify/install a few JS dependencies at runtime; see `semantic_steve/js/yarn.lock`)

- ⚠️ Have a Minecraft Java Edition world (versions `1.19.1` - `1.21.1`) running locally and open to LAN on port `25565`

## Contributing

PRs with small, narrowly-scoped changes/fixes are welcome.

However, please [ping me on discord](www.discord.com) or elsewhere if you would like to work on an actual enhancement/feature so that we can keep efforts synced and productive.

Please also feel free to raise GitHub issues.

## Skills

Currently, the invocable skills are as follows.

⚠️ With a focus on incremental, thoroughly-tested development, we plan to add many more soon!

- [**`takeScreenshotOf(thing, atCoordinates)`**](#takescreenshotof)
- [**`pathfindToCoordinates(coordinates, stopIfFound)`**](#pathfindtocoordinates)
- [**`approach(thing, direction, stopIfFound)`**](#approach)
- [**`mineBlocks(item, quantity)`**](#mineblocks)
- [**`craftItems(item, quantity)`**](#craftitems)
- [**`smeltItems(item, withFuelItem, quantityToSmelt)`**](#smeltitems)
- [**`pickupItem(item, direction)`**](#pickupitem)
- [**`getPlaceableCoordinates()`**](#getplaceablecoordinates)
- [**`placeBlock(block, atCoordinates)`**](#placeblock)

### takeScreenshotOf

```javascript
/**
* Attempts to take a screenshot of the specified thing, assuming it is in the
* immediate surroundings.
*
* @param thing - The thing to take a screenshot of.
* @param atCoordinates - Optional coordinates to disambiguate where the
* thing is located.
*/
takeScreenshotOf(thing: string, atCoordinates?: [number, number, number])
```

### pathfindToCoordinates

```javascript
/**
* Attempts to pathfind to or near a set of in-dimension coordinates (digging and
* bridging as needed), stopping early if something from the stopIfFound list
* becomes visible in the bot's surroundings.
*
* TIP: Do not call this function with very distant coordinates, as this will likely
* result in a timeout. Instead, prefer incremental invocations of this skill for
* traversing long distances.
* TIP: Use this function to dig down by calling it with coordinates below the bot's
* current Y level.
*
* @param coordinates - The target coordinates as an array ordered [x, y, z].
* @param stopIfFound - An optional array of strings representing things that, if
* found, should cause the pathdinding to stop (e.g., useful things).
*/
pathfindToCoordinates(coordinates: [number, number, number], stopIfFound?: string[])
```

### approach

```javascript
/**
* Attempt to pathfind to something visible in a direction of the bot's distant
* surroundings.
*
* @param thing - The name of the thing to approach.
* @param direction - The direction of the distant surroundings in which the thing
* you want to approach is located.
* @param stopIfFound - An optional array of strings representing things that, if
* found, should cause the pathdinding to stop (e.g., useful things).
*/
approach(thing: string, direction: string, stopIfFound?: string[])
```

### mineBlocks

```javascript
/**
* Auto-equipping the best tool for the job, mines and gathers the drops from a
* specified quantity of block, assuming they are visible in the immediate
* surroundings.
*
* TIP: Don't mine too many at a time; prefer small, incremental quantities
* (e.g. 1-6) in order to avoid timeout issues.
* TIP: Use 'pathfindToCoordinates' to dig down and not 'mineBlocks'!
*
* @param block - The block to mine.
* @param quantity - Optional quantity to mine. Defaults to 1.
*/
mineBlocks(item: string, quantity: number = 1)
```

### craftItems

```javascript
/**
* Crafts one or more of an item, assuming a crafting table (if necessary for the
* recipe) is either in inventory or in the immediate surroundings.
*
* @param item - The item to craft.
* @param quantity - Optional quantity to craft. Defaults to 1.
*/
craftItems(item: string, quantity: number = 1)
```

### smeltItems

```javascript
/**
* Smelts one or more of an item, assuming a furnace is either in inventory or in
* the immediate surroundings.
*
* TIP: Do not call this function with very high quantities that will take a long
* time to smelt and likely result in a timeout. Instead, prefer smelting large
* quantities in smaller incremental batches.
*
* @param item - The item to smelt.
* @param withFuelItem - The fuel item to use (e.g., coal).
* @param quantityToSmelt - The quantity to smelt. Defaults to 1.
*/
smeltItems(item: string, withFuelItem: string, quantityToSmelt: number = 1)
```

### pickupItem

```javascript
/**
* Attempt to walk over to an item and pick it up. Requires that the item be visible
* in the bot's immediate or distant surroundings.
*
* @param item - The name of the item to pick up (e.g., "diamond", "apple").
* @param direction - Must be provided if you want to pick up an item from the
* distant surroundings. The direction of the distant surroundings in which the item
* is located.
*/
pickupItem(item: string, direction?: string)
```

### getPlaceableCoordinates

```javascript
/**
 * Gets the coordinates at which it is currently possible to place a block.
 */
getPlaceableCoordinates();
```

### placeBlock

```javascript
/**
* Places a block.
*
* @param block - The block to place.
* @param atCoordinates - Optional target coordinates for block placement.
*/
placeBlock(block: string, atCoordinates?: [number, number, number])
```
