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
const dbFile = process.env.DB_FILE;
var db = require('./util/store')(dbFile, logger);

// Discord Client
const discordToken = process.env.DISCORD_TOKEN;
var discord = new Discord.Client();

// OCAU Client
// const ocauUser = process.env.OCAU_USER;
// const ocauPwd = process.env.OCAU_PWD;

// Setup parser services
// require('./modules/parser')(db, ocau, messenger, logger);

// Setup Discord services
messenger.newTopic('newThread');
require('./modules/bot')(discord, db, messenger, logger);

messenger.newTopic('newFeedItem');
require('./modules/rss')(messenger, logger);

// Start services
discord.login(discordToken);

logger.info(`Server started`);