import { SlashCommandBuilder, SlashCommandRoleOption } from "@discordjs/builders";
import { CommandProvider, Logger, LogLevel, ModernApplicationCommandJSONBody, stringEquivalence } from "bot-framework";
import { CommandInteraction, Role, TextChannel } from "discord.js";

import { Store } from "../support/store.js";

export class NotifChannelCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("NotifChannelCommand");
  }

  public provideSlashCommands(): ModernApplicationCommandJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('notifchannel')
        .setDescription('Set current channel as the notification channel for given role')
        .addRoleOption(
          new SlashCommandRoleOption()
            .setName('role')
            .setDescription('Role')
            .setRequired(true)
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/notifchannel <role> - Set current channel as the notification channel for given role";
  }

  public async handle(command: BotCommand): Promise<void> {
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing arugment, provide role to register', this.logger, LogLevel.DEBUG);
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
      sendCmdMessage(command.message, 'Error: role does not exist', this.logger, LogLevel.DEBUG);
      return;
    }

    await Store.addRole(guild.id, role.id);
    await Store.setNotifChannel(guild.id, role.id, channel.id);
    sendCmdMessage(command.message, `Notif channel set to #${channel.name} for role @${role.name}`, this.logger, LogLevel.INFO);
  }
}