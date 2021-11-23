import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { CommandProvider, Logger, LogLevel, ModernApplicationCommandJSONBody, sendCmdReply } from "bot-framework";
import { CommandInteraction } from "discord.js";

import { MangadexHelper } from "../support/mangadex.js";
import { Store } from "../support/store.js";

export class GetAliasesCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("GetAliasesCommand");
  }
  
  public provideSlashCommands(): ModernApplicationCommandJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('getaliases')
        .setDescription('Get all aliases for given manga')
        .addStringOption(
          new SlashCommandStringOption()
            .setName('url')
            .setDescription('Manga URL')
            .setRequired(true)
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/getaliases <manga url> - Get all aliases for given manga - Used by Mangasee fallback parser";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    const url = interaction.options.getString('url');
    
    // Ensure we got a valid manga url
    const manga = await MangadexHelper.parseTitleUrlToMangaLite(url);
    if (manga == null) {
      sendCmdReply(interaction, 'Error: bad title URL', this.logger, LogLevel.TRACE);
      return;
    }

    const altTitles = await Store.getAltTitles(manga.id);
    const str = `**${manga.title}**:\n` +
                Array.from(altTitles.values()).join('\n');
    
    this.logger.info(`Manga ${manga.title} has ${altTitles.size} alt titles`);
    sendCmdReply(interaction, str, this.logger, LogLevel.TRACE);
  }
}