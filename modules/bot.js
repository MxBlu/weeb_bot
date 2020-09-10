const mangadex = require('../util/mangadex');

const targetGuild = process.env.DISCORD_TARGETGUILD;
const targetChannel = process.env.DISCORD_TARGETCHANNEL;
const targetRole = process.env.DISCORD_TARGETROLE;
const cmdChannel = process.env.DISCORD_CMDCHANNEL;
const errStream = process.env.DISCORD_ERRSTREAM;
const adminUser = process.env.DISCORD_ADMINUSER;

const DISCORD_MAX_LEN = 1900;

const commandSyntax = /!([A-Za-z]+)((?: [^ ]+)+)?/;

module.exports = (discord, db, imm, logger) => {

  var errLogDisabled = false;

  const commandHandlers = {
    'sub': subscribeHandler,
    'unsub': unsubscribeHandler,
    'listsubs': listsubsHandler
  };

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

  function messageHandler(message) {
    // Only process message if it's in the command channel
    if (message.channel.id != cmdChannel || message.author.bot) {
      return;
    }

    const command = parseCommand(message);
    if (command != null && command.command in commandHandlers) {
      logger.info(`Command received from ${message.author.username} in ${message.channel.guild.name}: ` +
          `${command.command} - '${command.arguments.join(' ')}'`, 2);
      commandHandlers[command.command](command);
    }
    return;
  }

  function subscribeHandler(command) {
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing arugment, provide title URL', 3);
      return;
    }
    const titleId = mangadex.parseUrl(command.arguments[0]);
    if (titleId == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', 3);
      return;
    }

    db.append('titles', titleId);
    sendCmdMessage(command.message, `Added title ID ${titleId}`, 2);
  }

  function unsubscribeHandler(command) {
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing arugment, provide title URL', 3);
      return;
    }
    const titleId = mangadex.parseUrl(command.arguments[0]);
    if (titleId == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', 3);
      return;
    }

    db.remove('titles', titleId);
    sendCmdMessage(command.message, `Removed title ID ${titleId}`, 2);
  }

  function listsubsHandler(command) {
    const titles = db.getValue('titles');
    if (titles == null || titles.size == 0) {
      sendCmdMessage(command.message, 'No subscriptions', 3);
    }
    let str = Array.from(titles.values()).map(t => `<${mangadex.toTitleUrl(t)}>`).join('\n');
    sendCmdMessage(command.message, str, 3);
  }

  function newChapterHandler(topic, chapter) {
    var channel = discord.guilds.get(targetGuild).channels.get(targetChannel);

    var msg = 
      `${chapter.title} <@&${targetRole}>\n` +
      `${chapter.link}`
    
    sendMessage(channel, msg);
  }

  function errorLogHandler(topic, log) {
    if (!errLogDisabled) {
      try {
        var targetChannel = discord.guilds.get(targetGuild).channels.get(errStream);
        sendMessage(targetChannel, log);
      } catch (e) {
        console.log('Discord error log exception, disabling error log');
        console.log(e);
        errLogDisabled = true;
      }
    }
  }

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
    logger.info(`${message.author.username} - ${msg}`, level);
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
    if (matchObj == null) {
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
  discord.on('guildCreate', joinServerHandler);
  discord.on('guildDelete', leaveServerHandler);

  imm.subscribe('newChapter', newChapterHandler);
  imm.subscribe('newErrorLog', errorLogHandler);
  
  discord.login(discordToken);
}