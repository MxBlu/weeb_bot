import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandBuilder, CommandProvider, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { ChatInputCommandInteraction, TextChannel } from "discord.js";

import { Store } from "../support/store.js";

export class NotifChannelCommand implements CommandProvider<ChatInputCommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("NotifChannelCommand");
  }

  public provideCommands(): CommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('notifchannel')
        .setDescription('Set current channel as the notification channel for given role')
        .addRoleOption(builder =>
          builder.setName('role')
            .setDescription('Role')
            .setRequired(true)
        ) as unknown as CommandBuilder
    ];
  }

  public provideHelpMessage(): string {
    return "/notifchannel <role> - Set current channel as the notification channel for given role";
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const role = interaction.options.getRole('role');

    // As TextChannel so we can get a name
    const channel = interaction.channel as TextChannel;

    await Store.addRole(guild.id, role.id);
    await Store.setNotifChannel(guild.id, role.id, channel.id);
    sendCmdReply(interaction, `Notif channel set to #${channel.name} for role @${role.name}`, this.logger, LogLevel.INFO);
  }
}