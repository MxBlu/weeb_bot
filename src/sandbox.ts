import * as dotenv from 'dotenv';
import { Bot } from './modules/bot.js';
import { MangadexHelper } from './util/mangadex.js';
import { Mangasee } from './util/mangasee.js';
import { Store } from './util/store.js';

dotenv.config();

/*
  Generic alternative main file for testing whatever needs to be tested
*/

// Set DB
const redisHost = process.env.REDIS_HOST;
const redisPort = Number(process.env.REDIS_PORT);
Store.init(redisHost, redisPort);

// Initialise the Mangadex API helper
// const mangadexUsername = process.env.MANGADEX_USERNAME;
// const mangadexPassword = process.env.MANGADEX_PASSWORD;
// MangadexHelper.init(mangadexUsername, mangadexPassword);

// Bot services
// const discordToken = process.env.DISCORD_TOKEN;
// Bot.init(discordToken);

async function main(): Promise<void> {
  try {
    console.log(await Mangasee.getLatestChapters(null));
  } catch (e) {
    console.error(e);
  }
}

setTimeout(() => main().then(() => {
  console.error("hit then?");
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
}), 5000);