import * as dotenv from 'dotenv';
import { MangadexScraper } from './modules/mangadex_scraper.js';
import { Logger } from 'bot-framework';
import { MangadexHelper, MangadexHelperDependency } from './support/mangadex.js';
import { Mangasee } from './support/mangasee.js';
import { Store } from './support/store.js';

dotenv.config();

/*
  Generic alternative main file for testing whatever needs to be tested
*/

// Set DB
const redisHost = process.env.REDIS_HOST;
const redisPort = Number(process.env.REDIS_PORT);
Store.init(redisHost, redisPort);

// Initialise the Mangadex API helper
const mangadexUsername = process.env.MANGADEX_USERNAME;
const mangadexPassword = process.env.MANGADEX_PASSWORD;
MangadexHelper.init(mangadexUsername, mangadexPassword);

// Bot services
// const discordToken = process.env.DISCORD_TOKEN;
// Bot.init(discordToken);

async function main(): Promise<void> {
  // noop
}

main().then(() => {
  console.error("hit then?");
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});