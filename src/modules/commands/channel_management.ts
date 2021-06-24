import { Role, TextChannel } from "discord.js";
import { checkIfSubscribed, sendCmdMessage, stringEquivalence } from "../../util/bot_utils.js";
import { Logger } from "../../util/logger.js";
import { Store } from "../../util/store.js";
import { BotCommand } from "../bot.js";

export class ChannelManagementHandler {

  logger: Logger;

  constructor() {
    this.logger = new Logger("ChannelManagementHandler");
  }

  public notifchannelHandler = async (command: BotCommand): Promise<void> => {
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing arugment, provide role to register', 3, this.logger);
      return;
    }
    const roleName = command.arguments[0];

    const guild = command.message.guild;
    const channel: TextChannel = command.message.channel as TextChannel;
    let role: Role = null;

    const roleRx = roleName.match(/^<@&(\d+)>$/);
    if (roleRx != null) {
      role = guild.roles.cache.get(roleRx[1]);
    } else {
      role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
    }
    
    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', 3, this.logger);
      return;
    }

    await Store.addRole(guild.id, role.id);
    await Store.setNotifChannel(guild.id, role.id, channel.id);
    sendCmdMessage(command.message, `Notif channel set to #${channel.name} for role @${role.name}`, 2, this.logger);
  }

  public unnotifHandler = async (command: BotCommand): Promise<void> => {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      this.logger.info(`Not listening to channel #${(command.message.channel as TextChannel).name}`);
      return;
    }
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing arugment, provide role to unregister', 3, this.logger);
      return;
    }
    const roleName = command.arguments[0];

    const guild = command.message.guild;
    let role: Role = null;

    const roleRx = roleName.match(/^<@&(\d+)>$/);
    if (roleRx != null) {
      role = guild.roles.cache.get(roleRx[1]);
    } else {
      role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
    }

    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', 3, this.logger);
      return;
    }

    await Store.delRole(guild.id, role.id);
    await Store.delNotifChannel(guild.id, role.id);
    sendCmdMessage(command.message, `No longer notifying for role @${role.name}`, 2, this.logger);
  }
}