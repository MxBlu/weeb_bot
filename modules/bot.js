const mangadex = require('../util/mangadex');

const errGuild = process.env.DISCORD_ERRGUILD;
const errStream = process.env.DISCORD_ERRSTREAM;
const adminUser = process.env.DISCORD_ADMINUSER;

const DISCORD_MAX_LEN = 1900;

const commandSyntax = /^\s*!([A-Za-z]+)((?: [^ ]+)+)?\s*$/;

module.exports = (discord, db, imm, logger) => {

  var errLogDisabled = false;

  const commandHandlers = {
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
    
    let guilds = discord.guilds.map(g => g.id);
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

  let D2 = require('discord.js')

  let d2 = new D2.Client();
  let m2 = new D2.Message();
  m2.author.id

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

  async function notifchannelHandler(command) {
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing arugment, provide role to register', 3);
      return;
    }
    const roleName = command.arguments[0];

    let guild = command.message.guild;
    let channel = command.message.channel;
    let role = guild.roles.find(r => r.name == roleName);
    
    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', 3);
      return;
    }

    await db.addRole(guild.id, role.id);
    await db.setNotifChannel(guild.id, role.id, channel.id);
    sendCmdMessage(command.message, `Notif channel set to #${channel.name} for role @${role.name}`, 2);
  }

  async function unnotifHandler(command) {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      logger.info(`Not listening to channel #${command.message.channel.name}`);
      return;
    }
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing arugment, provide role to unregister', 3);
      return;
    }
    const roleName = command.arguments[0];

    let guild = command.message.guild;
    let role = guild.roles.find(r => r.name == roleName);

    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', 3);
      return;
    }

    await db.delRole(guild.id, role.id);
    await db.delNotifChannel(guild.id, role.id);
    sendCmdMessage(command.message, `No longer notifying for role @${role.name}`, 2);
  }

  async function subscribeHandler(command) {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      logger.info(`Not listening to channel #${command.message.channel.name}`);
      return;
    }
    if (command.arguments.length < 2) {
      sendCmdMessage(command.message, 'Error: missing an arugment, provide role and title URL', 3);
      return;
    }
    const roleName = command.arguments[0];
    const titleId = mangadex.parseTitleUrl(command.arguments[1]);

    if (titleId == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', 3);
      return;
    }
    
    let guild = command.message.guild;
    let role = guild.roles.find(r => r.name == roleName);

    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', 3);
      return;
    }

    let titleName = "";
    try {
      titleName = await mangadex.getMangaTitle(titleId);
    } catch (e) {
      sendCmdMessage(command.message, 'Error: Invalid url or Mangadex connection issues, try again', 2);
      return;
    }
    await db.setTitleName(titleId, titleName);
    await db.addTitle(guild.id, role.id, titleId);
    sendCmdMessage(command.message, `Added title '${titleName}' to role @${role.name}`, 2);
  }

  async function unsubscribeHandler(command) {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      logger.info(`Not listening to channel #${command.message.channel.name}`);
      return;
    }
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing an arugment, provide role and title URL', 3);
      return;
    }
    const roleName = command.arguments[0];
    const titleId = mangadex.parseTitleUrl(command.arguments[1]);

    if (titleId == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', 3);
      return;
    }

    let guild = command.message.guild;
    let role = guild.roles.find(r => r.name == roleName);

    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', 3);
      return;
    }

    let titleName = await db.getTitleName(titleId);
    await db.delTitle(guild.id, role.id, titleId);
    // TODO: Use Mangadex api to display title from db
    sendCmdMessage(command.message, `Removed title '${titleName}' from role @${role.name}`, 2);
  }

  async function listsubsHandler(command) {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      logger.info(`Not listening to channel #${command.message.channel.name}`);
      return;
    }
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing an arugment, provide role', 3);
      return;
    }
    const roleName = command.arguments[0];

    let guild = command.message.guild;
    let role = guild.roles.find(r => r.name == roleName);

    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', 3);
      return;
    }

    const titles = await db.getTitles(guild.id, role.id);
    if (titles == null || titles.size == 0) {
      sendCmdMessage(command.message, 'No subscriptions', 3);
    }
    
    let titleNames = {};
    for (let title of titles) {
      titleNames[title] = await db.getTitleName(title);
    }

    let str = Array.from(titles.values()).map(t => `${titleNames[t]} - <${mangadex.toTitleUrl(t)}>`).join('\n');
    sendCmdMessage(command.message, str, 3);
  }

  // Message bus event handlers

  async function newChapterHandler(topic, chapter) {
    const guild = discord.guilds.get(chapter.guild);
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
      let channel = guild.channels.get(channelId);
      let pingStr = roles.map(tr => `<@&${tr}>`).join(' ');

      var msg = 
        `${chapter.title} - ${chapter.pageCount} pages ${pingStr}\n` +
        `${chapter.link}`
      
      sendMessage(channel, msg);
    }
  }

  function errorLogHandler(topic, log) {
    if (!errLogDisabled) {
      try {
        var targetChannel = discord.guilds.get(errGuild).channels.get(errStream);
        sendMessage(targetChannel, log);
      } catch (e) {
        console.log('Discord error log exception, disabling error log');
        console.log(e);
        errLogDisabled = true;
      }
    }
  }

  // Utility functions

  function chunkString(str, len) {
    const size = Math.ceil(str.length/len);
    const r = Array(size);
    let offset = 0;
    
    for (let i = 0; i < size; i++) {
      r[i] = str.substr(offset, len);
      offset += len;
    }
    
    return r;
  }

  function sendCmdMessage(message, msg, level) {
    logger.info(`${message.author.username} - ${message.guild.name} - ${msg}`, level);
    sendMessage(message.channel, msg);
  }

  function sendMessage(targetChannel, msg) {
    var msgChunks = chunkString(msg, DISCORD_MAX_LEN);
    for (var i = 0; i < msgChunks.length; i++){
      targetChannel.send(msgChunks[i]);
    }
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
  discord.on('guildCreate', joinServerHandler);
  discord.on('guildDelete', leaveServerHandler);

  imm.subscribe('newChapter', newChapterHandler);
  imm.subscribe('newErrorLog', errorLogHandler);
}