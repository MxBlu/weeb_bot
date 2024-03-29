import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandProvider, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { Store } from "../support/store.js";

export class UnotifChannelCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("UnnotifChannelCommand");
  }

  public provideSlashCommands(): RESTPostAPIApplicationCommandsJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('unnotif')
        .setDescription('Remove notif channel from given role')
        .addRoleOption(builder =>
          builder.setName('role')
            .setDescription('Role')
            .setRequired(true)
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/unnotif <role> - Remove notif channel from given role";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const role = interaction.options.getRole('role');

    await Store.delRole(guild.id, role.id);
    await Store.delNotifChannel(guild.id, role.id);
    sendCmdReply(interaction, `No longer notifying for role @${role.name}`, this.logger, LogLevel.INFO);
  }
}