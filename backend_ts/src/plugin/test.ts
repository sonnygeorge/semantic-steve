import { createBot } from 'mineflayer'
import plugin from './'

const bot = createBot({
    host: 'localhost',
    port: 25565,
    username: 'test'});

    bot.loadPlugin(plugin);


    bot.on('spawn', () => { 
        const res = bot.structureFinder.findStructures(bot.entity.position.offset(0, -1, 0))

        console.log(res)
    })