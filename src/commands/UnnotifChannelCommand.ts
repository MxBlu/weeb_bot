import { BotCommand, CommandProvider, Logger, LogLevel, sendCmdMessage, stringEquivalence } from "bot-framework";
import { Role, TextChannel } from "discord.js";

import { Store } from "../support/store.js";
import { checkIfSubscribed } from "../support/weeb_utils.js";

export class UnotifChannelCommand implements CommandProvider {
  logger: Logger;

  constructor() {
    this.logger = new Logger("UnnotifChannelCommand");
  }

  public provideAliases(): string[] {
    return [ "unnotif" ];
  }

  public provideHelpMessage(): string {
    return "!unnotif <role> - Remove notif channel from given role";
  }

  public async handle(command: BotCommand): Promise<void> {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      this.logger.debug(`Not listening to channel #${(command.message.channel as TextChannel).name}`);
      return;
    }
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing arugment, provide role to unregister', this.logger, LogLevel.DEBUG);
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
      sendCmdMessage(command.message, 'Error: role does not exist', this.logger, LogLevel.DEBUG);
      return;
    }

    await Store.delRole(guild.id, role.id);
    await Store.delNotifChannel(guild.id, role.id);
    sendCmdMessage(command.message, `No longer notifying for role @${role.name}`, this.logger, LogLevel.INFO);
  }
}