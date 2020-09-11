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

messenger.newTopic('newFeedItem');
messenger.newTopic('newChapter');
require('./modules/parser')(db, messenger, logger);

db.addGuilds('606704263053180929');

main = async () => {
  // messenger.subscribe('newChapter', console.log);
	// messenger.notify('newFeedItem', {
  //   title: 'Classmate Relationship? - Chapter 116',
  //   mangaLink: 'https://mangadex.org/title/23216',
  //   link: 'https://mangadex.org/chapter/1032885'
  // });
  const Mangadex = require('mangadex-api');
	const details = await Mangadex.getChapter(parseInt('1032885'));
	console.log(mangaDetails);
};
setTimeout(main, 500);
