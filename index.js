const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
require("dotenv").config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.interactions = new Collection();

require('./handlers/events')(client);
require('./handlers/interactions')(client);

require('./databases/salesDB')();

process.on("unhandledRejection", (reason, p) => {
  console.log('[ ANTICRASH ] :: Unhandled Rejection / Catch');
  console.log(reason?.stack, p);
});
process.on("uncaughtException", (err, origin) => {
  console.log('[ ANTICRASH ] :: Uncaught Exception / Catch');
  console.log(err?.stack, origin);
});
process.on("uncaughtExceptionMonitor", (err, origin) => {
  console.log('[ ANTICRASH ] :: Uncaught Exception / Catch { MONITOR }');
  console.log(err?.stack, origin);
});

client.login(process.env['bot_token']);