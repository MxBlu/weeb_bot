const Discord       = require('discord.js');

require('dotenv').config();

// Logger
const verbosity = process.env.LOG_LEVEL || 3;
var logger = require('./util/logger')(verbosity);

// Inter-module messenger
var messenger = require('./util/imm')(logger);
// For discord logging of logs
logger.registerMessenger(messenger);
messenger.newTopic('newErrorLog');

// Set DB
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
var db = require('./util/store')(redisHost, redisPort, logger);

// Discord Client
const discordToken = process.env.DISCORD_TOKEN;
var discord = new Discord.Client();

// Setup RSS feed listener
messenger.newTopic('newFeedItem');
require('./modules/rss')(messenger, logger);

// Setup parser services
messenger.newTopic('newChapter');
require('./modules/parser')(db, messenger, logger);

// Setup Discord services
require('./modules/bot')(discord, db, messenger, logger);

logger.info(`Server started`);