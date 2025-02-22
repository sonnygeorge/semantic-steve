# Backend TS Code

This library leverages mineflayer, a Javascript library, to manage the connected bot instance to a server.

In order to run SemanticsSteve, the required dependencies for this code must be installed.


## Installation

### Requirements
- Node.js (v22.x)


### Steps
1. Clone the repository
2. Navigate to the backend_ts directory
3. Install the required dependencies via a package manager.
   1. `npm install`
   2. `yarn install`

Now that everything is installed, there are few things to note before running the code.
All of the provided scripts within `package.json` will run different portions of the project.

To see them, run `npm run` or `yarn run` to see the available scripts.

#### build
This script will compile the Typescript code into Javascript code.

#### start
This script will run the compiled Javascript code (requires build to be ran first), at the entrypoint (build/index.js).

#### dev
This script will run the Typescript code in development mode, which will automatically recompile the code when changes are made. Same behavior as `start`, but with the added benefit of hot-reloading.

#### cli_test
This script functions the same as dev, but runs a provided CLI-test script to debug provided endpoints.
Use this as a basic test for SemanticSteve's CLI functionality.

#### chat_test
This script is the same as cli_test, except it works in-game and responds to the player's chat messages.