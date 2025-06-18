import { Logger, LogLevel } from "bot-framework";
import { CommandBuilder, CommandProvider, sendCmdReply } from "bot-framework/discord";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { Store } from "../support/store.js";

export class UnotifChannelCommand implements CommandProvider<ChatInputCommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("UnnotifChannelCommand");
  }

  public provideCommands(): CommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('unnotif')
        .setDescription('Remove notif channel from given role')
        .addRoleOption(builder =>
          builder.setName('role')
            .setDescription('Role')
            .setRequired(true)
        ) as unknown as CommandBuilder
    ];
  }

  public provideHelpMessage(): string {
    return "/unnotif <role> - Remove notif channel from given role";
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const role = interaction.options.getRole('role');

    await Store.delRole(guild.id, role.id);
    await Store.delNotifChannel(guild.id, role.id);
    sendCmdReply(interaction, `No longer notifying for role @${role.name}`, this.logger, LogLevel.INFO);
  }
}