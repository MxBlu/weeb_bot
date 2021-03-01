const { sendMessage, sendCmdMessage, stringEquivalence } = require('../util/bot_utils');
const mangadex = require('../util/mangadex');
const steamworks = require('../util/steamworks');

const errStream = process.env.DISCORD_ERRSTREAM;
const adminUser = process.env.DISCORD_ADMINUSER;

const DISCORD_MAX_LEN = 1900;

const commandSyntax = /^\s*!([A-Za-z]+)((?: [^ ]+)+)?\s*$/;

module.exports = (discord, db, imm, logger) => {

  var errLogDisabled = false;

  const commandHandlers = {
    "help": helpHandler,
    'notifchannel': notifchannelHandler,
    'unnotif': unnotifHandler,
    'sub': subscribeHandler,
    'unsub': unsubscribeHandler,
    'listsubs': listsubsHandler,
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
      "!sub, !unsub amd !listsubs will only work after !notifchannel has been called for the channel"

    sendMessage(command.message.channel, msg);
  }

  async function notifchannelHandler(command) {
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing arugment, provide role to register', 3, logger);
      return;
    }
    const roleName = command.arguments[0];

    let guild = command.message.guild;
    let channel = command.message.channel;
    let role = null;

    let roleRx = roleName.match(/^<@&(\d+)>$/);
    if (roleRx != null) {
      role = guild.roles.cache.get(roleRx[1]);
    } else {
      role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
    }
    
    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', 3, logger);
      return;
    }

    await db.addRole(guild.id, role.id);
    await db.setNotifChannel(guild.id, role.id, channel.id);
    sendCmdMessage(command.message, `Notif channel set to #${channel.name} for role @${role.name}`, 2, logger);
  }

  async function unnotifHandler(command) {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      logger.info(`Not listening to channel #${command.message.channel.name}`);
      return;
    }
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing arugment, provide role to unregister', 3, logger);
      return;
    }
    const roleName = command.arguments[0];

    let guild = command.message.guild;
    let role = null;

    let roleRx = roleName.match(/^<@&(\d+)>$/);
    if (roleRx != null) {
      role = guild.roles.cache.get(roleRx[1]);
    } else {
      role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
    }

    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', 3, logger);
      return;
    }

    await db.delRole(guild.id, role.id);
    await db.delNotifChannel(guild.id, role.id);
    sendCmdMessage(command.message, `No longer notifying for role @${role.name}`, 2, logger);
  }

  async function subscribeHandler(command) {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      logger.info(`Not listening to channel #${command.message.channel.name}`);
      return;
    }
    if (command.arguments.length < 2) {
      sendCmdMessage(command.message, 'Error: missing an arugment, provide role and title URL', 3, logger);
      return;
    }
    const roleName = command.arguments[0];
    const url = command.arguments[1];
    
    let guild = command.message.guild;
    let role = null;

    let roleRx = roleName.match(/^<@&(\d+)>$/);
    if (roleRx != null) {
      role = guild.roles.cache.get(roleRx[1]);
    } else {
      role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
    }

    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', 3, logger);
      return;
    }

    let titleObj = null;
    try {
      titleObj = parseUrl(url);
    } catch (e) {
      logger.info(`Error parsing URL: ${e}`);
    }

    if (titleObj == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', 3, logger);
      return;
    }

    await db.setTitleName(titleObj.id, titleObj.title);
    await db.addTitle(guild.id, role.id, titleObj.id);
    sendCmdMessage(command.message, `Added title '${titleObj.title}' to role @${role.name}`, 2, logger);
  }

  async function unsubscribeHandler(command) {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      logger.info(`Not listening to channel #${command.message.channel.name}`);
      return;
    }
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing an arugment, provide role and title URL', 3, logger);
      return;
    }
    const roleName = command.arguments[0];
    const titleId = mangadex.parseTitleUrl(command.arguments[1]);

    if (titleId == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', 3, logger);
      return;
    }

    let guild = command.message.guild;
    let role = null;

    let roleRx = roleName.match(/^<@&(\d+)>$/);
    if (roleRx != null) {
      role = guild.roles.cache.get(roleRx[1]);
    } else {
      role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
    }

    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', 3, logger);
      return;
    }

    let titleName = await db.getTitleName(titleId);
    await db.delTitle(guild.id, role.id, titleId);
    // TODO: Use Mangadex api to display title from db
    sendCmdMessage(command.message, `Removed title '${titleName}' from role @${role.name}`, 2, logger);
  }

  async function listsubsHandler(command) {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      logger.info(`Not listening to channel #${command.message.channel.name}`);
      return;
    }
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing an arugment, provide role', 3, logger);
      return;
    }
    const roleName = command.arguments[0];

    let guild = command.message.guild;
    let role = null;

    let roleRx = roleName.match(/^<@&(\d+)>$/);
    if (roleRx != null) {
      role = guild.roles.cache.get(roleRx[1]);
    } else {
      role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
    }

    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', 3, logger);
      return;
    }

    const titles = await db.getTitles(guild.id, role.id);
    if (titles == null || titles.size == 0) {
      sendCmdMessage(command.message, 'No subscriptions', 3, logger);
      return;
    }
    
    let titleNames = {};
    for (let title of titles) {
      titleNames[title] = await db.getTitleName(title);
    }

    let str = Array.from(titles.values()).map(t => `${titleNames[t]} - <${mangadex.toTitleUrl(t)}>`).join('\n');
    sendCmdMessage(command.message, str, 3, logger);
  }

  // Message bus event handlers

  async function newChapterHandler(topic, chapter) {
    const guild = discord.guilds.cache.get(chapter.guild);
    if (guild == null) {
      logger.error(`Error: notifying for a guild no longer available: ${chapter.guild}`);
      return;
    }

    let channels = {};
    for (let roleId of chapter.roles) {
      let nc = await db.getNotifChannel(guild.id, roleId);
      if (nc == null) {
        continue;
      }
      if (nc in channels) {
        channels[nc].push(roleId);
      } else {
        channels[nc] = [ roleId ];
      }
    }

    for (let [channelId, roles] of Object.entries(channels)) {
      let channel = guild.channels.cache.get(channelId);
      let pingStr = roles.map(tr => `<@&${tr}>`).join(' ');
      let pagesStr = chapter.pageCount > 0 ? `- ${chapter.pageCount} pages ` : '';

      var msg = 
        `${chapter.title} ${pagesStr}${pingStr}\n` +
        `${chapter.link}`
      
      try {
        sendMessage(channel, msg); 
      } catch (e) {
        logger.error(`Failed to send notification to ${guild.id}@${channelId}: ${e}`);
      }
    }
  }

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

  // Try parsing the url using all known formats
  // Returns { id, title }
  async function parseUrl(url) {

    // Try Mangadex
    let mangadex_id = mangadex.parseTitleUrl(url);
    if (mangadex_id != null) {
      let title = await mangadex.getMangaTitle(mangadex_id);
      return {
        id: mangadex_id,
        title: title
      };
    }

    // Try Steam
    let steam_id = steamworks.parseSteamUrl(url);
    if (steam_id != null) {
      let title = await steamworks.getAppTitle(steam_id);
      return {
        id: steam_id,
        title: title
      };
    }

    // If we can't parse it, return null
    return null;
  }

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

  async function checkIfSubscribed(message) {
    const guild = message.guild;
    const channel = message.channel;
    const roles = await db.getRoles(guild.id);

    for (let r of roles) {
      let nc = await db.getNotifChannel(guild.id, r);
      if (nc == channel.id) {
        return true;
      }
    }
    
    return false;
  }

  discord.once('ready', readyHandler);
  discord.on('message', messageHandler);
  discord.on('error', err => logger.error(`Discord error: ${err}`));
  discord.on('guildCreate', joinServerHandler);
  discord.on('guildDelete', leaveServerHandler);

  imm.subscribe('newChapter', newChapterHandler);
  imm.subscribe('newErrorLog', errorLogHandler);
}