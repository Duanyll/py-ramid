const _ = require('lodash');
const { ScreepsServer, TerrainMatrix } = require('screeps-server-mockup');
const { readFileSync, writeFileSync } = require('fs');
const { execSync } = require('child_process');

async function work() {
    // Initialize server
    const server = new ScreepsServer();
    await server.world.reset(); // reset world but add invaders and source keepers users
    // await server.world.stubWorld(); // create a stub world composed of 9 rooms with sources and controller

    // Prepare the terrain for a new room
    const terrain = new TerrainMatrix();
    const walls = [[10, 10], [10, 40], [40, 10], [40, 40]];
    _.each(walls, ([x, y]) => terrain.set(x, y, 'wall'));

    // Create a new room with terrain and basic objects
    await server.world.addRoom('W0N1');
    await server.world.setTerrain('W0N1', terrain);
    await server.world.addRoomObject('W0N1', 'controller', 10, 10, { level: 0 });
    await server.world.addRoomObject('W0N1', 'source', 10, 40, { energy: 1000, energyCapacity: 1000, ticksToRegeneration: 300 });
    await server.world.addRoomObject('W0N1', 'source', 40, 10, { energy: 1000, energyCapacity: 1000, ticksToRegeneration: 300 });
    await server.world.addRoomObject('W0N1', 'mineral', 40, 40, { mineralType: 'H', density: 3, mineralAmount: 3000 });

    // Add a bot in W0N1
    const modules = {
        main: readFileSync('dist/main.js').toString(),
        'main.js.map': readFileSync('dist/main.js.map.js').toString()
    };
    const bot = await server.world.addBot({ username: 'duanyll', room: 'W0N1', x: 26, y: 25, modules });

    // Print console logs every tick
    bot.on('console', async (logs, results, userid, username) => {
        let time = await server.world.gameTime;
        _.each(logs, line => console.log(`[console|${username}|${time}]`, line));
    });

    // Start server and run several ticks
    await server.start();
    for (let i = 0; i < 100; i++) {
        // console.log('[tick]', await server.world.gameTime);
        await server.tick();
        _.each(await bot.newNotifications, ({ message }) => console.log('[notification]', message));
        if (i % 100 == 0) console.log(`[tick] ${i + 1}`);
    }

    // console.log('[memory]', await bot.memory, '\n');
    writeFileSync('test-memory.json', JSON.stringify(JSON.parse(await bot.memory), null, 4));
    // Stop server and disconnect storage
    server.stop();
    process.exit(); // required as there is no way to properly shutdown storage :(
}

execSync('npm run build');
console.log('Script compiled.')
work();
