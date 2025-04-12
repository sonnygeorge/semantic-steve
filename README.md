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

UNDER HEAVY DEVELOPMENT

## Overview

`semantic-steve` is (will be) a Python package that provides a semantically intuitive high-level wrapper for controlling an in-game Minecraft bot.

The primary design goal of `semantic-steve` is as an easy-to-understand, yet _generally capable_ controller for **language-model-driven autonomous Minecraft-playing systems**. In pursuit of this goal, `semantic-steve` aims to abstract away fast-reflex actions (e.g., reactive self-defense) with classical "game AI" ([Mineflayer](https://github.com/PrismarineJS/mineflayer) bot code) in order to allow language models to focus on high-level strategic decision-making.

`semantic-steve` is not affiliated with Mojang Studios or Microsoft Corporation.

## Installation

This package requires **Node.js 22**. Install it first:

- Download: https://nodejs.org
- Or use `nvm`: `nvm install 22` (assuming you have [nvm](https://github.com/nvm-sh/nvm) installed)
- Verify: `node --version` (should output `v22.x.x`)

Then install the package:

```bash
pip install git+https://github.com/sonnygeorge/semantic-steve.git@dev
```

Note: The installation will fail if Node.js 22 is not installed such that `node --version` outputs `v22.x.x`.

## Usage

See `examples.py`.

## Contributing

See `CONTRIBUTING.md`.

```

```
