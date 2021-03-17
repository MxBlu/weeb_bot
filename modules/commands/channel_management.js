const { sendCmdMessage, stringEquivalence } = require("../../util/bot_utils");

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

    notifchannelHandler: async (command) => {
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
    },

    unnotifHandler: async (command) => {
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
  }
}