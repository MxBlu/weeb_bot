import * as dotenv from 'dotenv';
dotenv.config();

import { Bot } from './modules/bot.js';
import { MangadexScraper } from './modules/mangadex_scraper.js';
import { MangaseeScraper } from './modules/mangasee_scraper.js';
import { MangaParser } from './modules/parser.js';
import { Logger } from './util/logger.js';
import { MangadexHelper } from './util/mangadex.js';
import { Store } from './util/store.js';


// Main level logger
const logger = new Logger("Server");

// Redis DB
const redisHost = process.env.REDIS_HOST;
const redisPort = Number(process.env.REDIS_PORT);
Store.init(redisHost, redisPort);

// Initialise the Mangadex API helper
const mangadexUsername = process.env.MANGADEX_USERNAME;
const mangadexPassword = process.env.MANGADEX_PASSWORD;
MangadexHelper.init(mangadexUsername, mangadexPassword);

// Setup RSS feed listener
MangadexScraper.init();

// Setup Mangasee scraper
MangaseeScraper.init();

// Setup parser services
MangaParser.init();

// Bot services
const discordToken = process.env.DISCORD_TOKEN;
Bot.init(discordToken);

logger.info(`Server started`);