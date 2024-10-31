import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandBuilder, CommandProvider, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { ChatInputCommandInteraction } from "discord.js";

import { ScraperType } from "../constants/scraper_types.js";
import { ScraperHelper } from "../support/scrapers.js";
import { Store } from "../support/store.js";

export class SubCommand implements CommandProvider<ChatInputCommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("SubCommand");
  }
    
  public provideCommands(): CommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('sub')
        .setDescription('Subscribe given manga to given role')
        .addRoleOption(builder =>
          builder.setName('role')
            .setDescription('Role')
            .setRequired(true)
        ).addStringOption(builder =>
          builder.setName('url')
            .setDescription('Manga URL')
            .setRequired(true)
        ) as unknown as CommandBuilder
    ];
  }

  public provideHelpMessage(): string {
    return "/sub <role> <manga url> - Subscribe given manga to given role";
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const role = interaction.options.getRole('role');
    const url = interaction.options.getString('url');

    const subscribable = await ScraperHelper.parseUri(url);
    if (subscribable == null) {
      sendCmdReply(interaction, 'Error: Unknown URL', this.logger, LogLevel.DEBUG);
      return;
    }

    await Store.setTitleName(subscribable.type, subscribable.id, subscribable.title);
    await Store.addTitle(guild.id, role.id, subscribable.type, subscribable.id);
    sendCmdReply(interaction, 
        `Added title '${subscribable.title}' from '${ScraperType[subscribable.type]}' to role @${role.name}`, this.logger, LogLevel.INFO);
  }
}