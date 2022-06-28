import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandProvider, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction, TextChannel } from "discord.js";

import { Store } from "../support/store.js";

export class NotifChannelCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("NotifChannelCommand");
  }

  public provideSlashCommands(): RESTPostAPIApplicationCommandsJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('notifchannel')
        .setDescription('Set current channel as the notification channel for given role')
        .addRoleOption(builder =>
          builder.setName('role')
            .setDescription('Role')
            .setRequired(true)
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/notifchannel <role> - Set current channel as the notification channel for given role";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const role = interaction.options.getRole('role');

    // As TextChannel so we can get a name
    const channel = interaction.channel as TextChannel;

    await Store.addRole(guild.id, role.id);
    await Store.setNotifChannel(guild.id, role.id, channel.id);
    sendCmdReply(interaction, `Notif channel set to #${channel.name} for role @${role.name}`, this.logger, LogLevel.INFO);
  }
}