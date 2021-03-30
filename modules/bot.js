const { sendMessage } = require('../util/bot_utils');

const errStream = process.env.DISCORD_ERRSTREAM;
const adminUser = process.env.DISCORD_ADMINUSER;

const DISCORD_MAX_LEN = 1900;

const commandSyntax = /^\s*!([A-Za-z]+)((?: [^ ]+)+)?\s*$/;

module.exports = (discord, db, imm, logger) => {

  var errLogDisabled = false;

  const channelManagement = require('./commands/channel_management')(db, logger);
  const subManagement = require('./commands/sub_management')(db, logger);
  const mangadexCommands = require('./commands/mangadex_commands')(imm, logger);
  const mangaseeCommands = require('./commands/mangasee_commands')(db, imm, logger);
  const newChapterEvent = require('./commands/new_chapter_event')(discord, db, logger);

  const commandHandlers = {
    "help": helpHandler,
    'notifchannel': channelManagement.notifchannelHandler,
    'unnotif': channelManagement.unnotifHandler,
    'sub': subManagement.subscribeHandler,
    'unsub': subManagement.unsubscribeHandler,
    'listsubs': subManagement.listsubsHandler,
    'dexstatus': mangadexCommands.dexstatusHandler,
    'mangaseestatus': mangaseeCommands.mangaseestatusHandler,
    'getaliases': mangaseeCommands.getaliasesHandler,
    'addalias': mangaseeCommands.addaliasHandler,
    'delalias': mangaseeCommands.delaliasHandler,
    'test': testHandler
  };

  // Discord event handlers

  function readyHandler() {
    logger.info("Discord connected", 1);
    
    let guilds = discord.guilds.cache.map(g => g.id);
    db.addGuilds(...guilds);
  }

  function joinServerHandler(guild) {
    logger.info(`Joined guild: ${guild.name}`, 2);
    db.addGuilds(guild.id);
  }

  function leaveServerHandler(guild) {
    logger.info(`Left guild: ${guild.name}`, 2);
    db.removeGuild(guild.id);
  }

  async function messageHandler(message) {
    // Ignore bot messages to avoid messy situations
    if (message.author.bot) {
      return;
    }

    const command = parseCommand(message);
    if (command != null) {
      logger.info(`Command received from '${message.author.username}' in '${message.guild.name}': ` +
          `!${command.command} - '${command.arguments.join(' ')}'`, 2);
      commandHandlers[command.command](command);
    }
    return;
  }

  // Command handlers

  async function testHandler(command) {
    if (command.message.author.id != adminUser) {
      logger.info(`Non-admin user ${command.message.author.username} attempted to use !test`);
      return;
    }

    imm.notify('newFeedItem', {
      title: 'The 100 Girlfriends Who Really, Really, Really, Really, Really Love You - Volume 3, Chapter 23.5',
      link: 'https://mangadex.org/chapter/1044641',
      mangaLink: 'https://mangadex.org/title/44394'
    });
  }

  function helpHandler(command) {
    if (command.arguments == null ||
          command.arguments[0] !== "weebbot") {
      // Only send help for !help weebbot
      return;
    }

    let msg = 
      "Weeb bot - Ping roles on new chapters in Mangadex\n" +
      "\n" +
      "!notifchannel <role> - Set current channel as the notification channel for given role\n" +
      "!unnotif <role> - Remove notif channel from given role\n" +
      "!sub <role> <manga url> - Subscribe given role to given manga\n" +
      "!unsub <role> <manga url> - Unubscribe given role from given manga\n" +
      "!listsubs <role> - List all subscriptions for given role\n" +
      "\n" +
      "!dexstatus - Get last known status of Mangadex\n"
      "\n" +
      "!getaliases <manga url> - Get all aliases for given manga - Used by Mangasee parser\n" +
      "!addalias <manga url> <alias> -Add an alias to a given manga\n" +
      "!delalias <manga url> <alias> - Delete an alias from a given manga\n" +
      "\n" +
      "Subscription commands will only work after !notifchannel has been called for the channel"

    sendMessage(command.message.channel, msg);
  }

  // Message bus event handlers

  async function errorLogHandler(topic, log) {
    if (!errLogDisabled) {
      try {
        // Should ensure that it works for DM channels too
        var targetChannel = await discord.channels.fetch(errStream);
        // Only send if we can access the error channel
        if (targetChannel != null) {
          sendMessage(targetChannel, log);
        }
      } catch (e) {
        console.error('Discord error log exception, disabling error log');
        console.error(e);
        errLogDisabled = true;
      }
    }
  }

  // Utility functions

  function parseCommand(cmdMessage) {
    // Compare against command syntax
    var matchObj = cmdMessage.content.match(commandSyntax);

    // Check if command is valid
    if (matchObj == null || !(matchObj[1] in commandHandlers)) {
      return null;
    }

    return {
      message: cmdMessage,
      command: matchObj[1],
      arguments: matchObj[2] ? matchObj[2].trim().split(' ') : []
    };
  }

  discord.once('ready', readyHandler);
  discord.on('message', messageHandler);
  discord.on('error', err => logger.error(`Discord error: ${err}`));
  discord.on('guildCreate', joinServerHandler);
  discord.on('guildDelete', leaveServerHandler);

  imm.subscribe('newChapter', newChapterEvent.newChapterHandler);
  imm.subscribe('newErrorLog', errorLogHandler);
}