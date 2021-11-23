import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { CommandProvider, Logger, LogLevel, ModernApplicationCommandJSONBody } from "bot-framework";
import { CommandInteraction } from "discord.js";
import { Manga } from "mangadex-full-api";

import { MangadexHelper, MangadexManga } from "../support/mangadex.js";
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

  public async handle(command: BotCommand): Promise<void> {
    let manga: Manga | MangadexManga = null;
    switch (command.arguments.length) {
    case 1:
      manga = await MangadexHelper.parseTitleUrlToMangaLite(command.arguments[0]);

      break;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.DEBUG);
      return;
    }

    // Ensure we got a valid manga url
    if (manga == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', this.logger, LogLevel.DEBUG);
      return;
    }

    const altTitles = await Store.getAltTitles(manga.id);
    const str = `**${manga.title}**:\n` +
                Array.from(altTitles.values()).join('\n');
    this.logger.info(`Manga ${manga.title} has ${altTitles.size} alt titles`);
    sendCmdMessage(command.message, str, this.logger, LogLevel.TRACE);
  }
}