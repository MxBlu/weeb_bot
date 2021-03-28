const mangadex = require('../../util/mangadex');

const { sendCmdMessage, stringEquivalence } = require("../../util/bot_utils");
const { parseUrl } = require('../../util/urlparser');

module.exports = (db, logger) => {

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

  return {

    subscribeHandler: async (command) => {
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
        titleObj = await parseUrl(url);
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
    },

    unsubscribeHandler: async (command) => {
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
        titleObj = await parseUrl(url);
      } catch (e) {
        logger.info(`Error parsing URL: ${e}`);
      }
  
      if (titleObj == null) {
        sendCmdMessage(command.message, 'Error: bad title URL', 3, logger);
        return;
      }
  
      await db.delTitle(guild.id, role.id, titleObj.id);
      sendCmdMessage(command.message, `Removed title '${titleObj.title}' from role @${role.name}`, 2, logger);
    },

    listsubsHandler: async (command) => {
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

  }
}